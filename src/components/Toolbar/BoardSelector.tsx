'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Board } from '@/lib/types';
import { ChevronDown, Check, FolderPlus, StickyNote, X } from 'lucide-react';

interface BoardSelectorProps {
  boards: Board[];
  currentBoardId: string;
  onSelectBoard?: (boardId: string) => void;
  onCreateBoard?: (name: string) => void;
}

export const BoardSelector: React.FC<BoardSelectorProps> = ({
  boards,
  currentBoardId,
  onSelectBoard,
  onCreateBoard,
}) => {
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const boardMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        setShowBoardDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const currentBoardObj = boards.find((b) => b.id === currentBoardId);

  const handleCreateBoardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardName.trim() && onCreateBoard) {
      onCreateBoard(newBoardName.trim());
      setNewBoardName('');
      setShowNewBoardModal(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={boardMenuRef}>
      <button
        className="btn-secondary"
        onClick={() => setShowBoardDropdown(!showBoardDropdown)}
        title="Workspace Boards"
        style={{ padding: '4px 10px', fontSize: '0.78rem', height: '32px' }}
      >
        <StickyNote size={13} /> {currentBoardObj?.name || 'Main Board'}{' '}
        <ChevronDown
          size={13}
          style={{
            transform: showBoardDropdown ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {showBoardDropdown && (
        <div
          className="dynamic-island-dropdown"
          style={{
            top: 'calc(100% + 8px)',
            left: 0,
            width: '210px',
            padding: '8px',
            zIndex: 150,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 4px 6px 4px',
              color: 'var(--ui-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Workspace Boards
          </div>
          {boards.map((b) => (
            <button
              key={b.id}
              className="dynamic-island-note-item"
              style={{
                background: currentBoardId === b.id ? 'var(--ui-accent-light)' : 'transparent',
                borderColor: currentBoardId === b.id ? 'var(--ui-accent)' : 'var(--ui-border)',
              }}
              onClick={() => {
                if (onSelectBoard) onSelectBoard(b.id);
                setShowBoardDropdown(false);
              }}
            >
              <StickyNote size={13} style={{ color: 'var(--ui-accent)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{b.name}</span>
              {currentBoardId === b.id && <Check size={13} style={{ color: 'var(--ui-accent)' }} />}
            </button>
          ))}
          <div style={{ height: '1px', background: 'var(--ui-border)', margin: '4px 0' }} />
          <button
            className="dynamic-island-note-item"
            onClick={() => {
              setShowBoardDropdown(false);
              setShowNewBoardModal(true);
            }}
          >
            <FolderPlus size={14} style={{ color: 'var(--ui-accent)' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Create New Board</span>
          </button>
        </div>
      )}

      {showNewBoardModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Create New Board</h3>
              <button className="btn-icon" onClick={() => setShowNewBoardModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateBoardSubmit}>
              <input
                type="text"
                placeholder="Board Name (e.g. Sprint 24, Personal...)"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ui-border)',
                  background: 'var(--ui-bg)',
                  color: 'var(--ui-text)',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewBoardModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
