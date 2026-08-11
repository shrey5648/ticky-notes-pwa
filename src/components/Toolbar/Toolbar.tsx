'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/lib/types';
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
  Users,
  Filter,
  X,
  Laptop,
  CheckCircle2,
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
  const [searchFocused, setSearchFocused] = useState(false);

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
      <button className="btn-primary" onClick={onCreateNote} title="Create new sticky note" id="btn-create-note">
        <Plus size={17} /> New Note
      </button>

      {/* Search Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '11px',
            color: searchFocused ? 'var(--ui-accent)' : 'var(--ui-text-muted)',
            transition: 'color 0.15s',
            zIndex: 1,
          }}
        />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          id="search-notes"
          style={{
            padding: '7px 12px 7px 30px',
            borderRadius: 'var(--radius-pill)',
            border: `1.5px solid ${searchFocused ? 'var(--ui-accent)' : 'var(--ui-border)'}`,
            background: 'var(--ui-bg)',
            color: 'var(--ui-text)',
            fontSize: '0.84rem',
            width: searchFocused ? '200px' : '150px',
            outline: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: searchFocused ? '0 0 0 3px var(--ui-accent-light)' : 'none',
          }}
        />
        {searchQuery && (
          <button
            className="btn-icon"
            style={{ width: '22px', height: '22px', position: 'absolute', right: '6px' }}
            onClick={() => onSearchChange('')}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Color filter */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowColorFilter(!showColorFilter)}
            title="Filter by color"
            id="btn-filter-color"
            style={{
              background: selectedColor ? selectedColor : 'transparent',
              border: selectedColor ? '2px solid var(--ui-accent)' : 'none',
              width: '34px',
              height: '34px',
            }}
          >
            <Filter size={15} />
          </button>

          {/* Color Popover */}
          {showColorFilter && (
            <div className="color-picker-popover" style={{ gridTemplateColumns: 'repeat(4, 1fr)', minWidth: '140px' }}>
              <button
                onClick={() => { onColorSelect(null); setShowColorFilter(false); }}
                className="color-swatch"
                style={{
                  background: 'linear-gradient(135deg, #eee, #ccc)',
                  gridColumn: 'span 4',
                  width: '100%',
                  height: '24px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ui-border)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#666',
                }}
              >
                All Colors
              </button>
              {COLOR_PRESETS.map((cp) => (
                <button
                  key={cp.value}
                  onClick={() => { onColorSelect(cp.value); setShowColorFilter(false); }}
                  className={`color-swatch ${selectedColor === cp.value ? 'active' : ''}`}
                  style={{ backgroundColor: cp.value, border: '1px solid rgba(0,0,0,0.15)' }}
                  title={cp.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pinned filter */}
        <button
          className="btn-icon"
          onClick={onTogglePinnedOnly}
          title="Pinned notes"
          id="btn-filter-pinned"
          style={{
            background: showPinnedOnly ? 'var(--ui-accent-light)' : 'transparent',
            color: showPinnedOnly ? 'var(--ui-accent)' : 'inherit',
            width: '34px',
            height: '34px',
          }}
        >
          <Pin size={15} />
        </button>

        {/* Archive toggle */}
        <button
          className="btn-icon"
          onClick={onToggleArchived}
          title={showArchived ? 'View active notes' : 'View archived'}
          id="btn-filter-archived"
          style={{
            background: showArchived ? 'var(--ui-accent-light)' : 'transparent',
            color: showArchived ? 'var(--ui-accent)' : 'inherit',
            width: '34px',
            height: '34px',
          }}
        >
          <Archive size={15} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '22px', background: 'var(--ui-border)', flexShrink: 0 }} />

      {/* Online / Offline Status */}
      <div
        className={`status-badge ${isOnline ? (syncing ? 'online syncing' : 'online') : 'offline'}`}
        title={isOnline ? (syncing ? 'Syncing...' : 'Online (Synced)') : 'Offline — changes cached locally'}
      >
        <span className="status-dot" />
        <span>{isOnline ? (syncing ? 'Syncing' : 'Online') : 'Offline'}</span>
      </div>

      {/* PWA Install */}
      <button
        className="btn-icon"
        onClick={handleInstallPWA}
        title={isStandalone ? 'Installed as Standalone App' : 'Install as Desktop App'}
        id="btn-install-pwa"
        style={{
          color: isStandalone ? 'var(--ui-success)' : 'inherit',
          width: '34px',
          height: '34px',
        }}
      >
        {isStandalone ? <CheckCircle2 size={15} /> : <Download size={15} />}
      </button>

      {/* Theme Toggle */}
      <button
        className="btn-icon"
        onClick={onToggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        id="btn-toggle-theme"
        style={{ width: '34px', height: '34px' }}
      >
        {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      </button>

      {/* User Info */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '2px' }}>
          <button
            className="btn-icon"
            onClick={onOpenUserManagement}
            title={user.role === 'admin' ? '👑 Super Admin Control Panel' : 'Manage Team Users'}
            id="btn-user-management"
            style={{ width: '34px', height: '34px', position: 'relative' }}
          >
            <Users size={15} style={{ color: user.role === 'admin' ? '#ffd700' : 'var(--ui-accent)' }} />
            {user.role === 'admin' && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  fontSize: '0.65rem',
                }}
                title="Super Admin"
              >
                👑
              </span>
            )}
          </button>
          <div
            className="user-avatar"
            title={`${user.display_name || user.username} ${user.role === 'admin' ? '(Super Admin)' : ''}`}
            style={{
              background: user.role === 'admin'
                ? 'linear-gradient(135deg, #ff9800, #e65100)'
                : undefined,
              boxShadow: user.role === 'admin' ? '0 0 8px rgba(255, 152, 0, 0.5)' : undefined,
            }}
          >
            {(user.display_name || user.username).charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{user.username}
            </span>
            {user.role === 'admin' && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ff9800', letterSpacing: '0.04em' }}>
                👑 ADMIN
              </span>
            )}
          </div>
          <button
            className="btn-icon"
            onClick={onLogout}
            title="Sign Out"
            id="btn-logout"
            style={{ width: '34px', height: '34px' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      )}

      {/* PWA Install Instructions Modal */}
      {showInstallModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--ui-accent), #ff6d00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Laptop size={20} color="#fff" />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Install as Desktop App</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowInstallModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--ui-text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
              Open Sticky Notes in its <strong>own window with a separate app icon</strong> on Linux/Windows/Mac:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {[
                {
                  step: 1,
                  title: 'Install as App in Chrome',
                  desc: 'In Chrome\'s address bar, click the Install icon. Or Chrome Menu (⋮) → Save and Share → Install Sticky Notes.',
                },
                {
                  step: 2,
                  title: 'Enable "Open as Window"',
                  desc: 'Open chrome://apps, right-click Sticky Notes, and ensure "Open as window" is checked.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--ui-accent-light)',
                    border: '1px solid var(--ui-border)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--ui-accent)',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '4px' }}>{item.title}</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--ui-text-muted)', margin: 0, lineHeight: '1.5' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--ui-border)',
                fontSize: '0.82rem',
                color: 'var(--ui-text-muted)',
                marginBottom: '20px',
              }}
            >
              💡 <strong>Tip:</strong> Once installed, you&apos;ll find a dedicated Sticky Notes shortcut in your application menu!
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {deferredPrompt && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowInstallModal(false);
                    deferredPrompt.prompt();
                  }}
                >
                  <Download size={14} /> Install Now
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
