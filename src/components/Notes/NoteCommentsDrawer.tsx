'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, NoteComment, User } from '@/lib/types';
import { X, MessageSquare, Send, AtSign, User as UserIcon } from 'lucide-react';

interface NoteCommentsDrawerProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  workspaceUsers?: User[];
  onCommentAdded?: (noteId: string) => void;
}

export const NoteCommentsDrawer: React.FC<NoteCommentsDrawerProps> = ({
  note,
  isOpen,
  onClose,
  workspaceUsers = [],
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // @mention autocomplete state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    if (!note) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/comments?note_id=${note.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  }, [note]);

  useEffect(() => {
    if (isOpen && note) {
      fetchComments();
      setCommentText('');
      setShowMentionMenu(false);
    }
  }, [isOpen, note, fetchComments]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  if (!isOpen || !note) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCommentText(text);

    // Detect @ symbol for mention menu
    const lastWord = text.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      setShowMentionMenu(true);
      setMentionQuery(lastWord.substring(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMentionUser = (username: string) => {
    const words = commentText.split(/\s+/);
    words.pop();
    const updatedText = [...words, `@${username} `].join(' ');
    setCommentText(updatedText);
    if (!selectedMentions.includes(username)) {
      setSelectedMentions([...selectedMentions, username]);
    }
    setShowMentionMenu(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: note.id,
          comment_text: commentText.trim(),
          mentions: selectedMentions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [...prev, data.comment]);
          setCommentText('');
          setSelectedMentions([]);
          if (onCommentAdded) onCommentAdded(note.id);
        }
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = workspaceUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(mentionQuery) ||
      u.display_name.toLowerCase().includes(mentionQuery)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          height: '560px',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
        }}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <MessageSquare size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Note Comments</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', margin: 0 }}>
                &quot;{note.title || 'Untitled Note'}&quot;
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Comment Thread List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ui-text-muted)' }}>
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ui-text-muted)' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p style={{ fontSize: '0.88rem', margin: 0 }}>No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--ui-surface)',
                  border: '1px solid var(--ui-border)',
                  animation: 'fadeInUp 0.2s ease both',
                }}
              >
                <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem', flexShrink: 0 }}>
                  {(c.display_name || c.username).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>@{c.username}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--ui-text-muted)' }}>
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--ui-text)', margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>
                    {c.comment_text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Mention AutoComplete Popover */}
        {showMentionMenu && filteredUsers.length > 0 && (
          <div
            style={{
              border: '1px solid var(--ui-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--ui-bg)',
              maxHeight: '130px',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-md)',
              marginBottom: '8px',
            }}
          >
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => handleSelectMentionUser(u.username)}
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  borderBottom: '1px solid var(--ui-border)',
                }}
              >
                <AtSign size={13} style={{ color: 'var(--ui-accent)' }} />
                <strong>@{u.username}</strong>
                <span style={{ color: 'var(--ui-text-muted)', fontSize: '0.75rem' }}>({u.display_name})</span>
              </div>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Write a comment... (use @username to mention)"
            value={commentText}
            onChange={handleTextChange}
            className="auth-input"
            style={{ flex: 1, fontSize: '0.88rem' }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !commentText.trim()}
            style={{ padding: '0 16px', borderRadius: 'var(--radius-md)' }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
