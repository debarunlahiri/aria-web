'use client'

import { motion } from 'framer-motion'
import MessageContent from './MessageContent'

interface Message {
  role: 'user' | 'model'
  content: string
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-xl px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg shadow-lg bg-blue-600 text-white">
          <MessageContent content={message.content} isUser={isUser} />
          <p className="text-xs mt-1.5 sm:mt-2 text-blue-200">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="w-full text-zinc-100">
        <MessageContent content={message.content} isUser={isUser} />
        <p className="text-xs mt-2 sm:mt-3 text-zinc-500">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}

