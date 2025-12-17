import { Metadata } from 'next';
import { RedirectToRegister } from './redirect-client';

interface ReferralPageProps {
  params: Promise<{ code: string }>;
}

// Dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: ReferralPageProps): Promise<Metadata> {
  const { code } = await params;

  const title = 'OptigoBroker! Online Trading Platform';
  const description = `Start your investment journey with OptigoBroker. Explore new worlds of trading including Forex, Crypto, Stocks & Commodities. Join now and trade with confidence!`;

  // Base URL - update this for production
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://optigobroker.com';
  const ogImageUrl = `${baseUrl}/og-referral.png`;

  return {
    title,
    description,
    keywords: [
      'trading platform',
      'forex trading',
      'crypto trading',
      'stock trading',
      'binary options',
      'referral program',
      'affiliate bonus',
      'earn commission',
      'optigobroker',
      'online trading',
      'trading referral',
      'make money online',
    ],
    authors: [{ name: 'OptigoBroker' }],
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: `${baseUrl}/ref/${code}`,
      siteName: 'OptigoBroker',
      title: 'OptigoBroker! Online Trading Platform',
      description: `Start your investment journey with OptigoBroker. Explore new worlds of trading including Forex, Crypto, Stocks & Commodities. Join now and trade with confidence!`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'OptigoBroker! Online Trading Platform',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'OptigoBroker! Online Trading Platform',
      description: `Start your investment journey with OptigoBroker. Explore new worlds of trading including Forex, Crypto, Stocks & Commodities. Join now and trade with confidence!`,
      images: [ogImageUrl],
      creator: '@optigobroker',
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
    alternates: {
      canonical: `${baseUrl}/ref/${code}`,
    },
    verification: {
      google: 'your-google-verification-code',
    },
  };
}

export default async function ReferralPage({ params }: ReferralPageProps) {
  const { code } = await params;

  // Render page with metadata, then redirect client-side
  // This allows crawlers to read the OG tags before redirect happens
  return <RedirectToRegister code={code} />;
}
