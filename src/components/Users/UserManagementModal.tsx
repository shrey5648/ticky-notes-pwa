'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';
import { X, UserPlus, Users, Trash2, Search, KeyRound, Check, AlertCircle, Shield, Crown, RefreshCw } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

interface UserWithCount extends User {
  note_count?: number;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<UserWithCount[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSuperAdmin = currentUser?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setShowAddForm(false);
      setStatusMsg(null);
    }
  }, [isOpen, fetchUsers]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setStatusMsg({ type: 'error', text: 'Username is required.' });
      return;
    }
    if (!newPin || newPin.length < 4) {
      setStatusMsg({ type: 'error', text: 'PIN must be at least 4 digits.' });
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          display_name: newDisplayName.trim(),
          pin: newPin,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to create user.' });
      } else {
        setStatusMsg({ type: 'success', text: `User @${data.user.username} created!` });
        setNewUsername('');
        setNewDisplayName('');
        setNewPin('');
        setNewRole('user');
        setShowAddForm(false);
        fetchUsers();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Server error creating user.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (targetUser: UserWithCount) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmChange = window.confirm(
      `Change role for @${targetUser.username} to ${nextRole.toUpperCase()}?`
    );
    if (!confirmChange) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update user role' });
      } else {
        setStatusMsg({ type: 'success', text: `@${targetUser.username} is now ${nextRole.toUpperCase()}!` });
        fetchUsers();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error updating user role' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (targetUser: UserWithCount) => {
    const freshPin = window.prompt(`Set new 4-digit PIN for @${targetUser.username}:`);
    if (!freshPin || freshPin.length < 4) {
      if (freshPin !== null) alert('PIN must be at least 4 digits');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: freshPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to reset PIN' });
      } else {
        setStatusMsg({ type: 'success', text: `PIN for @${targetUser.username} updated successfully!` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error resetting user PIN' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: UserWithCount) => {
    const confirmDelete = window.confirm(
      `Delete user "@${userToDelete.username}"?\n\nThis will remove all their sticky notes!`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete user');
      } else {
        setStatusMsg({ type: 'success', text: `User @${userToDelete.username} deleted.` });
        fetchUsers();
      }
    } catch (err) {
      alert('Error deleting user');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: isSuperAdmin
                  ? 'linear-gradient(135deg, #ff9800, #e65100)'
                  : 'linear-gradient(135deg, var(--ui-accent), #ff6d00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSuperAdmin ? '0 0 12px rgba(255, 152, 0, 0.4)' : undefined,
              }}
            >
              {isSuperAdmin ? <Crown size={20} color="#fff" /> : <Users size={20} color="#fff" />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isSuperAdmin ? 'Super Admin Workspace Panel' : 'Team User Directory'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--ui-text-muted)' }}>
                {users.length} registered user{users.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: statusMsg.type === 'success' ? 'var(--ui-success-bg)' : 'var(--ui-danger-bg)',
              color: statusMsg.type === 'success' ? 'var(--ui-success)' : 'var(--ui-danger)',
              animation: 'fadeInUp 0.3s ease both',
            }}
          >
            {statusMsg.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Search + Add Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ui-text-muted)' }} />
            <input
              type="text"
              placeholder="Search user by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="auth-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <button
            className={showAddForm ? 'btn-secondary' : 'btn-primary'}
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}
          >
            <UserPlus size={15} /> {showAddForm ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateUser}
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--ui-accent-light)',
              border: '1px dashed var(--ui-accent)',
              marginBottom: '20px',
              animation: 'slideDown 0.2s ease both',
            }}
          >
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '14px', color: 'var(--ui-accent)' }}>
              Add New User Account
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>
                  Username *
                </label>
                <input
                  type="text"
                  placeholder="e.g. david"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="auth-input"
                  style={{ paddingLeft: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Miller"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="auth-input"
                  style={{ paddingLeft: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>
                  4-Digit PIN *
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ui-text-muted)' }} />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="auth-input"
                    style={{ letterSpacing: '3px' }}
                  />
                </div>
              </div>

              {isSuperAdmin && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>
                    Access Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                    className="auth-input"
                    style={{ paddingLeft: '12px', cursor: 'pointer' }}
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Super Admin (All Notes)</option>
                  </select>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '8px 18px' }}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Users List */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--ui-text-muted)', fontSize: '0.88rem' }}>
              No users found matching &quot;{search}&quot;
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const uIsAdmin = u.role === 'admin';
              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--ui-surface)',
                    border: uIsAdmin ? '1px solid rgba(255, 152, 0, 0.4)' : '1px solid var(--ui-border)',
                    boxShadow: uIsAdmin ? '0 0 8px rgba(255, 152, 0, 0.1)' : undefined,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="user-avatar"
                      style={{
                        background: uIsAdmin ? 'linear-gradient(135deg, #ff9800, #e65100)' : undefined,
                      }}
                    >
                      {(u.display_name || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.92rem' }}>@{u.username}</strong>
                        {uIsAdmin ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 7px',
                              borderRadius: 'var(--radius-pill)',
                              background: 'rgba(255, 152, 0, 0.18)',
                              color: '#e65100',
                              fontWeight: 800,
                              letterSpacing: '0.03em',
                            }}
                          >
                            👑 SUPER ADMIN
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-pill)',
                              background: 'rgba(0, 0, 0, 0.06)',
                              color: 'var(--ui-text-muted)',
                              fontWeight: 600,
                            }}
                          >
                            USER
                          </span>
                        )}
                        {isSelf && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-pill)',
                              background: 'var(--ui-success-bg)',
                              color: 'var(--ui-success)',
                              fontWeight: 600,
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', marginTop: '2px' }}>
                        {u.display_name} · {u.note_count || 0} sticky notes
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isSuperAdmin && (
                      <>
                        {!isSelf && (
                          <button
                            className="btn-icon"
                            style={{ width: '30px', height: '30px', color: uIsAdmin ? '#e65100' : 'var(--ui-text-muted)' }}
                            title={uIsAdmin ? 'Demote to User' : 'Promote to Super Admin'}
                            onClick={() => handleToggleRole(u)}
                          >
                            <Crown size={15} />
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          style={{ width: '30px', height: '30px' }}
                          title="Reset PIN"
                          onClick={() => handleResetPin(u)}
                        >
                          <RefreshCw size={14} />
                        </button>
                      </>
                    )}
                    {!isSelf && (
                      <button
                        className="btn-icon"
                        style={{ width: '30px', height: '30px', color: 'var(--ui-danger)' }}
                        title="Delete User Account"
                        onClick={() => handleDeleteUser(u)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
