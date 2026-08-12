import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';

export const metadata: Metadata = {
  title: 'Sticky Notes — PWA Desktop & Web App',
  description: 'Realistic sticky notes PWA on cork board with PIN authentication, rich text editing, drag & drop, offline storage, and note sharing.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sticky Notes',
  },
};

export const viewport: Viewport = {
  themeColor: '#e65100',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC by setting theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var saved = localStorage.getItem('app-theme');
                if (saved === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('PWA ServiceWorker registered with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('PWA ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
