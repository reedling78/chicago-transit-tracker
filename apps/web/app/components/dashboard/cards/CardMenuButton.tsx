'use client'

import type { MouseEvent } from 'react'

interface CardMenuButtonProps {
  onPress: () => void
  isOpen: boolean
  accessibilityLabel: string
}

export default function CardMenuButton({
  onPress,
  isOpen,
  accessibilityLabel,
}: CardMenuButtonProps) {
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    onPress()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-label={accessibilityLabel}
      className="shrink-0 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-blue-400 focus:outline-none dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      <span aria-hidden className="block text-lg leading-none">
        ⋯
      </span>
    </button>
  )
}
