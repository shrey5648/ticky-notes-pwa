'use client';

import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Key } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'set' | 'verify';
  existingPin?: string;
  onSuccess: (pin: string) => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  mode,
  existingPin,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (mode === 'verify') {
      if (existingPin && pin !== existingPin) {
        setError('Incorrect PIN Code');
        return;
      }
    }

    onSuccess(pin);
    setPin('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--ui-accent)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              {mode === 'set' ? 'Set Note Passcode PIN' : 'Unlock Note Passcode'}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--ui-text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
          {mode === 'set'
            ? 'Set a 4-digit PIN passcode to hide and protect this sticky note.'
            : 'Enter the 4-digit PIN passcode to reveal hidden note contents.'}
        </p>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              background: 'var(--ui-danger-bg)',
              color: 'var(--ui-danger)',
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="• • • •"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="auth-input"
            style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '6px', marginBottom: '18px' }}
            maxLength={6}
            autoFocus
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {mode === 'set' ? 'Set Passcode' : 'Unlock Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
