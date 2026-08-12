'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            padding: '24px',
            textAlign: 'center',
            background: 'var(--ui-surface, #f9f9f9)',
            border: '1px dashed var(--ui-border, #eee)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)',
            minHeight: '300px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--ui-text, #333)' }}>
            Component Rendering Error
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--ui-text-muted, #777)', maxWidth: '400px', marginBottom: '20px' }}>
            {this.props.errorMessage || 'Something went wrong while rendering this section of the workspace.'}
          </p>
          {this.state.error && (
            <pre
              style={{
                background: 'rgba(0,0,0,0.05)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--ui-danger, #ef4444)',
                maxWidth: '90%',
                overflowX: 'auto',
                marginBottom: '20px',
                textAlign: 'left',
                fontFamily: 'monospace',
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
