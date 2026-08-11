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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={20} style={{ color: 'var(--ui-accent)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Share Sticky Note</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--ui-text-muted)', marginBottom: '16px' }}>
          Share <strong>&quot;{note.title || 'Untitled Note'}&quot;</strong> with team members by username.
        </p>

        {statusMessage && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '12px',
              background: statusMessage.includes('Successfully') ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: statusMessage.includes('Successfully') ? '#2e7d32' : '#c62828',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* User Search & Permission Control */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Search Team Member (Username)
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--ui-text-muted)' }} />
              <input
                type="text"
                placeholder="Type username..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--ui-border)',
                background: 'var(--ui-surface)',
                color: 'var(--ui-text)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="view">Can View</option>
              <option value="edit">Can Edit</option>
            </select>
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div
              style={{
                border: '1px solid var(--ui-border)',
                borderRadius: '8px',
                background: 'var(--ui-bg)',
                maxHeight: '160px',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleShareWithUser(u.username)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--ui-border)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>@{u.username}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ui-text-muted)', marginLeft: '8px' }}>
                      ({u.display_name})
                    </span>
                  </div>
                  <UserPlus size={16} style={{ color: 'var(--ui-accent)' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing Shares List */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--ui-text-muted)' }}>
            People with access ({shares.length})
          </h4>
          {shares.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', fontStyle: 'italic' }}>
              This sticky note has not been shared with anyone yet.
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--ui-surface)',
                    border: '1px solid var(--ui-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={14} style={{ color: 'var(--ui-accent)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      @{s.shared_with_user?.username || 'user'}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '10px', background: 'rgba(0,0,0,0.06)' }}>
                      {s.permission === 'edit' ? 'Can Edit' : 'Can View'}
                    </span>
                  </div>
                  <button
                    className="btn-icon"
                    style={{ width: '28px', height: '28px', color: '#c62828' }}
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
