"use client"

import { useState, useEffect, useRef } from "react"

type Expression = "normal" | "blink" | "surprised"

export function BidIcon() {
  const iconRef = useRef<HTMLDivElement>(null)
  const [eyePositions, setEyePositions] = useState({ left: { x: 0, y: 0 }, right: { x: 0, y: 0 } })
  const [expression, setExpression] = useState<Expression>("normal")

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect()
        const iconCenterX = rect.left + rect.width / 2
        const iconCenterY = rect.top + rect.height / 2

        const distance = 10 // Maximum pixel distance the eyes can move
        const eyeSpacing = 4 // Half the distance between the eyes

        const leftEyeX = iconCenterX - eyeSpacing
        const rightEyeX = iconCenterX + eyeSpacing

        const angleLeft = Math.atan2(e.clientY - iconCenterY, e.clientX - leftEyeX)
        const angleRight = Math.atan2(e.clientY - iconCenterY, e.clientX - rightEyeX)

        setEyePositions({
          left: {
            x: Math.max(-eyeSpacing, Math.min(eyeSpacing, Math.cos(angleLeft) * distance)),
            y: Math.sin(angleLeft) * distance,
          },
          right: {
            x: Math.max(-eyeSpacing, Math.min(eyeSpacing, Math.cos(angleRight) * distance)),
            y: Math.sin(angleRight) * distance,
          },
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setExpression("blink")
      setTimeout(() => setExpression("normal"), 200)
    }, 5000)

    return () => clearInterval(blinkInterval)
  }, [])

  const handleClick = () => {
    setExpression("surprised")
    setTimeout(() => setExpression("normal"), 500)
  }

  const getEyeStyle = (eye: "left" | "right") => {
    const baseStyle = {
      transform: `translate(${eyePositions[eye].x}px, ${eyePositions[eye].y}px)`,
    }

    switch (expression) {
      case "blink":
        return { ...baseStyle, height: "0.125rem" }
      case "surprised":
        return { ...baseStyle, height: "0.75rem", width: "0.75rem" }
      default:
        return baseStyle
    }
  }

  return (
    <div
      ref={iconRef}
      className="size-14 bg-gray-900 rounded-full flex items-center justify-center mb-6 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex gap-2">
        <div className="size-1.5 bg-white rounded-full transition-all duration-100" style={getEyeStyle("left")} />
        <div className="size-1.5 bg-white rounded-full transition-all duration-100" style={getEyeStyle("right")} />
      </div>
    </div>
  )
} 