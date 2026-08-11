'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, ArrowRight, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 14px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ec407a, #ab47bc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(236, 64, 122, 0.3)',
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>
          <h1 className="auth-title" style={{ background: 'linear-gradient(135deg, #ec407a, #ab47bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Create Note Board
          </h1>
          <p className="auth-subtitle">
            {step === 'details' ? 'Choose your username & display name' : 'Set your 4-digit security PIN'}
          </p>

          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--ui-accent)',
                transition: 'all 0.3s ease',
              }}
            />
            <div
              style={{
                width: '32px',
                height: '4px',
                borderRadius: '2px',
                background: step === 'pin' ? 'var(--ui-accent)' : 'var(--ui-border)',
                transition: 'all 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--ui-danger-bg)',
              color: 'var(--ui-danger)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              textAlign: 'center',
              animation: 'fadeInUp 0.3s ease both',
            }}
          >
            {error}
          </div>
        )}

        {step === 'details' ? (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Username Field */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--ui-text-muted)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Username *
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ui-text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. ignek"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Display Name */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--ui-text-muted)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Display Name (Optional)
              </label>
              <input
                type="text"
                className="auth-input"
                style={{ paddingLeft: '14px' }}
                placeholder="e.g. Ignek User"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleNextStep}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 20px',
                fontSize: '0.95rem',
              }}
            >
              Continue to PIN setup <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* PIN Phase Label */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--ui-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {pin.length < 4 ? 'Set 4-Digit PIN' : 'Confirm 4-Digit PIN'}
              </span>
            </div>

            {/* PIN Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              {[0, 1, 2, 3].map((idx) => {
                const currentPin = pin.length < 4 ? pin : confirmPin;
                return (
                  <div key={idx} className={`pin-dot ${currentPin.length > idx ? 'filled' : ''}`}>
                    {currentPin.length > idx ? '•' : ''}
                  </div>
                );
              })}
            </div>

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="pin-key"
                  onClick={() => handlePinClick(digit)}
                >
                  {digit}
                </button>
              ))}
              <button type="button" className="pin-key-special" onClick={handleBackspace}>
                ⌫
              </button>
              <button type="button" className="pin-key" onClick={() => handlePinClick('0')}>
                0
              </button>
              <button
                type="button"
                className="pin-key-special"
                onClick={() => {
                  setPin('');
                  setConfirmPin('');
                  setStep('details');
                }}
              >
                <ArrowLeft size={14} style={{ marginRight: '2px' }} /> Back
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={loading || confirmPin.length < 4}
              onClick={handleSubmit}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 20px',
                fontSize: '0.95rem',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  Creating Board...
                </span>
              ) : (
                <>
                  Complete & Launch <ShieldCheck size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--ui-text-muted)' }}>
          <span>Already registered? </span>
          <Link
            href="/login"
            style={{
              fontWeight: 700,
              color: 'var(--ui-accent)',
              textDecoration: 'none',
            }}
          >
            Log in with PIN →
          </Link>
        </div>
      </div>
    </div>
  );
}
