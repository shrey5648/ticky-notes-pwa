'use client';

import React, { useState } from 'react';
import { Note } from '@/lib/types';
import { Trash2, RotateCcw, X, AlertTriangle, Sparkles } from 'lucide-react';

interface TrashBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedNotes: Note[];
  onRestoreNote: (id: string) => void;
  onPurgeNote: (id: string) => void;
  onPurgeAll: () => void;
}

export const TrashBinModal: React.FC<TrashBinModalProps> = ({
  isOpen,
  onClose,
  deletedNotes,
  onRestoreNote,
  onPurgeNote,
  onPurgeAll,
}) => {
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);

  if (!isOpen) return null;

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '600px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--ui-danger-bg)',
                color: 'var(--ui-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Trash Bin</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--ui-text-muted)', margin: 0 }}>
                {deletedNotes.length} deleted {deletedNotes.length === 1 ? 'note' : 'notes'} stored in recovery
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Empty State */}
        {deletedNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--ui-text-muted)' }}>
            <Trash2 size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Your Trash Bin is empty</p>
            <p style={{ fontSize: '0.8rem' }}>Deleted notes will appear here before being permanently removed.</p>
          </div>
        ) : (
          <>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              {!confirmPurgeAll ? (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ color: 'var(--ui-danger)', borderColor: 'rgba(244,67,54,0.3)', padding: '5px 12px', fontSize: '0.8rem' }}
                  onClick={() => setConfirmPurgeAll(true)}
                >
                  <Trash2 size={13} /> Empty Trash Bin
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ui-danger)', fontWeight: 600 }}>
                    Permanently delete all?
                  </span>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: 'var(--ui-danger)', padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => {
                      onPurgeAll();
                      setConfirmPurgeAll(false);
                    }}
                  >
                    Confirm Empty
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setConfirmPurgeAll(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* List of Deleted Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
              {deletedNotes.map((note) => {
                const snippet = stripHtml(note.content);
                return (
                  <div
                    key={note.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--ui-surface)',
                      border: '1px solid var(--ui-border)',
                      borderLeft: `4px solid ${note.color || '#FFEB3B'}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {note.title || 'Untitled Note'}
                      </div>
                      {snippet && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {snippet}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: 'var(--ui-text-muted)', marginTop: '4px' }}>
                        Deleted {new Date(note.updated_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {/* Restore Button */}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--ui-success)', borderColor: 'rgba(76,175,80,0.3)' }}
                        onClick={() => onRestoreNote(note.id)}
                        title="Restore note to board"
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                      {/* Purge Button */}
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: '30px', height: '30px', color: 'var(--ui-danger)' }}
                        onClick={() => onPurgeNote(note.id)}
                        title="Permanently Delete"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
