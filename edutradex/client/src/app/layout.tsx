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
  title: 'OptigoBroker - Online Trading Platform',
  description: 'Trade Forex and OTC markets with OptigoBroker. Professional trading platform.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'OptigoBroker',
    title: 'OptigoBroker - Online Trading Platform',
    description: 'Trade Forex and OTC markets with OptigoBroker. Professional trading platform.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@optigobroker',
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
  other: {
    'google': 'nositelinkssearchbox',
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
