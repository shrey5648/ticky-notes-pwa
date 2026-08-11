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

  useEffect(() => {
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
      }
    } else {
      alert('To install Sticky Notes as a desktop app:\n\nChrome/Edge: Click the install icon in the browser address bar.');
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
      <button className="btn-icon" onClick={handleInstallPWA} title="Install Sticky Notes Desktop App">
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
    </header>
  );
};
