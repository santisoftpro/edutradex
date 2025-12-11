import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Join OptigoBroker - Earn 10% Referral Bonus';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function TwitterImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
          }}
        />

        {/* Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* Logo Area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}>O</span>
            </div>
            <span style={{ color: 'white', fontSize: '36px', fontWeight: 'bold' }}>OptigoBroker</span>
          </div>

          {/* Main Headline */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}
          >
            Earn <span style={{ color: '#10b981' }}>10%</span> Commission
          </div>

          {/* Subheadline */}
          <div
            style={{
              fontSize: '28px',
              color: '#94a3b8',
              marginBottom: '40px',
              maxWidth: '800px',
            }}
          >
            Join using this referral link and start trading Crypto, Forex & Stocks
          </div>

          {/* Referral Code Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '16px 32px',
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '20px' }}>Referral Code:</span>
            <span style={{ color: '#10b981', fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {code}
            </span>
          </div>

          {/* Features Row */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginTop: '50px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: '#e2e8f0', fontSize: '18px' }}>Free Sign Up</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: '#e2e8f0', fontSize: '18px' }}>Instant Trading</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: '#e2e8f0', fontSize: '18px' }}>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
