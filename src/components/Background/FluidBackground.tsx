import React, { useEffect, useRef } from 'react'

interface Props {
  primaryColor?: string
  secondaryColor?: string
}

export const FluidBackground: React.FC<Props> = ({
  primaryColor = '#1a1a2e',
  secondaryColor = '#16213e',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置 canvas 大小
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 简单的渐变动画
    let animationId: number
    let hue = 0

    const animate = () => {
      hue = (hue + 0.2) % 360

      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
      )

      gradient.addColorStop(0, primaryColor)
      gradient.addColorStop(1, secondaryColor)

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [primaryColor, secondaryColor])

  return <canvas ref={canvasRef} className="fluid-background" />
}
