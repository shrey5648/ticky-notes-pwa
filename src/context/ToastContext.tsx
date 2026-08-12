'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Global fetch CSRF header injection interceptor
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  const getCookie = (name: string): string | undefined => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
  };

  window.fetch = async function (input, init) {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = (input as any).url;
    }

    const method = (init?.method || 'GET').toUpperCase();
    const isMutation = ['POST', 'PUT', 'DELETE'].includes(method);
    
    const isSameOrigin = !url.startsWith('http://') && !url.startsWith('https://') 
      || url.startsWith(window.location.origin);

    if (isSameOrigin && isMutation) {
      const csrfToken = getCookie('csrf_token');
      if (csrfToken) {
        const headers = new Headers(init?.headers);
        if (!headers.has('X-CSRF-Token')) {
          headers.set('X-CSRF-Token', csrfToken);
        }
        init = {
          ...init,
          headers,
        };
      }
    }

    return originalFetch(input, init);
  };
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextProps {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              minWidth: '280px',
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'var(--ui-surface, #ffffff)',
              color: 'var(--ui-text, #1e293b)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: `1px solid ${
                toast.type === 'success'
                  ? '#10b981'
                  : toast.type === 'error'
                  ? '#ef4444'
                  : toast.type === 'warning'
                  ? '#f59e0b'
                  : 'var(--ui-border, #e2e8f0)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              animation: 'slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05rem' }}>
                {toast.type === 'success'
                  ? '✅'
                  : toast.type === 'error'
                  ? '❌'
                  : toast.type === 'warning'
                  ? '⚠️'
                  : 'ℹ️'}
              </span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ui-text-muted, #64748b)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0 4px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
