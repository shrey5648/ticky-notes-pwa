'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, FileText, Tag, Lightbulb, Loader2 } from 'lucide-react';

interface AIAssistantMenuProps {
  noteTitle: string;
  noteContent: string;
  onApplySummary: (summaryHtml: string) => void;
  onApplyTags: (tags: string[]) => void;
  onApplyIdeas: (ideasHtml: string) => void;
}

export const AIAssistantMenu: React.FC<AIAssistantMenuProps> = ({
  noteTitle,
  noteContent,
  onApplySummary,
  onApplyTags,
  onApplyIdeas,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAIAction = async (action: 'summarize' | 'tag' | 'expand_ideas') => {
    setLoadingAction(action);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          title: noteTitle,
          content: noteContent,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (action === 'summarize' && data.summary) {
          onApplySummary(data.summary);
        } else if (action === 'tag' && data.tags) {
          onApplyTags(data.tags);
        } else if (action === 'expand_ideas' && data.htmlContent) {
          onApplyIdeas(data.htmlContent);
        }
      }
    } catch (err) {
      console.error('Error running AI action:', err);
    } finally {
      setLoadingAction(null);
      setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block', zIndex: 1000 }}>
      <button
        type="button"
        className="editor-toolbar-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="AI Assistant (Auto-Summarize, Smart Tag, Brainstorm)"
        style={{
          padding: '4px 10px',
          border: '1.5px solid var(--ui-accent, #f97316)',
          borderRadius: '5px',
          background: 'var(--ui-accent-light, rgba(249,115,22,0.1))',
          color: 'var(--ui-accent, #f97316)',
          cursor: 'pointer',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.8rem',
        }}
      >
        <Sparkles size={14} className="animate-spin-slow" />
        AI Assistant
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--ui-bg, #ffffff)',
            border: '1.5px solid var(--ui-border)',
            borderRadius: '10px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 99999,
            minWidth: '220px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <button
            type="button"
            className="btn-menu-item"
            onClick={() => handleAIAction('summarize')}
            disabled={!!loadingAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              borderRadius: '6px',
              color: 'var(--ui-text)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-surface-hover, rgba(0,0,0,0.05))')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {loadingAction === 'summarize' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} style={{ color: '#f97316' }} />
            )}
            Auto-Summarize
          </button>

          <button
            type="button"
            className="btn-menu-item"
            onClick={() => handleAIAction('tag')}
            disabled={!!loadingAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              borderRadius: '6px',
              color: 'var(--ui-text)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-surface-hover, rgba(0,0,0,0.05))')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {loadingAction === 'tag' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Tag size={14} style={{ color: '#10b981' }} />
            )}
            Smart Auto-Tag
          </button>

          <button
            type="button"
            className="btn-menu-item"
            onClick={() => handleAIAction('expand_ideas')}
            disabled={!!loadingAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              borderRadius: '6px',
              color: 'var(--ui-text)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-surface-hover, rgba(0,0,0,0.05))')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {loadingAction === 'expand_ideas' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Lightbulb size={14} style={{ color: '#3b82f6' }} />
            )}
            Brainstorm Sub-Tasks
          </button>
        </div>
      )}
    </div>
  );
};
