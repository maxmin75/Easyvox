'use client'

import { useState, useEffect, useRef } from 'react'

export function useTypewriter(
  texts: string[],
  options: {
    typeSpeed?: number
    deleteSpeed?: number
    pauseDuration?: number
    loop?: boolean
  } = {}
) {
  const {
    typeSpeed = 60,
    deleteSpeed = 30,
    pauseDuration = 2000,
    loop = true,
  } = options

  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (texts.length === 0) return

    const currentText = texts[currentIndex]

    if (isWaiting) {
      timeoutRef.current = setTimeout(() => {
        setIsWaiting(false)
        setIsDeleting(true)
      }, pauseDuration)
      return
    }

    if (isDeleting) {
      if (displayText.length === 0) {
        timeoutRef.current = setTimeout(() => {
          setIsDeleting(false)
          const nextIndex = loop
            ? (currentIndex + 1) % texts.length
            : Math.min(currentIndex + 1, texts.length - 1)
          setCurrentIndex(nextIndex)
        }, 0)
        return
      }
      timeoutRef.current = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1))
      }, deleteSpeed)
    } else {
      if (displayText === currentText) {
        timeoutRef.current = setTimeout(() => {
          setIsWaiting(true)
        }, 0)
        return
      }
      timeoutRef.current = setTimeout(() => {
        setDisplayText(currentText.slice(0, displayText.length + 1))
      }, typeSpeed)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [displayText, currentIndex, isDeleting, isWaiting, texts, typeSpeed, deleteSpeed, pauseDuration, loop])

  return { displayText, isTyping: !isWaiting && !isDeleting }
}
