'use client';

import React from 'react';
import { UserPresence, User } from '@/lib/types';

interface PresenceBarProps {
  currentUser: User | null;
  presences: UserPresence[];
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ currentUser, presences }) => {
  if (!currentUser) return null;

  // Combine current user + active presences
  const allOnline = [
    {
      user_id: currentUser.id,
      username: currentUser.username,
      display_name: currentUser.display_name,
      color: '#3b82f6',
      isSelf: true,
    },
    ...presences.map((p) => ({
      user_id: p.user_id,
      username: p.username,
      display_name: p.display_name,
      color: p.color || '#10b981',
      isSelf: false,
    })),
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '-6px',
        padding: '2px 6px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--ui-surface)',
        border: '1px solid var(--ui-border)',
      }}
      title={`${allOnline.length} user${allOnline.length > 1 ? 's' : ''} online on this board`}
    >
      <div style={{ display: 'flex', alignItems: 'center', margin: '0 4px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px #10b981',
            marginRight: '6px',
            animation: 'pulse 2s infinite',
          }}
        />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ui-text-muted)', marginRight: '6px' }}>
          {allOnline.length} Live
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
        {allOnline.slice(0, 4).map((u, idx) => (
          <div
            key={u.user_id}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: u.color,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              border: '2px solid var(--ui-bg)',
              marginLeft: idx > 0 ? '-6px' : '0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              position: 'relative',
              cursor: 'pointer',
            }}
            title={u.isSelf ? `${u.display_name} (You)` : `@${u.username} (${u.display_name})`}
          >
            {(u.display_name || u.username).charAt(0).toUpperCase()}
          </div>
        ))}
        {allOnline.length > 4 && (
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--ui-accent-light)',
              color: 'var(--ui-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: 700,
              border: '2px solid var(--ui-bg)',
              marginLeft: '-6px',
            }}
          >
            +{allOnline.length - 4}
          </div>
        )}
      </div>
    </div>
  );
};
