'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';
import { X, UserPlus, Users, Trash2, Search, KeyRound, Check, AlertCircle } from 'lucide-react';

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
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to create user.' });
      } else {
        setStatusMsg({ type: 'success', text: `User @${data.user.username} created successfully!` });
        setNewUsername('');
        setNewDisplayName('');
        setNewPin('');
        setShowAddForm(false);
        fetchUsers();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Server error creating user.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: UserWithCount) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user "@${userToDelete.username}"?\n\nThis will remove all sticky notes owned by this user!`
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} style={{ color: 'var(--ui-accent)' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Manage Team Users</h3>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(230, 81, 0, 0.15)',
                color: 'var(--ui-accent)',
                fontWeight: 600,
              }}
            >
              {users.length} Users
            </span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: statusMsg.type === 'success' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: statusMsg.type === 'success' ? '#2e7d32' : '#c62828',
            }}
          >
            {statusMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Action Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--ui-text-muted)' }} />
            <input
              type="text"
              placeholder="Search user by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--ui-border)',
                background: 'var(--ui-surface)',
                color: 'var(--ui-text)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ whiteSpace: 'nowrap' }}
          >
            <UserPlus size={16} /> {showAddForm ? 'Cancel' : 'Add New User'}
          </button>
        </div>

        {/* Add User Form Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleCreateUser}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--ui-surface)',
              border: '1px dashed var(--ui-accent)',
              marginBottom: '20px',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--ui-accent)' }}>
              ➕ Add New Team User
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Username *
                </label>
                <input
                  type="text"
                  placeholder="e.g. david"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--ui-border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Miller"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--ui-border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Set 4-Digit PIN *
              </label>
              <div style={{ position: 'relative', width: '180px' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#666' }} />
                <input
                  type="password"
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--ui-border)',
                    fontSize: '0.9rem',
                    letterSpacing: '2px',
                  }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '8px 16px' }}>
              {loading ? 'Creating...' : 'Create User Account'}
            </button>
          </form>
        )}

        {/* Users List */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ui-text-muted)', fontSize: '0.9rem' }}>
              No users found matching &quot;{search}&quot;
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--ui-surface)',
                    border: '1px solid var(--ui-border)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>@{u.username}</strong>
                      {isSelf && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            background: 'rgba(76, 175, 80, 0.15)',
                            color: '#2e7d32',
                            fontWeight: 600,
                          }}
                        >
                          You (Logged In)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ui-text-muted)', marginTop: '2px' }}>
                      {u.display_name} • {u.note_count || 0} sticky notes
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      className="btn-icon"
                      style={{ color: '#c62828' }}
                      title="Delete User"
                      onClick={() => handleDeleteUser(u)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
