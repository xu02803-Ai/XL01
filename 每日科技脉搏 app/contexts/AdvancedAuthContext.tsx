// contexts/AdvancedAuthContext.tsx
// 这个上下文扩展基础 AuthContext，添加所有高级功能

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

export interface OAuthProvider {
  name: 'google' | 'github' | 'discord';
  clientId: string;
  scopes: string[];
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applicable_plans: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  avatar_url?: string;
  team_members: TeamMember[];
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface AdvancedAuthContextType {
  // OAuth
  initiateOAuthFlow: (provider: 'google' | 'github' | 'discord') => void;
  handleOAuthCallback: () => Promise<void>;
  
  // Email Verification
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  
  // 2FA
  enable2FA: () => Promise<TwoFactorSetup>;
  verify2FA: (code: string) => Promise<void>;
  validate2FA: (code: string) => Promise<{ usedBackupCode: boolean }>;
  disable2FA: () => Promise<void>;
  
  // Coupons
  validateCoupon: (code: string, planId?: string) => Promise<Coupon>;
  applyCoupon: (couponId: string, subscriptionId: string) => Promise<number>;
  
  // Teams
  createTeam: (name: string, description?: string) => Promise<Team>;
  listTeams: () => Promise<Team[]>;
  getTeamDetail: (teamId: string) => Promise<Team>;
  inviteTeamMember: (teamId: string, email: string, role: 'admin' | 'member') => Promise<void>;
  acceptTeamInvite: (token: string) => Promise<void>;
  removeTeamMember: (teamId: string, memberId: string) => Promise<void>;
  updateMemberRole: (teamId: string, memberId: string, role: string) => Promise<void>;
}

const AdvancedAuthContext = createContext<AdvancedAuthContextType | undefined>(undefined);

export const AdvancedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();

  const initiateOAuthFlow = (provider: 'google' | 'github' | 'discord') => {
    const configs: Record<string, { clientId: string; scope: string }> = {
      google: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'openid profile email',
      },
      github: {
        clientId: import.meta.env.VITE_GITHUB_CLIENT_ID,
        scope: 'user:email',
      },
      discord: {
        clientId: import.meta.env.VITE_DISCORD_CLIENT_ID,
        scope: 'identify email',
      },
    };

    const config = configs[provider];
    const redirectUri = `${window.location.origin}/oauth/callback?provider=${provider}`;

    if (provider === 'google') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', config.scope);
      window.location.href = authUrl.toString();
    } else if (provider === 'github') {
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', config.scope);
      window.location.href = authUrl.toString();
    } else if (provider === 'discord') {
      const authUrl = new URL('https://discord.com/api/oauth2/authorize');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', config.scope);
      window.location.href = authUrl.toString();
    }
  };

  const handleOAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('oauth_token');
    const user = params.get('oauth_user');
    const subscription = params.get('oauth_subscription');

    if (token && user) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', user);
      if (subscription) {
        localStorage.setItem('auth_subscription', subscription);
      }
      window.location.href = '/';
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch('/api/email/verify?action=send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        userId: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send verification email');
    }
  };

  const verifyEmail = async (token: string) => {
    const response = await fetch('/api/email/verify?action=verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify email');
    }
  };

  const enable2FA = async (): Promise<TwoFactorSetup> => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch('/api/2fa/setup?action=enable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to enable 2FA');
    }

    return response.json();
  };

  const verify2FA = async (code: string) => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch('/api/2fa/setup?action=verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: user.id, token: code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid code');
    }
  };

  const validate2FA = async (code: string): Promise<{ usedBackupCode: boolean }> => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch('/api/2fa/setup?action=validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: user.id, code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid code');
    }

    return response.json();
  };

  const disable2FA = async () => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch('/api/2fa/setup?action=disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to disable 2FA');
    }
  };

  const validateCoupon = async (code: string, planId?: string): Promise<Coupon> => {
    const response = await fetch('/api/coupons/manage?action=validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, userId: user?.id, planId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid coupon code');
    }

    return response.json();
  };

  const applyCoupon = async (couponId: string, subscriptionId: string): Promise<number> => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch('/api/coupons/manage?action=apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ couponId, userId: user.id, subscriptionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to apply coupon');
    }

    const data = await response.json();
    return data.discountAmount;
  };

  const createTeam = async (name: string, description?: string): Promise<Team> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/api/teams/manage?action=create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name, description }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create team');
    }

    const data = await response.json();
    return data.team;
  };

  const listTeams = async (): Promise<Team[]> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/api/teams/manage?action=list', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch teams');
    }

    const data = await response.json();
    return data.teams || [];
  };

  const getTeamDetail = async (teamId: string): Promise<Team> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/api/teams/manage?action=detail&teamId=${teamId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch team');
    }

    const data = await response.json();
    return data.team;
  };

  const inviteTeamMember = async (teamId: string, email: string, role: 'admin' | 'member') => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/api/teams/manage?action=invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ teamId, email, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to invite member');
    }
  };

  const acceptTeamInvite = async (token: string) => {
    const response = await fetch('/api/teams/manage?action=accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to accept invitation');
    }
  };

  const removeTeamMember = async (teamId: string, memberId: string) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(
      `/api/teams/manage?action=remove-member&teamId=${teamId}&memberId=${memberId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove member');
    }
  };

  const updateMemberRole = async (teamId: string, memberId: string, role: string) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/api/teams/manage?action=update-member-role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ teamId, memberId, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update role');
    }
  };

  return (
    <AdvancedAuthContext.Provider
      value={{
        initiateOAuthFlow,
        handleOAuthCallback,
        sendVerificationEmail,
        verifyEmail,
        enable2FA,
        verify2FA,
        validate2FA,
        disable2FA,
        validateCoupon,
        applyCoupon,
        createTeam,
        listTeams,
        getTeamDetail,
        inviteTeamMember,
        acceptTeamInvite,
        removeTeamMember,
        updateMemberRole,
      }}
    >
      {children}
    </AdvancedAuthContext.Provider>
  );
};

export const useAdvancedAuth = () => {
  const context = useContext(AdvancedAuthContext);
  if (context === undefined) {
    throw new Error('useAdvancedAuth must be used within AdvancedAuthProvider');
  }
  return context;
};
