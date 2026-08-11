'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handlePinClick = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!pin || pin.length < 4) {
      setError('Please enter your 4-digit PIN');
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
                type="text"
                className="login-input-field"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Security PIN Display */}
          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="field-label">Security PIN</label>
              {pin && (
                <button
                  type="button"
                  onClick={() => setPin('')}
                  style={{ background: 'none', border: 'none', color: '#786c5e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Clear PIN
                </button>
              )}
            </div>

            {/* PIN Dots Indicator */}
            <div className="pin-display-row">
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
              <button type="button" className="keypad-action-btn" onClick={() => setPin('')} title="Reset">
                C
              </button>
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

        {/* Register Prompt */}
        <div className="login-footer-link">
          <span>Need a new sticky board? </span>
          <Link href="/register" className="highlight-link">
            Create Account & PIN →
          </Link>
        </div>
      </div>
    </div>
  );
}
