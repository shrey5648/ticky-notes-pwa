'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'details' | 'pin'>('details');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handlePinClick = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    } else if (confirmPin.length < 4) {
      setConfirmPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (confirmPin.length > 0) {
      setConfirmPin((prev) => prev.slice(0, -1));
    } else if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleNextStep = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setError(null);
    setStep('pin');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('Please set a 4-digit PIN');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await register(username.trim(), pin, displayName.trim());
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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
        className="sticky-note-card note-color-pink"
        style={{
          width: '360px',
          padding: '32px 28px',
          transform: 'rotate(1.5deg)',
          borderRadius: '4px 4px 18px 4px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.25)',
          position: 'relative',
        }}
      >
        <div className="sticky-note-tape" />
        <div className="pushpin" />

        <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '4px' }}>✨</div>
          <h1 style={{ fontFamily: 'var(--font-note)', fontSize: '2.2rem', fontWeight: 700, color: '#111' }}>
            Create Note Board
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            {step === 'details' ? 'Choose username & display name' : 'Set your 4-digit security PIN'}
          </p>
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

        {step === 'details' ? (
          <div>
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#444' }}>
                Display Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Ignek User"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.15)',
                  background: 'rgba(255,255,255,0.7)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  marginTop: '4px',
                }}
              />
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleNextStep}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              Continue to PIN setup <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#444' }}>
                {pin.length < 4 ? 'Set 4-Digit PIN' : 'Confirm 4-Digit PIN'}
              </span>

              {/* PIN boxes display */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                {[0, 1, 2, 3].map((idx) => {
                  const currentPin = pin.length < 4 ? pin : confirmPin;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '36px',
                        height: '42px',
                        borderRadius: '8px',
                        border: '2px solid rgba(0,0,0,0.2)',
                        background: currentPin.length > idx ? '#111' : 'rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                      }}
                    >
                      {currentPin.length > idx ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }}>
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
                onClick={handleBackspace}
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
                onClick={() => setStep('details')}
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
                Back
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={loading || confirmPin.length < 4}
              onClick={handleSubmit}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              {loading ? 'Creating Board...' : 'Complete & Launch'} <ShieldCheck size={16} />
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
          <span>Already registered? </span>
          <Link href="/login" style={{ fontWeight: 700, color: 'var(--ui-accent)' }}>
            Log in with PIN
          </Link>
        </div>
      </div>
    </div>
  );
}
