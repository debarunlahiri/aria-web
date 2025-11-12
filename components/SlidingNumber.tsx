'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface SlidingNumberProps {
  value: number
  className?: string
}

export default function SlidingNumber({ value, className = '' }: SlidingNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevValueRef = useRef(value)
  
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 30,
    mass: 1
  })

  useEffect(() => {
    spring.set(value)
    
    if (prevValueRef.current !== value) {
      setIsAnimating(true)
      
      const duration = 400
      const steps = 25
      const increment = (value - prevValueRef.current) / steps
      let currentStep = 0

      const interval = setInterval(() => {
        currentStep++
        if (currentStep <= steps) {
          setDisplayValue(Math.round(prevValueRef.current + increment * currentStep))
        } else {
          setDisplayValue(value)
          setIsAnimating(false)
          clearInterval(interval)
        }
      }, duration / steps)

      prevValueRef.current = value

      return () => clearInterval(interval)
    }
  }, [value, spring])

  return (
    <motion.span
      animate={{
        scale: isAnimating ? [1, 1.15, 1] : 1,
        color: isAnimating ? ['#3b82f6', '#6366f1', '#3b82f6'] : '#3b82f6'
      }}
      transition={{ duration: 0.3 }}
      className={`inline-block tabular-nums ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  )
}

