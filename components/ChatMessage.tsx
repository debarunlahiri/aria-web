'use client'

import { motion } from 'framer-motion'
import MessageContent from './MessageContent'
import { formatCost, type UsageCost } from '@/utils/tokenCounter'

interface Message {
  role: 'user' | 'model'
  content: string
  timestamp: Date
  usage?: UsageCost
}

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const usage = message.usage
  const usageLabel = isUser
    ? usage && `Input ${usage.inputTokens.toLocaleString()} tokens • ${formatCost(usage.inputCost)}`
    : usage && `Output ${usage.outputTokens.toLocaleString()} tokens • ${formatCost(usage.outputCost)}`

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-xl px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-zinc-800 border border-zinc-700/50 text-white break-words overflow-wrap-anywhere min-w-0">
          <MessageContent content={message.content} isUser={isUser} />
          <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-zinc-400">
            {usageLabel && <span className="tabular-nums">{usageLabel}</span>}
            <span>
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
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
      <div className="w-full text-zinc-100 break-words overflow-wrap-anywhere min-w-0">
        <MessageContent content={message.content} isUser={isUser} />
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          {usageLabel && <span className="tabular-nums">{usageLabel}</span>}
          <span>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
