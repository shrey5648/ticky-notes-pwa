'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface ThemeSelectorProps {
  themeVariant?: string;
  onSelectThemeVariant?: (variant: string) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themeVariant = 'cork',
  onSelectThemeVariant,
}) => {
  const [showCanvasThemeMenu, setShowCanvasThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowCanvasThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!onSelectThemeVariant) return null;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={themeMenuRef}>
      <button
        className="btn-icon"
        onClick={() => setShowCanvasThemeMenu(!showCanvasThemeMenu)}
        title="Change Canvas Background Theme"
        style={{ width: '32px', height: '32px' }}
      >
        🎨
      </button>

      {showCanvasThemeMenu && (
        <div
          className="dynamic-island-dropdown"
          style={{
            top: 'calc(100% + 8px)',
            right: 0,
            width: '180px',
            padding: '6px',
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
            Canvas Themes
          </div>
          {[
            { id: 'cork', name: '🪵 Classic Cork' },
            { id: 'dark_leather', name: '🖤 Dark Leather' },
            { id: 'blueprint', name: '📐 Blueprint' },
            { id: 'grid_paper', name: '📄 Grid Paper' },
            { id: 'vintage_pastel', name: '🎨 Vintage Pastel' },
            { id: 'glassmorphism', name: '🔮 Glassmorphism' },
          ].map((t) => (
            <button
              key={t.id}
              className="dynamic-island-note-item"
              style={{
                background: themeVariant === t.id ? 'var(--ui-accent-light)' : 'transparent',
                borderColor: themeVariant === t.id ? 'var(--ui-accent)' : 'var(--ui-border)',
              }}
              onClick={() => {
                onSelectThemeVariant(t.id);
                setShowCanvasThemeMenu(false);
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{t.name}</span>
              {themeVariant === t.id && <Check size={13} style={{ color: 'var(--ui-accent)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
