// pages/TeamManagement.tsx
// 团队管理页面示例

import React, { useState, useEffect } from 'react';
import { useAdvancedAuth } from '../contexts/AdvancedAuthContext';
import { Team, TeamMember } from '../contexts/AdvancedAuthContext';
import styles from './TeamManagement.module.css';

export const TeamManagement: React.FC = () => {
  const advancedAuth = useAdvancedAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamList = await advancedAuth.listTeams();
      setTeams(teamList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      setLoading(true);
      const newTeam = await advancedAuth.createTeam(newTeamName, newTeamDesc);
      setTeams([...teams, newTeam]);
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateForm(false);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (team: Team) => {
    try {
      setLoading(true);
      const detail = await advancedAuth.getTeamDetail(team.id);
      setSelectedTeam(detail);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedTeam) return;

    try {
      setLoading(true);
      await advancedAuth.inviteTeamMember(selectedTeam.id, inviteEmail, inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
      setError('');
      // 刷新团队详情
      await handleSelectTeam(selectedTeam);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !window.confirm('Remove this member?')) return;

    try {
      setLoading(true);
      await advancedAuth.removeTeamMember(selectedTeam.id, memberId);
      await handleSelectTeam(selectedTeam);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!selectedTeam) return;

    try {
      setLoading(true);
      await advancedAuth.updateMemberRole(selectedTeam.id, memberId, newRole);
      await handleSelectTeam(selectedTeam);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Team Management</h1>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className={styles.layout}>
        {/* Teams List */}
        <div className={styles.teamsList}>
          <div className={styles.header}>
            <h2>Your Teams</h2>
            <button
              className={styles.addButton}
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              + New Team
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateTeam} className={styles.form}>
              <input
                type="text"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                disabled={loading}
              />
              <textarea
                placeholder="Description (optional)"
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Team'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </form>
          )}

          <div className={styles.teamItems}>
            {teams.length === 0 ? (
              <p className={styles.emptyState}>No teams yet. Create one to get started!</p>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  className={`${styles.teamItem} ${
                    selectedTeam?.id === team.id ? styles.active : ''
                  }`}
                  onClick={() => handleSelectTeam(team)}
                >
                  <div className={styles.teamName}>{team.name}</div>
                  <div className={styles.memberCount}>
                    {team.team_members?.length || 0} members
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Details */}
        <div className={styles.teamDetails}>
          {selectedTeam ? (
            <div className={styles.detailsContent}>
              <h2>{selectedTeam.name}</h2>
              {selectedTeam.description && (
                <p className={styles.description}>{selectedTeam.description}</p>
              )}

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>Members ({selectedTeam.team_members?.length || 0})</h3>
                  <button
                    className={styles.addButton}
                    onClick={() => setShowInviteForm(!showInviteForm)}
                  >
                    + Invite
                  </button>
                </div>

                {showInviteForm && (
                  <form onSubmit={handleInviteMember} className={styles.form}>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      disabled={loading}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Invite'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </form>
                )}

                <div className={styles.membersList}>
                  {selectedTeam.team_members?.map((member: TeamMember) => (
                    <div key={member.id} className={styles.memberItem}>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberRole}>
                          <span className={styles.roleBadge}>{member.role}</span>
                        </div>
                        <div className={styles.joinedDate}>
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                      {member.role !== 'owner' && (
                        <div className={styles.memberActions}>
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            disabled={loading}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            className={styles.removeButton}
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={loading}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a team to view details</p>
            </div>
          )}
        </div>
      </div>

      {loading && <div className={styles.spinner}>Loading...</div>}
    </div>
  );
};
