'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home as HomeIcon } from 'lucide-react'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import SlidingNumber from '@/components/SlidingNumber'
import ModelSelector, { MODEL_GROUPS, type ModelOption } from '@/components/ModelSelector'
import { estimateTokenCount } from '@/utils/tokenCounter'

interface Message {
  role: 'user' | 'model'
  content: string
  timestamp: Date
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [totalTokens, setTotalTokens] = useState(0)
  const [selectedModel, setSelectedModel] = useState<ModelOption>(
    MODEL_GROUPS[0].models.find(m => m.id === 'gemini-2.5-flash') || MODEL_GROUPS[0].models[0]
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesRef = useRef<Message[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdCounterRef = useRef(0)
  const activeRequestIdRef = useRef<number | null>(null)
  const aiMessageIndexRef = useRef<{ requestId: number; index: number } | null>(null)
  const cancelledRequestIdRef = useRef<number | null>(null)
  const userHasScrolledRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
    // Calculate total tokens for all messages
    const total = messages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0)
    setTotalTokens(total)
  }, [messages])

  // Check if user is at bottom of scroll
  const isAtBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return true
    const threshold = 150
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  // Handle scroll event to detect manual scrolling
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (isStreaming) {
        // User has scrolled up if they're not near the bottom
        userHasScrolledRef.current = !isAtBottom()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isStreaming])

  // Auto-scroll during streaming only if user hasn't scrolled up
  useEffect(() => {
    if (isStreaming) {
      const scrollInterval = setInterval(() => {
        // Only auto-scroll if user hasn't manually scrolled up
        if (!userHasScrolledRef.current && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
        }
      }, 100)
      
      return () => clearInterval(scrollInterval)
    } else {
      // Reset when streaming stops
      userHasScrolledRef.current = false
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

    // Reset scroll flag when sending new message
    userHasScrolledRef.current = false

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
          history,
          model: selectedModel.id
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        // Try to parse error response for better error messages
        let errorData = null;
        try {
          const text = await response.text();
          errorData = JSON.parse(text);
        } catch (e) {
          // If parsing fails, use default error
        }
        
        const error = new Error(errorData?.error || 'Failed to get response');
        (error as any).status = response.status;
        (error as any).code = errorData?.code || response.status;
        (error as any).retryAfter = errorData?.retryAfter;
        throw error;
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
                    let errorMessage = data.error;
                    
                    // Format 429 errors with better messaging
                    if (data.code === 429) {
                      if (data.retryAfter) {
                        errorMessage = `Rate limit exceeded. Please retry in ${data.retryAfter} seconds.\n\nYou have exceeded your API quota. Check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits`;
                      } else {
                        errorMessage = `Rate limit exceeded. Please wait a moment and try again.\n\nYou have exceeded your API quota. Check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits`;
                      }
                    }
                    
                    updated[targetIndex] = {
                      ...updated[targetIndex],
                      content: errorMessage
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
            let errorMessage = 'Failed to connect to the API. Please check your connection.';
            
            // Handle 429 rate limit errors
            if ((error as any).code === 429 || (error as any).status === 429) {
              const retryAfter = (error as any).retryAfter;
              if (retryAfter) {
                errorMessage = `Rate limit exceeded. Please retry in ${retryAfter} seconds.\n\nYou have exceeded your API quota. Check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits`;
              } else {
                errorMessage = `Rate limit exceeded. Please wait a moment and try again.\n\nYou have exceeded your API quota. Check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits`;
              }
            } else if ((error as any).message) {
              // Check if error message contains rate limit info
              const errorMsg = (error as any).message.toLowerCase();
              if (errorMsg.includes('quota') || errorMsg.includes('rate limit') || errorMsg.includes('429')) {
                errorMessage = `Rate limit exceeded. Please wait a moment and try again.\n\nYou have exceeded your API quota. Check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits`;
              } else {
                errorMessage = (error as any).message || errorMessage;
              }
            }
            
            updated[targetIndex] = {
              ...updated[targetIndex],
              content: errorMessage
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
    <main className="flex flex-col h-screen bg-black">
      {/* Header with model selector and token counter */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="border-b border-zinc-800/80 bg-black/95 backdrop-blur-md sticky top-0 z-10 shadow-2xl"
          >
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                {/* Left: Title and Home Button */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="flex-shrink-0 flex items-center gap-3"
                >
                  <motion.a
                    href="https://lambrk.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200"
                    aria-label="Home"
                  >
                    <HomeIcon className="w-5 h-5 text-zinc-300 hover:text-white" />
                  </motion.a>
                  <div className="flex flex-col">
                    <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                      Aria
                    </h1>
                    <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">
                      Powered by Lambrk
                    </p>
                  </div>
                </motion.div>

                {/* Right: Model Selector and Token Counter */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto"
                >
                  {/* Model Selector */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <ModelSelector 
                      selectedModel={selectedModel} 
                      onModelChange={setSelectedModel}
                    />
                  </div>

                  {/* Token Counter */}
                  <div className="hidden sm:block h-10 w-px bg-zinc-800"></div>
                  <div className="flex flex-col sm:items-end justify-center min-w-[120px]">
                    <div className="text-xs font-medium text-zinc-400 mb-0.5">Tokens</div>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <SlidingNumber value={totalTokens} className="text-xl font-bold text-blue-500 tabular-nums" />
                      <span className="text-xs text-zinc-500 font-medium">total</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-6">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mt-16 sm:mt-24 px-4"
            >
              <motion.h1
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-8 sm:mb-10"
              >
                Aria
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex justify-center mb-8"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 shadow-2xl"
                >
                  <p className="text-xs text-zinc-400 mb-3 uppercase tracking-wider font-semibold">Select Model</p>
                  <ModelSelector 
                    selectedModel={selectedModel} 
                    onModelChange={setSelectedModel}
                  />
                </motion.div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto"
              >
                Start a conversation by typing a message below
              </motion.p>
            </motion.div>
          )}
          
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start"
              >
                <div className="bg-zinc-900 rounded-lg px-3 sm:px-4 py-2 sm:py-3 shadow-md max-w-xs border border-zinc-800">
                  <div className="flex space-x-2">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-2 h-2 bg-zinc-500 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                      className="w-2 h-2 bg-zinc-500 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                      className="w-2 h-2 bg-zinc-500 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t border-zinc-800/80 bg-black/95 backdrop-blur-md safe-area-bottom sticky bottom-0 z-10 shadow-2xl">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
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

