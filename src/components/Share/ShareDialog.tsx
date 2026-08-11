'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Note, NoteShare, User } from '@/lib/types';
import { X, Search, Share2, Shield, Trash2, UserPlus } from 'lucide-react';

interface ShareDialogProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ note, isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [shares, setShares] = useState<NoteShare[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    if (!note) return;
    try {
      const res = await fetch(`/api/notes/share?note_id=${note.id}`);
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares || []);
      }
    } catch (err) {
      console.error('Failed to fetch shares:', err);
    }
  }, [note]);

  useEffect(() => {
    if (isOpen && note) {
      fetchShares();
      setQuery('');
      setSearchResults([]);
      setStatusMessage(null);
    }
  }, [isOpen, note, fetchShares]);

  // Search users by username
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        }
      } catch (err) {
        console.error('User search error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen || !note) return null;

  const handleShareWithUser = async (targetUsername: string) => {
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await fetch('/api/notes/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: note.id,
          username: targetUsername,
          permission,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error || 'Failed to share note');
      } else {
        setStatusMessage(`Successfully shared note with @${targetUsername}!`);
        setQuery('');
        setSearchResults([]);
        fetchShares();
      }
    } catch (err) {
      setStatusMessage('Network error sharing note');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const res = await fetch(`/api/notes/share?share_id=${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchShares();
      }
    } catch (err) {
      console.error('Revoke share error:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--ui-accent), #ff6d00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={18} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Share Sticky Note</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--ui-text-muted)', marginBottom: '18px', lineHeight: '1.5' }}>
          Share <strong>&quot;{note.title || 'Untitled Note'}&quot;</strong> with team members.
        </p>

        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '14px',
              background: statusMessage.includes('Successfully') ? 'var(--ui-success-bg)' : 'var(--ui-danger-bg)',
              color: statusMessage.includes('Successfully') ? 'var(--ui-success)' : 'var(--ui-danger)',
              animation: 'fadeInUp 0.3s ease both',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* Search & Permission */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ui-text-muted)' }}>
            Search Team Member
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ui-text-muted)' }} />
              <input
                type="text"
                placeholder="Type username..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="auth-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--ui-border)',
                background: 'var(--ui-bg)',
                color: 'var(--ui-text)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="view">Can View</option>
              <option value="edit">Can Edit</option>
            </select>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div
              style={{
                border: '1px solid var(--ui-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--ui-bg)',
                maxHeight: '160px',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-sm)',
                animation: 'slideDown 0.2s ease both',
              }}
            >
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleShareWithUser(u.username)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--ui-border)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-accent-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                      {(u.display_name || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.88rem' }}>@{u.username}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', marginLeft: '6px' }}>
                        {u.display_name}
                      </span>
                    </div>
                  </div>
                  <UserPlus size={15} style={{ color: 'var(--ui-accent)' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing Shares List */}
        <div>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '10px', color: 'var(--ui-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            People with access ({shares.length})
          </h4>
          {shares.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
              Not shared with anyone yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shares.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--ui-surface)',
                    border: '1px solid var(--ui-border)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                      {(s.shared_with_user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                      @{s.shared_with_user?.username || 'user'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--ui-accent-light)',
                        color: 'var(--ui-accent)',
                        fontWeight: 600,
                      }}
                    >
                      {s.permission === 'edit' ? 'Can Edit' : 'Can View'}
                    </span>
                  </div>
                  <button
                    className="btn-icon"
                    style={{ width: '28px', height: '28px', color: 'var(--ui-danger)' }}
                    onClick={() => handleRevokeShare(s.id)}
                    title="Revoke access"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
