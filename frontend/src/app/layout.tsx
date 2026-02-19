import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import PWAInstaller from '@/components/PWAInstaller'
import TrialBanner from '@/components/TrialBanner'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
}

export const metadata: Metadata = {
  title: 'RostraCore - Security Workforce Management',
  description: 'Comprehensive security workforce management system for scheduling, rostering, and employee management',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/rostracore-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RostraCore',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RostraCore" />
        {/* Auto-reload on ChunkLoadError after deployments */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('error', function(e) {
            if (e.message && (e.message.includes('Loading chunk') || e.message.includes('ChunkLoadError'))) {
              window.location.reload();
            }
          });
        `}} />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <TrialBanner />
                {children}
                <PWAInstaller />
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
