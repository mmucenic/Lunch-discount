import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #065f46 0%, #0891b2 100%)',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          £
        </div>
      </div>
    ),
    { ...size }
  )
}
