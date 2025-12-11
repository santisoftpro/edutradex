import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface ReferralPageProps {
  params: Promise<{ code: string }>;
}

// Dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: ReferralPageProps): Promise<Metadata> {
  const { code } = await params;

  const title = 'Join OptigoBroker & Earn 10% Bonus on Profits!';
  const description = `You've been invited to join OptigoBroker! Sign up with referral code ${code} and start trading crypto, forex, and stocks. Earn commissions on profitable trades.`;

  // Base URL - update this for production
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://optigobroker.com';
  const ogImageUrl = `${baseUrl}/og-referral.png`;

  return {
    title,
    description,
    keywords: ['trading', 'forex', 'crypto', 'stocks', 'binary options', 'referral', 'bonus', 'commission'],
    authors: [{ name: 'OptigoBroker' }],
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: `${baseUrl}/ref/${code}`,
      siteName: 'OptigoBroker',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Join OptigoBroker - Earn 10% Referral Bonus',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
      creator: '@optigobroker',
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${baseUrl}/ref/${code}`,
    },
  };
}

export default async function ReferralPage({ params }: ReferralPageProps) {
  const { code } = await params;

  // Redirect to register page with the referral code
  redirect(`/register?ref=${code}`);
}
