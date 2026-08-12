'use client';

import React, { useState, useEffect } from 'react';
import { WorkspaceActivity } from '@/lib/types';
import { X, Activity, MessageSquare, Plus, Edit3, Share2, Pin, Trash2, Clock } from 'lucide-react';

interface ActivityFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityFeedModal: React.FC<ActivityFeedModalProps> = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/activities')
        .then((res) => res.json())
        .then((data) => {
          if (data.activities) setActivities(data.activities);
        })
        .catch((err) => console.error('Failed to fetch activities:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredActivities = activities.filter((a) => {
    if (filterType === 'all') return true;
    return a.action_type === filterType;
  });

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <Plus size={14} color="#10b981" />;
      case 'comment':
        return <MessageSquare size={14} color="#3b82f6" />;
      case 'share':
        return <Share2 size={14} color="#f59e0b" />;
      case 'pin':
        return <Pin size={14} color="#ef4444" />;
      default:
        return <Edit3 size={14} color="#8b5cf6" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', height: '560px', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Activity size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Workspace Activity Log</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', margin: 0 }}>
                Real-time feed of workspace changes
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {['all', 'create', 'comment', 'share', 'pin'].map((type) => (
            <button
              key={type}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--ui-border)',
                background: filterType === type ? 'var(--ui-accent-light)' : 'transparent',
                color: filterType === type ? 'var(--ui-accent)' : 'var(--ui-text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
              onClick={() => setFilterType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Activity Timeline List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ui-text-muted)' }}>
              Loading activity timeline...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ui-text-muted)' }}>
              <Clock size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p style={{ fontSize: '0.88rem', margin: 0 }}>No recent activities found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--ui-surface)',
                    border: '1px solid var(--ui-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--ui-bg)',
                      border: '1px solid var(--ui-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {getActionIcon(act.action_type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        @{act.username} <span style={{ fontWeight: 400, color: 'var(--ui-text-muted)' }}>({act.display_name})</span>
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ui-text-muted)' }}>
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--ui-text)', margin: 0, lineHeight: '1.4' }}>
                      {act.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
