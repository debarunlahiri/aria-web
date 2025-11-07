'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false }
)

interface MessageContentProps {
  content: string
  isUser: boolean
}

export default function MessageContent({ content, isUser }: MessageContentProps) {
  const [style, setStyle] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    import('react-syntax-highlighter/dist/cjs/styles/prism').then((mod) => {
      setStyle(mod.vscDarkPlus)
    })
  }, [])

  return (
    <div className="markdown-content prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-100 leading-tight" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-gray-100 leading-tight" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-3 text-gray-100 leading-snug" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="text-base font-semibold mt-4 mb-2 text-gray-100 leading-snug" {...props} />
          ),
          h5: ({ ...props }) => (
            <h5 className="text-sm font-semibold mt-3 mb-2 text-gray-100 leading-snug" {...props} />
          ),
          h6: ({ ...props }) => (
            <h6 className="text-sm font-semibold mt-3 mb-2 text-gray-100 leading-snug" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="text-sm mb-4 leading-7 text-gray-200" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-bold text-gray-50" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic text-gray-200" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc list-outside ml-5 mb-4 space-y-2 text-gray-200" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal list-outside ml-5 mb-4 space-y-2 text-gray-200" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="text-sm leading-7 text-gray-200 pl-1" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-300 py-2"
              {...props}
            />
          ),
          br: ({ ...props }) => (
            <br className="my-2" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeString = String(children).replace(/\n$/, '')

            return !inline && language ? (
              <div className="relative my-3 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-400 uppercase font-mono">
                    {language || 'code'}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(codeString)
                    }}
                    className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    title="Copy code"
                  >
                    Copy
                  </button>
                </div>
                {isClient && style && SyntaxHighlighter ? (
                  <SyntaxHighlighter
                    language={language}
                    style={style}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      background: '#1e1e1e',
                      borderRadius: '0 0 0.5rem 0.5rem',
                    }}
                    showLineNumbers={codeString.split('\n').length > 5}
                    lineNumberStyle={{
                      minWidth: '3em',
                      paddingRight: '1em',
                      color: '#6e7681',
                      userSelect: 'none',
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                ) : (
                  <pre className="bg-gray-900 p-4 overflow-x-auto text-sm">
                    <code>{codeString}</code>
                  </pre>
                )}
              </div>
            ) : (
              <code
                className="bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-gray-200"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ ...props }) => (
            <pre className="mb-2" {...props} />
          ),
          a: ({ ...props }) => (
            <a
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          hr: ({ ...props }) => (
            <hr className="my-6 border-gray-700" {...props} />
          ),
          div: ({ ...props }) => (
            <div className="my-2" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-gray-700" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-gray-800" {...props} />
          ),
          tbody: ({ ...props }) => (
            <tbody {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="border-b border-gray-700" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="border border-gray-700 px-4 py-2 text-left text-sm font-semibold text-gray-200" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border border-gray-700 px-4 py-2 text-sm text-gray-200" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

