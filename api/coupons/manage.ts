import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

interface ValidateCouponBody {
  code: string;
  userId?: string;
  planId?: string;
}

interface ApplyCouponBody {
  couponId: string;
  userId: string;
  subscriptionId: string;
}

interface CreateCouponBody {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  applicable_plans: string[];
  valid_from: string;
  valid_until: string;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ 
      error: 'Server configuration error: Missing environment variables' 
    });
  }

  const action = req.query.action;

  if (req.method === 'POST' && action === 'validate') {
    return handleValidateCoupon(req, res);
  }

  if (req.method === 'POST' && action === 'apply') {
    return handleApplyCoupon(req, res);
  }

  if (req.method === 'POST' && action === 'create') {
    return handleCreateCoupon(req, res);
  }

  if (req.method === 'GET' && action === 'list') {
    return handleListCoupons(req, res);
  }

  res.status(400).json({ error: 'Invalid request' });
}

async function handleValidateCoupon(req: any, res: any) {
  try {
    console.log('🎟️ Validate coupon request');
    const { code, userId, planId } = req.body as ValidateCouponBody;

    if (!code) {
      return res.status(400).json({ error: 'Missing coupon code' });
    }

    // 查找折扣代码
    const { data: coupons, error: queryError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .limit(1);

    if (queryError || !coupons || coupons.length === 0) {
      console.warn('❌ Coupon not found:', code);
      return res.status(400).json({ error: 'Invalid coupon code' });
    }

    const coupon = coupons[0];

    // 检查是否过期
    const now = new Date();
    if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
      console.warn('❌ Coupon expired or not yet valid');
      return res.status(400).json({ error: 'Coupon expired or not yet valid' });
    }

    // 检查使用次数限制
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      console.warn('❌ Coupon usage limit reached');
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    // 检查适用计划
    if (planId && !coupon.applicable_plans.includes(planId)) {
      console.warn('❌ Coupon not applicable to this plan');
      return res.status(400).json({ error: 'Coupon not applicable to this plan' });
    }

    // 检查用户是否已使用此折扣代码
    if (userId) {
      const { data: usage } = await supabase
        .from('coupon_usage')
        .select('*')
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)
        .limit(1);

      if (usage && usage.length > 0) {
        console.warn('❌ User already used this coupon');
        return res.status(400).json({ error: 'You already used this coupon' });
      }
    }

    console.log('✅ Coupon valid:', code);
    res.status(200).json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        applicable_plans: coupon.applicable_plans,
      },
      message: `Save ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : '$'}!`,
    });
  } catch (error: any) {
    console.error('❌ Validate coupon error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to validate coupon' 
    });
  }
}

async function handleApplyCoupon(req: any, res: any) {
  try {
    console.log('🎟️ Apply coupon request');
    const { couponId, userId, subscriptionId } = req.body as ApplyCouponBody;

    if (!couponId || !userId || !subscriptionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 获取折扣信息
    const { data: coupons, error: queryError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .limit(1);

    if (queryError || !coupons || coupons.length === 0) {
      console.warn('❌ Coupon not found');
      return res.status(400).json({ error: 'Coupon not found' });
    }

    const coupon = coupons[0];

    // 计算折扣金额（这里使用示例价格）
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      // 假设基础价格 (实际应该从订阅计划获取)
      const basePrice = 9.99; // 示例价格
      discountAmount = (basePrice * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }

    // 记录折扣使用
    const { error: usageError } = await supabase
      .from('coupon_usage')
      .insert([{
        coupon_id: couponId,
        user_id: userId,
        subscription_id: subscriptionId,
        discount_amount: discountAmount,
      }]);

    if (usageError) {
      console.error('❌ Failed to record coupon usage:', usageError);
      return res.status(500).json({ error: 'Failed to apply coupon' });
    }

    // 增加使用计数
    await supabase
      .from('coupons')
      .update({ used_count: (coupon.used_count || 0) + 1 })
      .eq('id', couponId);

    // 更新订阅（如果有discount_amount字段）
    await supabase
      .from('subscriptions')
      .update({ 
        applied_coupon_id: couponId,
        discount_amount: discountAmount,
      })
      .eq('id', subscriptionId);

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: 'coupon_applied',
      details: { 
        coupon_code: coupon.code,
        discount_amount: discountAmount,
        subscription_id: subscriptionId,
      },
    }]);

    console.log('✅ Coupon applied successfully');
    res.status(200).json({
      success: true,
      discountAmount,
      message: `Coupon applied! Discount: $${discountAmount.toFixed(2)}`,
    });
  } catch (error: any) {
    console.error('❌ Apply coupon error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to apply coupon' 
    });
  }
}

async function handleCreateCoupon(req: any, res: any) {
  try {
    console.log('🎟️ Create coupon request');
    
    // 验证 JWT 令牌（仅管理员可创建）
    const authHeader = req.headers.authorization;
    if (!authHeader || !jwtSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // TODO: 检查用户是否为管理员
      console.log('👤 User verified:', decoded.id);
    } catch (error) {
      console.warn('❌ Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const {
      code,
      description,
      discount_type,
      discount_value,
      max_uses,
      applicable_plans,
      valid_from,
      valid_until,
    } = req.body as CreateCouponBody;

    if (!code || !discount_type || !discount_value || !applicable_plans || !valid_from || !valid_until) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 验证折扣值
    if (discount_type === 'percentage' && (discount_value < 1 || discount_value > 100)) {
      return res.status(400).json({ error: 'Percentage discount must be between 1 and 100' });
    }

    // 创建折扣代码
    const { data: newCoupon, error } = await supabase
      .from('coupons')
      .insert([{
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value,
        max_uses: max_uses || null,
        applicable_plans,
        valid_from,
        valid_until,
        is_active: true,
      }])
      .select();

    if (error || !newCoupon) {
      console.error('❌ Failed to create coupon:', error);
      return res.status(500).json({ error: 'Failed to create coupon' });
    }

    console.log('✅ Coupon created:', code);
    res.status(201).json({
      success: true,
      coupon: newCoupon[0],
      message: 'Coupon created successfully',
    });
  } catch (error: any) {
    console.error('❌ Create coupon error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to create coupon' 
    });
  }
}

async function handleListCoupons(req: any, res: any) {
  try {
    console.log('🎟️ List coupons request');

    // 验证 JWT 令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !jwtSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = authHeader.split('Bearer ')[1];
      jwt.verify(token, jwtSecret);
    } catch (error) {
      console.warn('❌ Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 获取活跃的折扣代码
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch coupons:', error);
      return res.status(500).json({ error: 'Failed to fetch coupons' });
    }

    console.log('✅ Coupons fetched:', coupons?.length || 0);
    res.status(200).json({
      success: true,
      coupons: coupons || [],
    });
  } catch (error: any) {
    console.error('❌ List coupons error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to list coupons' 
    });
  }
}
