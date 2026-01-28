'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ModelOption {
  id: string
  name: string
  provider: string
}

interface ModelGroup {
  provider: string
  models: ModelOption[]
}

interface ModelSelectorProps {
  selectedModel: ModelOption
  onModelChange: (model: ModelOption) => void
  onCloseMenu?: () => void
}

const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: 'Gemini',
    models: [
      { id: 'gemini-3-pro-preview', name: '3.0 Pro Preview', provider: 'Gemini' },
      { id: 'gemini-3-flash-preview', name: '3.0 Flash Preview', provider: 'Gemini' },
      { id: 'gemini-flash-latest', name: 'Flash', provider: 'Gemini' },
      { id: 'gemini-flash-lite-latest', name: 'Flash Lite', provider: 'Gemini' },
      { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0', provider: 'Gemini' },
      { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4.0 Ultra', provider: 'Gemini' },
    ],
  },
]

export default function ModelSelector({ selectedModel, onModelChange, onCloseMenu }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [isOpen])

  const handleModelSelect = (model: ModelOption) => {
    onModelChange(model)
    setIsOpen(false)
    onCloseMenu?.()
  }

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-none">
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-between gap-2 bg-zinc-900/80 hover:bg-zinc-900 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-2xl border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200 min-w-0 sm:min-w-[220px] shadow-md hover:shadow-lg"
      >
        <div className="flex-1 text-left">
          <div className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.14em]">{selectedModel.provider}</div>
          <div className="text-sm sm:text-base font-semibold text-zinc-100 whitespace-normal leading-tight break-words mt-0.5">{selectedModel.name}</div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        </motion.div>
      </motion.button>

      {isOpen && createPortal(
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl z-[80] max-h-80 overflow-y-auto scrollbar-thin"
          data-model-selector="dropdown"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {MODEL_GROUPS.map((group, groupIndex) => (
            <div key={group.provider} className={groupIndex > 0 ? 'border-t border-zinc-800' : ''}>
              <div className="px-4 py-3 bg-black/50">
                <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                  />
                  {group.provider}
                </div>
              </div>
              <div className="py-1">
                {group.models.map((model, index) => (
                  <motion.button
                    key={model.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    onClick={() => handleModelSelect(model)}
                    whileHover={{ x: 4 }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-zinc-800/50 transition-colors flex items-center justify-between group ${
                      selectedModel.id === model.id ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <span className={`text-sm font-medium whitespace-normal leading-tight break-words ${
                      selectedModel.id === model.id ? 'text-blue-400' : 'text-zinc-200 group-hover:text-white'
                    }`}>
                      {model.name}
                    </span>
                    {selectedModel.id === model.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </motion.div>,
        document.body
      )}
    </div>
  )
}

export { MODEL_GROUPS }
export type { ModelOption }
