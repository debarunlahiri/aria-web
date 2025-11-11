'use client'

import { useState, KeyboardEvent } from 'react'
import { Send, X } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onCancel?: () => void
  isStreaming?: boolean
}

export default function ChatInput({ onSendMessage, onCancel, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
        className="flex-1 resize-none border border-gray-600 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
        rows={1}
        style={{
          minHeight: '44px',
          maxHeight: '180px',
          lineHeight: '22px',
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement
          target.style.height = 'auto'
          const newHeight = Math.min(target.scrollHeight, 180)
          target.style.height = `${newHeight}px`
        }}
      />
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="p-2.5 sm:p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        aria-label="Send message"
      >
        <Send className="w-5 h-5 sm:w-5 sm:h-5" />
      </button>
      {isStreaming && onCancel && (
        <button
          onClick={onCancel}
          className="p-2.5 sm:p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
          type="button"
          aria-label="Cancel request"
        >
          <X className="w-5 h-5 sm:w-5 sm:h-5" />
        </button>
      )}
    </div>
  )
}

