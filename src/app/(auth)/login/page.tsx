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
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--board-bg)',
        backgroundImage: 'var(--board-texture)',
        backgroundSize: '40px 40px',
        padding: '16px',
      }}
    >
      <div
        className="sticky-note-card note-color-yellow"
        style={{
          width: '360px',
          padding: '32px 28px',
          transform: 'rotate(-1deg)',
          borderRadius: '4px 4px 18px 4px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.25)',
          position: 'relative',
        }}
      >
        <div className="sticky-note-tape" />
        <div className="pushpin" />

        <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📝</div>
          <h1 style={{ fontFamily: 'var(--font-note)', fontSize: '2.2rem', fontWeight: 700, color: '#111' }}>
            Sticky Notes PWA
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>Enter your username and PIN to log in</p>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(244, 67, 54, 0.15)',
              color: '#c62828',
              fontSize: '0.85rem',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#444' }}>
              Username
            </label>
            <div style={{ position: 'relative', marginTop: '4px' }}>
              <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#666' }} />
              <input
                type="text"
                placeholder="e.g. ignek"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.15)',
                  background: 'rgba(255,255,255,0.7)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* PIN Field Display */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#444' }}>
              Security PIN
            </label>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '6px',
                marginBottom: '12px',
              }}
            >
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  style={{
                    width: '36px',
                    height: '42px',
                    borderRadius: '8px',
                    border: '2px solid rgba(0,0,0,0.2)',
                    background: pin.length > idx ? '#111' : 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                  }}
                >
                  {pin.length > idx ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Numeric Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinClick(digit)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'rgba(255,255,255,0.8)',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                  }}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinBackspace}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: 'rgba(255,255,255,0.5)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => handlePinClick('0')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                }}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPin('')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: 'rgba(255,255,255,0.5)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}
          >
            {loading ? 'Logging in...' : 'Unlock Notes Board'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
          <span>Don&apos;t have a note board yet? </span>
          <Link href="/register" style={{ fontWeight: 700, color: 'var(--ui-accent)' }}>
            Register with PIN
          </Link>
        </div>
      </div>
    </div>
  );
}
