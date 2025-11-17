'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, X } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onCancel?: () => void
  isStreaming?: boolean
}

export default function ChatInput({ onSendMessage, onCancel, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px'
      }
    }
  }

  // Reset height when message is cleared
  useEffect(() => {
    if (message === '' && textareaRef.current) {
      textareaRef.current.style.height = '44px'
    }
  }, [message])

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-end gap-1.5 sm:gap-2"
    >
      <motion.textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
        whileFocus={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="flex-1 resize-none border border-zinc-700/50 hover:border-zinc-600 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-zinc-900/80 text-white placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto scrollbar-thin transition-colors"
        rows={1}
        style={{
          minHeight: '44px',
          maxHeight: '180px',
          lineHeight: '22px',
          fontSize: '16px',
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement
          target.style.height = 'auto'
          const newHeight = Math.min(target.scrollHeight, 180)
          target.style.height = `${newHeight}px`
          // Auto-scroll to bottom when content overflows
          if (target.scrollHeight > 180) {
            target.scrollTop = target.scrollHeight
          }
        }}
      />
      <motion.button
        onClick={handleSend}
        disabled={!message.trim()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex-shrink-0 p-2.5 sm:p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-blue-500/20"
        aria-label="Send message"
      >
        <motion.div
          animate={message.trim() ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Send className="w-5 h-5" />
        </motion.div>
      </motion.button>
      {isStreaming && onCancel && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="flex-shrink-0 p-2.5 sm:p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-red-500/20"
          type="button"
          aria-label="Cancel request"
        >
          <X className="w-5 h-5" />
        </motion.button>
      )}
    </motion.div>
  )
}

