import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #065f46 0%, #0891b2 100%)',
          borderRadius: 36,
          position: 'relative',
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            background: 'rgba(255,255,255,0.08)',
            top: 10,
            left: 10,
          }}
        />
        {/* Main pound symbol */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
            letterSpacing: -4,
          }}
        >
          £
        </div>
        {/* Sub-label */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.80)',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          CHEAP IS CHEAP
        </div>
      </div>
    ),
    { ...size }
  )
}
