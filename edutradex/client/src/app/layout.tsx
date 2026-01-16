import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://optigobroker.com'),
  title: {
    default: 'OptigoBroker - Online Trading Platform',
    template: '%s | OptigoBroker',
  },
  description: 'Trade Forex and OTC markets with OptigoBroker. Professional trading platform with real-time charts, copy trading, and competitive payouts.',
  keywords: ['trading', 'forex', 'binary options', 'OTC trading', 'copy trading', 'online broker'],
  authors: [{ name: 'OptigoBroker' }],
  creator: 'OptigoBroker',
  publisher: 'OptigoBroker',
  icons: {
    icon: [
      { url: '/logo.png', sizes: 'any' },
      { url: '/logo.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180' },
    ],
    shortcut: '/logo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://optigobroker.com',
    siteName: 'OptigoBroker',
    title: 'OptigoBroker - Online Trading Platform',
    description: 'Trade Forex and OTC markets with OptigoBroker. Professional trading platform.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'OptigoBroker Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@optigobroker',
    title: 'OptigoBroker - Online Trading Platform',
    description: 'Trade Forex and OTC markets with OptigoBroker. Professional trading platform.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  other: {
    'google': 'nositelinkssearchbox',
    'msapplication-TileColor': '#0d0d1a',
    'theme-color': '#0d0d1a',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-slate-900`} suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          gutter={6}
          containerStyle={{
            top: 12,
            right: 12,
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              padding: '8px 12px',
              fontSize: '13px',
              maxWidth: '280px',
            },
            success: {
              duration: 2500,
              iconTheme: {
                primary: '#10b981',
                secondary: '#f1f5f9',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f1f5f9',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
