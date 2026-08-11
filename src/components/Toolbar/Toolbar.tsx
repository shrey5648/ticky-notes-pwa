'use client';

import React, { useState, useEffect } from 'react';
import { User, Note } from '@/lib/types';
import {
  Plus,
  Search,
  Pin,
  Moon,
  Sun,
  Download,
  Wifi,
  WifiOff,
  LogOut,
  Archive,
  User as UserIcon,
  Users,
  Filter,
  X,
  Monitor,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface ToolbarProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedColor: string | null;
  onColorSelect: (color: string | null) => void;
  showPinnedOnly: boolean;
  onTogglePinnedOnly: () => void;
  showSharedOnly: boolean;
  onToggleSharedOnly: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  isOnline: boolean;
  syncing: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onCreateNote: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
}

const COLOR_PRESETS = [
  { name: 'Yellow', value: '#FFEB3B' },
  { name: 'Pink', value: '#F48FB1' },
  { name: 'Blue', value: '#81D4FA' },
  { name: 'Green', value: '#A5D6A7' },
  { name: 'Orange', value: '#FFE0B2' },
  { name: 'Purple', value: '#CE93D8' },
  { name: 'Coral', value: '#FFAB91' },
  { name: 'White', value: '#FFFFFF' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  user,
  searchQuery,
  onSearchChange,
  selectedColor,
  onColorSelect,
  showPinnedOnly,
  onTogglePinnedOnly,
  showSharedOnly,
  onToggleSharedOnly,
  showArchived,
  onToggleArchived,
  isOnline,
  syncing,
  theme,
  onToggleTheme,
  onCreateNote,
  onOpenUserManagement,
  onLogout,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showColorFilter, setShowColorFilter] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed app window)
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      setIsStandalone(!!isStandaloneMode);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      } else {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <header className="top-toolbar">
      {/* Create Note Button */}
      <button className="btn-primary" onClick={onCreateNote} title="Create new sticky note">
        <Plus size={18} /> New Note
      </button>

      {/* Search Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--ui-text-muted)' }} />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            padding: '6px 12px 6px 30px',
            borderRadius: '16px',
            border: '1px solid var(--ui-border)',
            background: 'var(--ui-bg)',
            color: 'var(--ui-text)',
            fontSize: '0.85rem',
            width: '160px',
            outline: 'none',
          }}
        />
      </div>

      {/* Filter Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Color filter dropdown */}
        <button
          className="btn-icon"
          onClick={() => setShowColorFilter(!showColorFilter)}
          title="Filter by color"
          style={{ background: selectedColor ? selectedColor : 'transparent' }}
        >
          <Filter size={16} />
        </button>

        {/* Pinned filter */}
        <button
          className="btn-icon"
          onClick={onTogglePinnedOnly}
          title="Show pinned notes only"
          style={{ background: showPinnedOnly ? 'rgba(230, 81, 0, 0.2)' : 'transparent' }}
        >
          <Pin size={16} style={{ color: showPinnedOnly ? '#e65100' : 'inherit' }} />
        </button>

        {/* Shared filter */}
        <button
          className="btn-icon"
          onClick={onToggleSharedOnly}
          title="Show shared notes only"
          style={{ background: showSharedOnly ? 'rgba(230, 81, 0, 0.2)' : 'transparent' }}
        >
          <UserIcon size={16} style={{ color: showSharedOnly ? '#e65100' : 'inherit' }} />
        </button>

        {/* Archive toggle */}
        <button
          className="btn-icon"
          onClick={onToggleArchived}
          title={showArchived ? 'View active notes' : 'View archived notes'}
          style={{ background: showArchived ? 'rgba(230, 81, 0, 0.2)' : 'transparent' }}
        >
          <Archive size={16} style={{ color: showArchived ? '#e65100' : 'inherit' }} />
        </button>
      </div>

      {/* Color Filter Popover */}
      {showColorFilter && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            left: '210px',
            background: 'var(--ui-bg)',
            border: '1px solid var(--ui-border)',
            borderRadius: '12px',
            padding: '8px',
            display: 'flex',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
            zIndex: 3000,
          }}
        >
          <button
            onClick={() => {
              onColorSelect(null);
              setShowColorFilter(false);
            }}
            style={{
              padding: '2px 8px',
              fontSize: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--ui-border)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {COLOR_PRESETS.map((cp) => (
            <button
              key={cp.value}
              onClick={() => {
                onColorSelect(cp.value);
                setShowColorFilter(false);
              }}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: cp.value,
                border: '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }}
              title={cp.name}
            />
          ))}
        </div>
      )}

      {/* Online / Offline Status Badge */}
      <div
        title={isOnline ? (syncing ? 'Syncing...' : 'Online (Synced)') : 'Offline mode — changes cached locally'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: isOnline ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 152, 0, 0.15)',
          color: isOnline ? '#2e7d32' : '#e65100',
        }}
      >
        {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
        <span>{isOnline ? (syncing ? 'Syncing' : 'Online') : 'Offline'}</span>
      </div>

      {/* PWA Install Button */}
      <button
        className="btn-icon"
        onClick={handleInstallPWA}
        title={isStandalone ? "Installed as Standalone App" : "Install as Standalone Desktop App"}
        style={{ color: isStandalone ? '#4caf50' : 'inherit' }}
      >
        <Download size={16} />
      </button>

      {/* Dark / Light Theme Toggle */}
      <button className="btn-icon" onClick={onToggleTheme} title="Toggle theme">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      {/* User info & Logout */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
          <button className="btn-icon" onClick={onOpenUserManagement} title="Manage Team Users (Add/Delete)">
            <Users size={16} style={{ color: 'var(--ui-accent)' }} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>@{user.username}</span>
          <button className="btn-icon" onClick={onLogout} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* PWA Standalone App Instructions Modal */}
      {showInstallModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Laptop size={22} style={{ color: '#d7a15c' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Open as Separate Window & Icon</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowInstallModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--ui-text-muted)', lineHeight: '1.5', marginTop: 0 }}>
              To open Sticky Notes in its <strong>own window with a separate app icon</strong> on Linux/Windows/Mac instead of a browser tab, follow these 2 simple steps in Chrome:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '20px 0' }}>
              <div style={{ display: 'flex', gap: '12px', background: 'rgba(215, 161, 92, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(215, 161, 92, 0.3)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#d7a15c', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>Install as App in Chrome</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ui-text-muted)' }}>
                    In Chrome's address bar (URL bar), click the <strong>Install</strong> icon (looks like a monitor with a down arrow). Or click Chrome <strong>Menu (⋮) &rarr; Save and Share &rarr; Install Sticky Notes</strong>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', background: 'rgba(215, 161, 92, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(215, 161, 92, 0.3)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#d7a15c', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>Enable "Open as Window"</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ui-text-muted)' }}>
                    Open <code>chrome://apps</code> in Chrome address bar, right-click <strong>Sticky Notes</strong>, and ensure <strong>"Open as window"</strong> is checked.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--ui-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--ui-border)', fontSize: '0.82rem', color: 'var(--ui-text-muted)', marginBottom: '18px' }}>
              💡 <strong>Tip:</strong> Once installed, you will find a dedicated <strong>Sticky Notes</strong> desktop shortcut icon in your Linux system application menu and taskbar!
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {deferredPrompt && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowInstallModal(false);
                    deferredPrompt.prompt();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={15} /> Trigger Chrome Install
                </button>
              )}
              <button className="btn-secondary" onClick={() => setShowInstallModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

