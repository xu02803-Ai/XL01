import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' } as any);

// 订阅计划配置
const PLANS = {
  free: { name: 'Free', price: 0, requests_per_day: 10, stripe_price_id: null },
  basic: { name: 'Basic', price: 999, requests_per_day: 100, stripe_price_id: process.env.STRIPE_BASIC_PRICE_ID },
  pro: { name: 'Pro', price: 2999, requests_per_day: 1000, stripe_price_id: process.env.STRIPE_PRO_PRICE_ID },
};

// Verify JWT token
function verifyToken(token: string): { id: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    return { id: decoded.id, email: decoded.email };
  } catch {
    return null;
  }
}

function getToken(req: any): string | null {
  const auth = req.headers.authorization || '';
  return auth.replace('Bearer ', '');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  // Public endpoint: get available plans
  if (req.method === 'GET' && action === 'plans') {
    return res.status(200).json({
      success: true,
      plans: Object.entries(PLANS).map(([key, plan]) => ({
        id: key,
        ...plan,
      })),
    });
  }

  // Public endpoint: validate coupon
  if (req.method === 'POST' && action === 'validate-coupon') {
    return validateCoupon(req.body, res);
  }

  // Protected endpoints
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'POST' && action === 'create-checkout') {
    return createCheckoutSession(user, req.body, res);
  }

  if (req.method === 'POST' && action === 'cancel-subscription') {
    return cancelSubscription(user, res);
  }

  if (req.method === 'PUT' && action === 'upgrade') {
    return upgradeSubscription(user, req.body, res);
  }

  if (req.method === 'POST' && action === 'apply-coupon') {
    return applyCoupon(user, req.body, res);
  }

  res.status(400).json({ error: 'Invalid request' });
}

// SUBSCRIPTION HANDLERS

async function createCheckoutSession(user: any, body: any, res: any) {
  try {
    const { plan } = body;

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];

    // Get or create Stripe customer
    let { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .limit(1);

    let customerId = subscriptions?.[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // For free plan, just update subscription
    if (plan === 'free') {
      await supabase
        .from('subscriptions')
        .update({
          plan: 'free',
          stripe_subscription_id: null,
          status: 'active',
        })
        .eq('user_id', user.id);

      return res.status(200).json({
        success: true,
        message: 'Switched to free plan',
      });
    }

    // Create checkout session for paid plans
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.VERCEL_URL || 'http://localhost:3000'}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VERCEL_URL || 'http://localhost:3000'}/subscription?status=cancelled`,
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function cancelSubscription(user: any, res: any) {
  try {
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!subscriptions || !subscriptions[0]?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    const subId = subscriptions[0].stripe_subscription_id;

    // Cancel at end of period
    await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });

    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('user_id', user.id);

    res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at end of billing period',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

async function upgradeSubscription(user: any, body: any, res: any) {
  try {
    const { plan } = body;

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!subscriptions || !subscriptions[0]?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    const subId = subscriptions[0].stripe_subscription_id;

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subId);
    const currentItem = subscription.items.data[0];

    // Update subscription
    await stripe.subscriptions.update(subId, {
      items: [
        {
          id: currentItem.id,
          price: planConfig.stripe_price_id,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    await supabase
      .from('subscriptions')
      .update({ plan })
      .eq('user_id', user.id);

    res.status(200).json({
      success: true,
      message: `Upgraded to ${planConfig.name} plan`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// COUPON HANDLERS

async function validateCoupon(body: any, res: any) {
  try {
    const { code } = body;
    
    if (!code) {
      return res.status(400).json({ error: 'Coupon code required' });
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .limit(1);

    if (error || !coupon || coupon.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const couponData = coupon[0];

    // Check if valid
    if (!couponData.is_active) {
      return res.status(400).json({ error: 'Coupon is inactive' });
    }

    if (couponData.expires_at && new Date(couponData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (couponData.usage_limit && couponData.times_used >= couponData.usage_limit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    res.status(200).json({
      success: true,
      coupon: {
        code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: couponData.discount_value,
        description: couponData.description,
      },
    });
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function applyCoupon(user: any, body: any, res: any) {
  try {
    const { code, subscription_id } = body;

    if (!code || !subscription_id) {
      return res.status(400).json({ error: 'Code and subscription_id required' });
    }

    // Get coupon
    const { data: coupons, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .limit(1);

    if (couponError || !coupons || coupons.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const coupon = coupons[0];

    // Validate coupon
    if (!coupon.is_active) {
      return res.status(400).json({ error: 'Coupon is inactive' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    // Check if user already used this coupon
    const { data: usage } = await supabase
      .from('coupon_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('coupon_id', coupon.id)
      .limit(1);

    if (usage && usage.length > 0) {
      return res.status(400).json({ error: 'You have already used this coupon' });
    }

    // Apply coupon
    const { error: applyError } = await supabase
      .from('coupon_usage')
      .insert({
        user_id: user.id,
        coupon_id: coupon.id,
        subscription_id,
      });

    if (applyError) {
      return res.status(500).json({ error: 'Failed to apply coupon' });
    }

    // Increment usage count
    await supabase
      .from('coupons')
      .update({ times_used: coupon.times_used + 1 })
      .eq('id', coupon.id);

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
    });
  } catch (error: any) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ error: error.message });
  }
}
