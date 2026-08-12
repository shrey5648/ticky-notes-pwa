'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!showBanner || !deferredPrompt) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--ui-bg)',
        border: '1.5px solid var(--ui-accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--ui-accent), #ff6d00)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Smartphone size={20} />
      </div>

      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Install Sticky Notes PWA</h4>
        <p style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', margin: 0 }}>
          Install as a desktop & mobile app for quick offline access!
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={handleInstallClick}>
          <Download size={14} /> Install App
        </button>
        <button className="btn-icon" style={{ width: '28px', height: '28px' }} onClick={() => setShowBanner(false)}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
