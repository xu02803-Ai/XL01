import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  price: number;
  requests_per_day: number;
  stripe_price_id: string | null;
}

interface SubscriptionPageProps {
  onNavigate?: (page: 'main' | 'profile') => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate }) => {
  const { user, subscription, token, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchPlans();
  }, [isAuthenticated]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription?action=plans');
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!token) return;

    setUpgrading(true);
    try {
      const response = await fetch('/api/subscription?action=create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else if (data.success && planId === 'free') {
        // Switched to free plan successfully
        window.location.reload();
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to upgrade plan');
    } finally {
      setUpgrading(false);
    }
  };

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-slate-400 text-lg">
            Upgrade to unlock unlimited access and premium features
          </p>
        </div>

        {/* Current Plan Info */}
        {subscription && (
          <div className="mb-8 p-4 rounded-lg bg-purple-600/20 border border-purple-500/50">
            <p className="text-slate-200">
              Current Plan:{' '}
              <span className="font-bold text-purple-300 capitalize">
                {currentPlan}
              </span>
            </p>
            {subscription.current_period_end && (
              <p className="text-slate-400 text-sm mt-1">
                Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="text-center text-slate-400">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl overflow-hidden transition-all ${
                    isCurrent
                      ? 'border-2 border-purple-500 bg-purple-600/20'
                      : 'border border-slate-600 bg-slate-800/50 hover:border-purple-500'
                  }`}
                >
                  {/* Badge */}
                  {plan.id === 'pro' && (
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 text-center font-semibold text-sm">
                      Most Popular
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-8">
                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-white mb-2 capitalize">
                      {plan.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.price === 0 ? (
                        <div className="text-3xl font-bold text-white">Free</div>
                      ) : (
                        <div>
                          <span className="text-3xl font-bold text-white">
                            ${(plan.price / 100).toFixed(2)}
                          </span>
                          <span className="text-slate-400 ml-2">/month</span>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="mb-8 space-y-3">
                      <div className="flex items-center text-slate-300">
                        <span className="text-purple-400 mr-3">✓</span>
                        {plan.requests_per_day} requests per day
                      </div>
                      <div className="flex items-center text-slate-300">
                        <span className="text-purple-400 mr-3">✓</span>
                        {plan.id === 'free' && 'Basic features'}
                        {plan.id === 'basic' && 'Priority support'}
                        {plan.id === 'pro' && 'Priority + Custom features'}
                      </div>
                      <div className="flex items-center text-slate-300">
                        <span className="text-purple-400 mr-3">✓</span>
                        {plan.id === 'free' && 'Community'}
                        {plan.id === 'basic' && 'Community + Email support'}
                        {plan.id === 'pro' && '24/7 Premium support'}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isCurrent || upgrading}
                      className={`w-full py-3 rounded-lg font-semibold transition ${
                        isCurrent
                          ? 'bg-slate-700 text-slate-400 cursor-default'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                      } disabled:opacity-50`}
                    >
                      {isCurrent ? 'Current Plan' : upgrading ? 'Processing...' : 'Get Started'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group border border-slate-600 rounded-lg p-4 cursor-pointer hover:border-purple-500 transition">
              <summary className="font-semibold text-white flex items-center justify-between">
                Can I cancel my subscription anytime?
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-slate-400 mt-4">
                Yes! You can cancel your subscription at any time. Your access will continue until the end of your current billing period.
              </p>
            </details>

            <details className="group border border-slate-600 rounded-lg p-4 cursor-pointer hover:border-purple-500 transition">
              <summary className="font-semibold text-white flex items-center justify-between">
                What payment methods do you accept?
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-slate-400 mt-4">
                We accept all major credit cards through Stripe, including Visa, Mastercard, American Express, and more.
              </p>
            </details>

            <details className="group border border-slate-600 rounded-lg p-4 cursor-pointer hover:border-purple-500 transition">
              <summary className="font-semibold text-white flex items-center justify-between">
                Do you offer refunds?
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-slate-400 mt-4">
                We offer a 7-day money-back guarantee. If you're not satisfied, we'll refund your payment.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
