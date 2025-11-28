import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, subscription, logout, updateProfile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(username, avatarUrl);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const planLimits: Record<string, { requestsPerDay: number; features: string[] }> = {
    free: {
      requestsPerDay: 10,
      features: ['Daily tech briefing', 'Basic search', 'Community support'],
    },
    basic: {
      requestsPerDay: 100,
      features: ['Daily tech briefing', 'Advanced search', 'Email support', 'Custom topics'],
    },
    pro: {
      requestsPerDay: 1000,
      features: ['Daily tech briefing', 'Advanced search', 'Priority support', 'Custom topics', 'API access'],
    },
  };

  const currentPlan = subscription?.plan || 'free';
  const planInfo = planLimits[currentPlan];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-slate-400">Manage your profile and subscription</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info Card */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Personal Information</h2>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-purple-500 focus:outline-none transition"
                    placeholder="Your username"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-purple-500 focus:outline-none transition"
                    placeholder="https://example.com/avatar.jpg"
                  />
                  {avatarUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-400 mb-2">Preview:</p>
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full object-cover"
                        onError={() => setError('Invalid image URL')}
                      />
                    </div>
                  )}
                </div>

                {/* Messages */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-200 text-sm">
                    {success}
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plan Card */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Current Plan</h3>

              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-1">Plan Type</p>
                <p className="text-2xl font-bold text-purple-400 capitalize">{currentPlan}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-2">Daily Limit</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-white">{planInfo.requestsPerDay}</p>
                  <p className="text-slate-400 ml-2">requests/day</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/subscription')}
                className="w-full py-2 rounded-lg bg-purple-600/50 text-purple-200 font-semibold hover:bg-purple-600 transition"
              >
                Upgrade Plan
              </button>
            </div>

            {/* Features Card */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Features</h3>
              <ul className="space-y-2">
                {planInfo.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-slate-300">
                    <span className="text-purple-400 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full py-2 rounded-lg bg-red-600/20 text-red-200 border border-red-500/50 font-semibold hover:bg-red-600/40 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
