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
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-xl px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg shadow-md bg-blue-600 text-white">
          <MessageContent content={message.content} isUser={isUser} />
          <p className="text-xs mt-1.5 sm:mt-2 text-blue-100">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="w-full text-gray-200">
        <MessageContent content={message.content} isUser={isUser} />
        <p className="text-xs mt-2 sm:mt-3 text-gray-500">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

