'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'

interface Message {
  role: 'user' | 'model'
  content: string
  timestamp: Date
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    }, 50)
  }

  useEffect(() => {
    if (!isStreaming) {
      scrollToBottom('smooth')
    }
  }, [messages, isStreaming])

  useEffect(() => {
    if (isStreaming) {
      const scrollInterval = setInterval(() => {
        if (messagesEndRef.current) {
          const container = messagesEndRef.current.parentElement
          if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
            if (isNearBottom) {
              messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
            }
          }
        }
      }, 100)
      
      return () => clearInterval(scrollInterval)
    }
  }, [isStreaming])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setIsLoading(true)
    setIsStreaming(true)

    const aiMessage: Message = {
      role: 'model',
      content: '',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, aiMessage])
    const messageIndex = currentMessages.length

    try {
      const history = currentMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          history: history
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    content: `Error: ${data.error}`
                  }
                  return updated
                })
                break
              }

              if (data.text) {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    content: prev[messageIndex].content + data.text
                  }
                  return updated
                })
              }

              if (data.done) {
                break
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev]
        updated[messageIndex] = {
          ...updated[messageIndex],
          content: 'Failed to connect to the API. Please check your connection.'
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      setIsLoading(false)
      scrollToBottom('smooth')
    }
  }

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-20">
              <h1 className="text-4xl font-bold text-gray-200 mb-4">
                Aria
              </h1>
              <p className="text-gray-400 text-lg">
                Powered by Google Gemini
              </p>
              <p className="text-gray-500 mt-4">
                Start a conversation by typing a message below
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg px-4 py-3 shadow-md max-w-xs">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t border-gray-700 bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </main>
  )
}

