'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Note, Board } from '@/lib/types';
import { CorkBoard } from '@/components/Board/CorkBoard';
import { Lock, ShieldCheck, Share2, Eye, Calendar, Sparkles } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';

export default function PublicSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState<'note' | 'board'>('note');
  const [sharedNote, setSharedNote] = useState<Note | null>(null);
  const [sharedBoard, setSharedBoard] = useState<Board | null>(null);
  const [boardNotes, setBoardNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!token) return;

    const fetchPublicShare = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/shares/public/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid or expired share link');
          return;
        }

        if (data.requiresPassword) {
          setRequiresPassword(true);
        } else if (data.entity_type === 'note') {
          setEntityType('note');
          setSharedNote(data.note);
        } else if (data.entity_type === 'board') {
          setEntityType('board');
          setSharedBoard(data.board);
          setBoardNotes(data.notes || []);
        }
      } catch (err) {
        console.error('Public fetch error:', err);
        setError('Network error loading shared content');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicShare();
  }, [token]);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    try {
      setPinError(null);
      const res = await fetch(`/api/shares/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_pin: pinInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Incorrect Password PIN');
        return;
      }

      setRequiresPassword(false);
      if (data.entity_type === 'note') {
        setEntityType('note');
        setSharedNote(data.note);
      } else if (data.entity_type === 'board') {
        setEntityType('board');
        setSharedBoard(data.board);
        setBoardNotes(data.notes || []);
      }
    } catch (err) {
      setPinError('Failed to verify PIN');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--board-gradient)',
          color: 'var(--ui-text)',
          gap: '16px',
        }}
      >
        <div className="loading-spinner" />
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ui-text-muted)' }}>
          Loading Shared Note Workspace...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ui-bg)',
          color: 'var(--ui-text)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--ui-danger-bg)',
            color: 'var(--ui-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Link Unavailable</h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--ui-text-muted)', maxWidth: '400px', lineHeight: '1.5' }}>
          {error}
        </p>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--board-gradient)',
          padding: '20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '32px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--ui-bg)',
            border: '1px solid var(--ui-border)',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--ui-accent), #ff6d00)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 8px 20px rgba(255, 109, 0, 0.3)',
            }}
          >
            <ShieldCheck size={26} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Protected Content</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', marginBottom: '20px' }}>
            This public share link is protected by a password PIN. Enter the PIN to view.
          </p>

          {pinError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                background: 'var(--ui-danger-bg)',
                color: 'var(--ui-danger)',
                marginBottom: '16px',
              }}
            >
              {pinError}
            </div>
          )}

          <form onSubmit={handleVerifyPin}>
            <input
              type="password"
              placeholder="Enter 4-digit PIN..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="auth-input"
              style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', marginBottom: '16px' }}
              maxLength={8}
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Unlock Content
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Header Banner for Public View */}
      <header
        style={{
          height: '56px',
          padding: '0 20px',
          background: 'var(--ui-bg)',
          borderBottom: '1px solid var(--ui-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ff6d00, #ff9100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              {entityType === 'note' ? (sharedNote?.title || 'Shared Sticky Note') : (sharedBoard?.name || 'Shared Canvas Board')}
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--ui-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={12} /> Read-Only Public Share Preview
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--ui-accent-light)',
              color: 'var(--ui-accent)',
            }}
          >
            Public Secret View Mode
          </span>
        </div>
      </header>

      {/* Main Content Render */}
      {entityType === 'board' ? (
        <CorkBoard
          notes={boardNotes}
          selectedNoteIds={[]}
          themeVariant="cork"
          connections={[]}
          frames={[]}
          onSelectNote={() => {}}
          onClearSelection={() => {}}
          onSetSelection={() => {}}
          onUpdateNotePosition={() => {}}
          onBatchUpdatePositions={() => {}}
          onEditNote={() => {}}
          onDeleteNote={() => {}}
          onBatchDeleteNotes={() => {}}
          onPinToggle={() => {}}
          onBatchPinToggle={() => {}}
          onLockToggle={() => {}}
          onBatchLockToggle={() => {}}
          onArchiveToggle={() => {}}
          onShareNote={() => {}}
          onBringToFront={() => {}}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: 'calc(100vh - 56px)',
            background: 'var(--board-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          {sharedNote && (
            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                minHeight: '280px',
                padding: '24px',
                borderRadius: '16px',
                backgroundColor: sharedNote.color || '#FFEB3B',
                boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                color: '#1a1a1a',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                animation: 'popIn 0.4s ease both',
              }}
            >
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '14px', borderBottom: '1px dashed rgba(0,0,0,0.15)', paddingBottom: '8px' }}>
                {sharedNote.title || 'Untitled Note'}
              </h2>
              <div
                style={{ fontSize: '0.95rem', lineHeight: '1.6', flex: 1 }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(sharedNote.content || '') }}
              />
              <div style={{ marginTop: '16px', fontSize: '0.75rem', opacity: 0.6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Shared via Secret Token Link</span>
                <span>{new Date(sharedNote.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
