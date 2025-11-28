import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const appUrl = process.env.APP_URL || 'http://localhost:3000';

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

interface CreateTeamBody {
  name: string;
  description?: string;
}

interface InviteMemberBody {
  teamId: string;
  email: string;
  role: 'admin' | 'member';
}

interface AcceptInviteBody {
  token: string;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
    return res.status(500).json({ 
      error: 'Server configuration error: Missing environment variables' 
    });
  }

  // 验证 JWT 令牌
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader) {
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = jwt.verify(token, jwtSecret) as any;
      userId = decoded.id;
    } catch (error) {
      console.warn('❌ Invalid token');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const action = req.query.action;

  if (req.method === 'POST' && action === 'create') {
    return handleCreateTeam(req, res, userId);
  }

  if (req.method === 'GET' && action === 'list') {
    return handleListTeams(req, res, userId);
  }

  if (req.method === 'GET' && action === 'detail') {
    return handleGetTeamDetail(req, res, userId);
  }

  if (req.method === 'POST' && action === 'invite') {
    return handleInviteMember(req, res, userId);
  }

  if (req.method === 'POST' && action === 'accept-invite') {
    return handleAcceptInvite(req, res);
  }

  if (req.method === 'DELETE' && action === 'remove-member') {
    return handleRemoveMember(req, res, userId);
  }

  if (req.method === 'PUT' && action === 'update-member-role') {
    return handleUpdateMemberRole(req, res, userId);
  }

  res.status(400).json({ error: 'Invalid request' });
}

async function handleCreateTeam(req: any, res: any, userId: string | null) {
  try {
    console.log('👥 Create team request');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description } = req.body as CreateTeamBody;

    if (!name) {
      return res.status(400).json({ error: 'Missing team name' });
    }

    // 创建团队
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert([{
        owner_id: userId,
        name,
        description,
      }])
      .select();

    if (error || !newTeam) {
      console.error('❌ Failed to create team:', error);
      return res.status(500).json({ error: 'Failed to create team' });
    }

    const team = newTeam[0];

    // 将创建者添加为所有者
    await supabase
      .from('team_members')
      .insert([{
        team_id: team.id,
        user_id: userId,
        role: 'owner',
      }]);

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      team_id: team.id,
      action: 'team_created',
      details: { team_name: name },
    }]);

    console.log('✅ Team created:', team.id);
    res.status(201).json({
      success: true,
      team,
    });
  } catch (error: any) {
    console.error('❌ Create team error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to create team' 
    });
  }
}

async function handleListTeams(req: any, res: any, userId: string | null) {
  try {
    console.log('👥 List teams request');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 获取用户所有的团队
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(id, user_id, role)
      `)
      .or(`owner_id.eq.${userId},team_members.user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch teams:', error);
      return res.status(500).json({ error: 'Failed to fetch teams' });
    }

    console.log('✅ Teams fetched:', teams?.length || 0);
    res.status(200).json({
      success: true,
      teams: teams || [],
    });
  } catch (error: any) {
    console.error('❌ List teams error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to list teams' 
    });
  }
}

async function handleGetTeamDetail(req: any, res: any, userId: string | null) {
  try {
    console.log('👥 Get team detail request');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.query;

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId' });
    }

    // 检查用户是否是团队成员
    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .limit(1);

    // 获取团队信息
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(id, user_id, role, users(*))
      `)
      .eq('id', teamId)
      .limit(1);

    if (error || !teams || teams.length === 0) {
      console.warn('❌ Team not found');
      return res.status(404).json({ error: 'Team not found' });
    }

    // 如果用户不是团队成员且不是所有者，拒绝访问
    if (!membership || membership.length === 0) {
      if (teams[0].owner_id !== userId) {
        console.warn('❌ Access denied');
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // 获取待处理邀请
    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .eq('accepted', false);

    console.log('✅ Team detail fetched');
    res.status(200).json({
      success: true,
      team: teams[0],
      invitations: invitations || [],
    });
  } catch (error: any) {
    console.error('❌ Get team detail error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to get team detail' 
    });
  }
}

async function handleInviteMember(req: any, res: any, userId: string | null) {
  try {
    console.log('👥 Invite member request');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId, email, role } = req.body as InviteMemberBody;

    if (!teamId || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 检查用户是否是团队所有者或管理员
    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .limit(1);

    if (!membership || membership.length === 0) {
      console.warn('❌ User is not a team member');
      return res.status(403).json({ error: 'You are not a team member' });
    }

    const member = membership[0];
    if (member.role !== 'owner' && member.role !== 'admin') {
      console.warn('❌ User does not have permission to invite');
      return res.status(403).json({ error: 'You do not have permission to invite members' });
    }

    // 生成邀请令牌
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天

    // 创建邀请
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert([{
        team_id: teamId,
        invited_email: email,
        inviter_id: userId,
        role,
        token,
        expires_at: expiresAt.toISOString(),
      }])
      .select();

    if (error || !invitation) {
      console.error('❌ Failed to create invitation:', error);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    // TODO: 发送邀请邮件
    const inviteLink = `${appUrl}/accept-team-invite?token=${token}`;

    console.log('📧 Invitation created:', email);
    console.log('🔗 Invite link:', inviteLink);

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      team_id: teamId,
      action: 'team_member_invited',
      details: { invited_email: email, role },
    }]);

    res.status(200).json({
      success: true,
      message: 'Invitation sent',
      ...(process.env.NODE_ENV === 'development' && { inviteLink }),
    });
  } catch (error: any) {
    console.error('❌ Invite member error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to invite member' 
    });
  }
}

async function handleAcceptInvite(req: any, res: any) {
  try {
    console.log('👥 Accept invite request');

    const { token } = req.body as AcceptInviteBody;

    if (!token) {
      return res.status(400).json({ error: 'Missing invitation token' });
    }

    // 查找邀请
    const { data: invitations, error: queryError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (queryError || !invitations || invitations.length === 0) {
      console.warn('❌ Invalid invitation token');
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = invitations[0];

    // 检查过期时间
    if (new Date(invitation.expires_at) < new Date()) {
      console.warn('❌ Invitation expired');
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // 检查是否已接受
    if (invitation.accepted) {
      console.warn('❌ Invitation already accepted');
      return res.status(400).json({ error: 'Invitation already accepted' });
    }

    // 查找用户（使用邀请的邮箱）
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('email', invitation.invited_email)
      .limit(1);

    if (!users || users.length === 0) {
      console.warn('❌ User not found');
      return res.status(400).json({ error: 'User not found. Please sign up first.' });
    }

    const invitedUser = users[0];

    // 检查用户是否已是团队成员
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', invitation.team_id)
      .eq('user_id', invitedUser.id)
      .limit(1);

    if (existingMember && existingMember.length > 0) {
      console.warn('⚠️ User is already a team member');
      return res.status(400).json({ error: 'You are already a member of this team' });
    }

    // 添加用户到团队
    await supabase
      .from('team_members')
      .insert([{
        team_id: invitation.team_id,
        user_id: invitedUser.id,
        role: invitation.role,
      }]);

    // 标记邀请为已接受
    await supabase
      .from('team_invitations')
      .update({
        accepted: true,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: invitedUser.id,
      team_id: invitation.team_id,
      action: 'team_member_joined',
      details: { joined_from_invite: true },
    }]);

    console.log('✅ Invitation accepted:', invitedUser.id);
    res.status(200).json({
      success: true,
      message: 'Successfully joined team',
      teamId: invitation.team_id,
    });
  } catch (error: any) {
    console.error('❌ Accept invite error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to accept invitation' 
    });
  }
}

async function handleRemoveMember(req: any, res: any, userId: string | null) {
  try {
    console.log('👥 Remove member request');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId, memberId } = req.query;

    if (!teamId || !memberId) {
      return res.status(400).json({ error: 'Missing teamId or memberId' });
    }

    // 检查用户是否是团队所有者
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .limit(1);

    if (!team || team.length === 0 || team[0].owner_id !== userId) {
      console.warn('❌ User is not team owner');
      return res.status(403).json({ error: 'Only team owner can remove members' });
    }

    // 防止删除所有者
    if (memberId === team[0].owner_id) {
      return res.status(400).json({ error: 'Cannot remove team owner' });
    }

    // 移除成员
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId);

    if (error) {
      console.error('❌ Failed to remove member:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      team_id: teamId,
      action: 'team_member_removed',
      details: { removed_user_id: memberId },
    }]);

    console.log('✅ Member removed');
    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error: any) {
    console.error('❌ Remove member error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to remove member' 
    });
  }
}

async function handleUpdateMemberRole(req: any, res: any, userId: string | null) {
  try {
    console.log('👥 Update member role request');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId, memberId, role } = req.body;

    if (!teamId || !memberId || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 检查用户是否是团队所有者
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .limit(1);

    if (!team || team.length === 0 || team[0].owner_id !== userId) {
      console.warn('❌ User is not team owner');
      return res.status(403).json({ error: 'Only team owner can update roles' });
    }

    // 防止降级所有者
    if (memberId === team[0].owner_id) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // 更新角色
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', memberId);

    if (error) {
      console.error('❌ Failed to update role:', error);
      return res.status(500).json({ error: 'Failed to update role' });
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      team_id: teamId,
      action: 'team_member_role_updated',
      details: { member_id: memberId, new_role: role },
    }]);

    console.log('✅ Member role updated');
    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Update member role error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to update member role' 
    });
  }
}
