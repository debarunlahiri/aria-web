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
  const messagesRef = useRef<Message[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdCounterRef = useRef(0)
  const activeRequestIdRef = useRef<number | null>(null)
  const aiMessageIndexRef = useRef<{ requestId: number; index: number } | null>(null)
  const cancelledRequestIdRef = useRef<number | null>(null)

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
    messagesRef.current = messages
  }, [messages])

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

  const cancelCurrentRequest = () => {
    if (abortControllerRef.current && activeRequestIdRef.current !== null) {
      cancelledRequestIdRef.current = activeRequestIdRef.current
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      return true
    }
    return false
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return

    if (!cancelCurrentRequest()) {
      cancelledRequestIdRef.current = null
    }

    const requestId = ++requestIdCounterRef.current
    activeRequestIdRef.current = requestId

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    const aiMessage: Message = {
      role: 'model',
      content: '',
      timestamp: new Date()
    }

    const history = [...messagesRef.current, userMessage].map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))

    let aiMessageIndex = -1

    setMessages(prev => {
      const updated = [...prev, userMessage, aiMessage]
      messagesRef.current = updated
      aiMessageIndex = updated.length - 1
      aiMessageIndexRef.current = { requestId, index: aiMessageIndex }
      return updated
    })

    setIsLoading(true)
    setIsStreaming(true)

    if (aiMessageIndex === -1 && aiMessageIndexRef.current?.requestId === requestId) {
      aiMessageIndex = aiMessageIndexRef.current.index
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history
        }),
        signal: controller.signal
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

        if (activeRequestIdRef.current !== requestId) {
          continue
        }

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
                  const targetIndex =
                    aiMessageIndexRef.current?.requestId === requestId
                      ? aiMessageIndexRef.current.index
                      : aiMessageIndex

                  if (updated[targetIndex]) {
                    updated[targetIndex] = {
                      ...updated[targetIndex],
                      content: `Error: ${data.error}`
                    }
                  }
                  messagesRef.current = updated
                  return updated
                })
                break
              }

              if (data.text) {
                setMessages(prev => {
                  const updated = [...prev]
                  const targetIndex =
                    aiMessageIndexRef.current?.requestId === requestId
                      ? aiMessageIndexRef.current.index
                      : aiMessageIndex

                  if (updated[targetIndex]) {
                    updated[targetIndex] = {
                      ...updated[targetIndex],
                      content: (updated[targetIndex].content || '') + data.text
                    }
                  }
                  messagesRef.current = updated
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (cancelledRequestIdRef.current === requestId) {
          cancelledRequestIdRef.current = null

          setMessages(prev => {
            const updated = [...prev]
            const targetIndex =
              aiMessageIndexRef.current?.requestId === requestId
                ? aiMessageIndexRef.current.index
                : aiMessageIndex

            if (updated[targetIndex]) {
              const existingContent = updated[targetIndex].content.trim()
              updated[targetIndex] = {
                ...updated[targetIndex],
                content: existingContent
                  ? `${updated[targetIndex].content}\n\nRequest canceled.`
                  : 'Request canceled.',
                timestamp: new Date()
              }
            }
            messagesRef.current = updated
            return updated
          })
        }
      } else {
        setMessages(prev => {
          const updated = [...prev]
          const targetIndex =
            aiMessageIndexRef.current?.requestId === requestId
              ? aiMessageIndexRef.current.index
              : aiMessageIndex

          if (updated[targetIndex]) {
            updated[targetIndex] = {
              ...updated[targetIndex],
              content: 'Failed to connect to the API. Please check your connection.'
            }
          }
          messagesRef.current = updated
          return updated
        })
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsStreaming(false)
        setIsLoading(false)
        abortControllerRef.current = null
        activeRequestIdRef.current = null
        scrollToBottom('smooth')
      }
    }
  }

  const handleCancelRequest = () => {
    cancelCurrentRequest()
  }

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-6">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-10 sm:mt-20 px-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-200 mb-3 sm:mb-4">
                Aria
              </h1>
              <p className="text-gray-400 text-base sm:text-lg">
                Powered by Google Gemini
              </p>
              <p className="text-gray-500 mt-3 sm:mt-4 text-sm sm:text-base">
                Start a conversation by typing a message below
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg px-3 sm:px-4 py-2 sm:py-3 shadow-md max-w-xs">
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
      
      <div className="border-t border-gray-700 bg-gray-900 safe-area-bottom">
        <div className="max-w-4xl mx-auto p-2 sm:p-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            onCancel={handleCancelRequest}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </main>
  )
}

