'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Note, NoteShare, User, PublicShareToken } from '@/lib/types';
import { X, Search, Share2, Shield, Trash2, UserPlus, Link, Copy, Check, Lock, Clock, Globe } from 'lucide-react';

interface ShareDialogProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ note, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'public'>('users');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [shares, setShares] = useState<NoteShare[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Public Links state
  const [publicShares, setPublicShares] = useState<PublicShareToken[]>([]);
  const [pinProtection, setPinProtection] = useState('');
  const [expirationHours, setExpirationHours] = useState<number | ''>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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

  const fetchPublicShares = useCallback(async () => {
    if (!note) return;
    try {
      const res = await fetch(`/api/shares/public?entity_id=${note.id}`);
      if (res.ok) {
        const data = await res.json();
        setPublicShares(data.shares || []);
      }
    } catch (err) {
      console.error('Failed to fetch public shares:', err);
    }
  }, [note]);

  useEffect(() => {
    if (isOpen && note) {
      fetchShares();
      fetchPublicShares();
      setQuery('');
      setSearchResults([]);
      setStatusMessage(null);
    }
  }, [isOpen, note, fetchShares, fetchPublicShares]);

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

  const handleGeneratePublicLink = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await fetch('/api/shares/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'note',
          entity_id: note.id,
          password_pin: pinProtection || undefined,
          expires_in_hours: expirationHours || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error || 'Failed to generate link');
      } else {
        setStatusMessage('Secret public share link created!');
        setPinProtection('');
        setExpirationHours('');
        fetchPublicShares();
      }
    } catch (err) {
      setStatusMessage('Network error creating public share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePublicLink = async (shareId: string) => {
    try {
      const res = await fetch(`/api/shares/public?id=${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPublicShares();
      }
    } catch (err) {
      console.error('Revoke public link error:', err);
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/share/${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Share Sticky Note</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', margin: 0 }}>
                &quot;{note.title || 'Untitled Note'}&quot;
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            background: 'var(--ui-surface)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            border: '1px solid var(--ui-border)',
          }}
        >
          <button
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'users' ? 'var(--ui-bg)' : 'transparent',
              color: activeTab === 'users' ? 'var(--ui-accent)' : 'var(--ui-text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'users' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
            onClick={() => setActiveTab('users')}
          >
            👥 Team Members
          </button>
          <button
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'public' ? 'var(--ui-bg)' : 'transparent',
              color: activeTab === 'public' ? 'var(--ui-accent)' : 'var(--ui-text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'public' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
            onClick={() => setActiveTab('public')}
          >
            🔗 Public Secret Link
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '14px',
              background: statusMessage.includes('Successfully') || statusMessage.includes('created')
                ? 'var(--ui-success-bg)'
                : 'var(--ui-danger-bg)',
              color: statusMessage.includes('Successfully') || statusMessage.includes('created')
                ? 'var(--ui-success)'
                : 'var(--ui-danger)',
              animation: 'fadeInUp 0.3s ease both',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* TAB 1: TEAM MEMBERS */}
        {activeTab === 'users' && (
          <div>
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
                      }}
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
        )}

        {/* TAB 2: PUBLIC SECRET LINK */}
        {activeTab === 'public' && (
          <div>
            {/* Link Generation Form */}
            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--ui-surface)', border: '1px solid var(--ui-border)', marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={15} color="var(--ui-accent)" /> Create Secret Share Link
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>
                    Optional Password PIN
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ui-text-muted)' }} />
                    <input
                      type="password"
                      placeholder="e.g. 1234"
                      value={pinProtection}
                      onChange={(e) => setPinProtection(e.target.value)}
                      className="auth-input"
                      style={{ paddingLeft: '30px', fontSize: '0.85rem' }}
                      maxLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>
                    Expiration Timer
                  </label>
                  <select
                    value={expirationHours}
                    onChange={(e) => setExpirationHours(e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--ui-border)',
                      background: 'var(--ui-bg)',
                      color: 'var(--ui-text)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">Never Expires</option>
                    <option value={1}>Expires in 1 Hour</option>
                    <option value={24}>Expires in 24 Hours</option>
                    <option value={168}>Expires in 7 Days</option>
                  </select>
                </div>
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '9px 16px', fontSize: '0.88rem' }}
                onClick={handleGeneratePublicLink}
                disabled={loading}
              >
                <Link size={15} /> Generate Secret Share Link
              </button>
            </div>

            {/* Active Secret Links */}
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '10px', color: 'var(--ui-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Public Links ({publicShares.length})
              </h4>
              {publicShares.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                  No secret links generated yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {publicShares.map((ps) => (
                    <div
                      key={ps.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--ui-bg)',
                        border: '1px solid var(--ui-border)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--ui-accent)' }}>
                          /share/{ps.token}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-icon"
                            style={{ width: '28px', height: '28px', color: copiedToken === ps.token ? 'var(--ui-success)' : 'var(--ui-text)' }}
                            onClick={() => handleCopyLink(ps.token)}
                            title="Copy link to clipboard"
                          >
                            {copiedToken === ps.token ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <button
                            className="btn-icon"
                            style={{ width: '28px', height: '28px', color: 'var(--ui-danger)' }}
                            onClick={() => handleRevokePublicLink(ps.id)}
                            title="Revoke public link"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: 'var(--ui-text-muted)' }}>
                        {ps.password_pin ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--ui-warning)' }}>
                            <Lock size={10} /> PIN Protected
                          </span>
                        ) : (
                          <span>🔓 Open Access</span>
                        )}
                        {ps.expires_at ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} /> Exp: {new Date(ps.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>⏳ No Expiration</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
