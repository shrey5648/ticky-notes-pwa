'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, ArrowRight, Sparkles, Keyboard } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const handlePinClick = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
    pinInputRef.current?.focus();
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    pinInputRef.current?.focus();
  };

  // Keyboard Event Handler for PIN entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isUsernameFocused = activeEl === usernameInputRef.current;

      // Capture number keys 0-9 when username input is NOT active
      if (/^[0-9]$/.test(e.key)) {
        if (!isUsernameFocused && activeEl !== pinInputRef.current) {
          if (pin.length < 6) {
            setPin((prev) => prev + e.key);
          }
        }
      } else if (e.key === 'Backspace') {
        if (!isUsernameFocused && activeEl !== pinInputRef.current) {
          setPin((prev) => prev.slice(0, -1));
        }
      } else if (e.key === 'Escape' || (e.key.toLowerCase() === 'c' && !isUsernameFocused && activeEl !== pinInputRef.current)) {
        if (!isUsernameFocused) {
          setPin('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      usernameInputRef.current?.focus();
      return;
    }
    if (!pin || pin.length < 4) {
      setError('Please enter your 4-digit PIN');
      pinInputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(username.trim(), pin);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Check username and PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-board-wrapper">
      {/* Ambient Decorative Floating Notes in Background */}
      <div className="floating-note bg-note-yellow" style={{ top: '12%', left: '10%', transform: 'rotate(-12deg)' }}>
        <span>💡 Ideas</span>
      </div>
      <div className="floating-note bg-note-pink" style={{ top: '18%', right: '12%', transform: 'rotate(8deg)' }}>
        <span>📌 Meeting @ 3PM</span>
      </div>
      <div className="floating-note bg-note-blue" style={{ bottom: '15%', left: '14%', transform: 'rotate(6deg)' }}>
        <span>🚀 Launch App</span>
      </div>
      <div className="floating-note bg-note-green" style={{ bottom: '20%', right: '15%', transform: 'rotate(-9deg)' }}>
        <span>✨ PWA Standalone</span>
      </div>

      {/* Main Interactive Login Sticky Note Card */}
      <div className="login-sticky-card">
        {/* Realistic Semi-transparent Tape */}
        <div className="sticky-tape" />

        {/* 3D Glossy Red Pushpin */}
        <div className="sticky-pushpin" />

        {/* Card Header */}
        <div className="login-card-header">
          <div className="badge-pill">
            <Sparkles size={13} style={{ color: '#e65100' }} />
            <span>Sticky Notes Workspace</span>
          </div>
          <h1 className="login-note-title">Welcome Back! 👋</h1>
          <p className="login-note-subtitle">Enter your username and PIN to unlock</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="login-error-banner">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Username Input */}
          <div className="field-group">
            <label className="field-label">Username</label>
            <div className="input-icon-wrapper">
              <UserIcon size={16} className="input-icon" />
              <input
                ref={usernameInputRef}
                type="text"
                className="login-input-field"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && username.trim()) {
                    e.preventDefault();
                    pinInputRef.current?.focus();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Security PIN Display & Keyboard Input */}
          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="field-label">Security PIN</label>
              {pin && (
                <button
                  type="button"
                  onClick={() => {
                    setPin('');
                    pinInputRef.current?.focus();
                  }}
                  style={{ background: 'none', border: 'none', color: '#786c5e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Clear PIN
                </button>
              )}
            </div>

            {/* Hidden Input for Native Keyboard & Tab Focus */}
            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length >= 4) {
                  handleSubmit(e);
                }
              }}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '1px',
                height: '1px',
                zIndex: -1,
              }}
            />

            {/* PIN Dots Indicator */}
            <div
              className="pin-display-row"
              onClick={() => pinInputRef.current?.focus()}
              style={{ cursor: 'text' }}
              title="Click or focus to type PIN on keyboard"
            >
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className={`pin-dot-box ${pin.length > idx ? 'active-dot' : ''}`}>
                  {pin.length > idx ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Physical Keypad */}
            <div className="keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="keypad-num-btn"
                  onClick={() => handlePinClick(digit)}
                >
                  {digit}
                </button>
              ))}
              <button type="button" className="keypad-action-btn" onClick={handlePinBackspace} title="Backspace">
                ⌫
              </button>
              <button type="button" className="keypad-num-btn" onClick={() => handlePinClick('0')}>
                0
              </button>
              <button
                type="button"
                className="keypad-action-btn"
                onClick={() => {
                  setPin('');
                  pinInputRef.current?.focus();
                }}
                title="Reset"
              >
                C
              </button>
            </div>

            {/* Keyboard Entry Hint */}
            <div
              style={{
                fontSize: '0.73rem',
                color: 'var(--ui-text-muted)',
                textAlign: 'center',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Keyboard size={13} style={{ color: 'var(--ui-accent)' }} />
              <span>Keyboard active: Type digits <strong>0-9</strong> directly on your keyboard</span>
            </div>
          </div>

          {/* Unlock Submit Button */}
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loading-flex">
                <span className="mini-spin" /> Unlocking Board...
              </span>
            ) : (
              <span className="btn-loading-flex">
                Unlock Workspace <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
