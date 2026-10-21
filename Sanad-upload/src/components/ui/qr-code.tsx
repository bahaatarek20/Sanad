'use client'

import React, { useMemo } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
  value: string
  size?: number
  fgColor?: string
  bgColor?: string
  className?: string
}

/**
 * مولد كود QR أصيل ومعتمد دولياً بمواصفات ISO/IEC 18004
 * قابل للمسح المباشر والفوري بكافة كاميرات الهواتف الذكية (iOS و Android)
 */
export default function QRCodeSvg({
  value,
  size = 120,
  fgColor = '#064e3b',
  bgColor = '#ffffff',
  className = '',
}: QRCodeProps) {
  const { matrix, matrixSize } = useMemo(() => {
    try {
      const qr = QRCode.create(value || 'https://sanad-edu1.vercel.app', {
        errorCorrectionLevel: 'M',
      })
      const dim = qr.modules.size
      const cells: boolean[][] = []
      for (let r = 0; r < dim; r++) {
        const row: boolean[] = []
        for (let c = 0; c < dim; c++) {
          row.push(Boolean(qr.modules.get(r, c)))
        }
        cells.push(row)
      }
      return { matrix: cells, matrixSize: dim }
    } catch (e) {
      console.warn('Error generating QR code:', e)
      return { matrix: [], matrixSize: 0 }
    }
  }, [value])

  if (matrixSize === 0) {
    return (
      <div
        className={`inline-flex items-center justify-center p-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-400 text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        QR
      </div>
    )
  }

  return (
    <div
      className={`inline-block p-1.5 rounded-xl shadow-xs border border-amber-200/80 bg-white ${className}`}
      style={{ width: size, height: size, backgroundColor: bgColor }}
      title={`كود التوثيق الرقمي: ${value}`}
    >
      <svg
        viewBox={`0 0 ${matrixSize} ${matrixSize}`}
        className="w-full h-full"
        shapeRendering="crispEdges"
      >
        <rect width={matrixSize} height={matrixSize} fill={bgColor} />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill={fgColor}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  )
}
