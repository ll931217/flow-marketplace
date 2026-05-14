import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownProps {
  children: string
  className?: string
}

/**
 * Theme-aware markdown renderer.
 * Supports GFM (tables, strikethrough, task lists, autolinks) via remark-gfm.
 * All elements map to project CSS variables for theme adaptation.
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={`md ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="md-h1" {...props} />,
          h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
          h4: ({ node, ...props }) => <h4 className="md-h4" {...props} />,
          p: ({ node, ...props }) => <p className="md-p" {...props} />,
          ul: ({ node, ...props }) => <ul className="md-ul" {...props} />,
          ol: ({ node, ...props }) => <ol className="md-ol" {...props} />,
          li: ({ node, ...props }) => <li className="md-li" {...props} />,
          a: ({ node, ...props }) => (
            <a className="md-a" target="_blank" rel="noreferrer" {...props} />
          ),
          strong: ({ node, ...props }) => <strong className="md-strong" {...props} />,
          em: ({ node, ...props }) => <em className="md-em" {...props} />,
          code: ({ node, className: cls, children, ...props }) => {
            const isBlock = (cls ?? '').includes('language-')
            return isBlock ? (
              <code className={`md-code-block mono ${cls ?? ''}`} {...props}>
                {children}
              </code>
            ) : (
              <code className="md-code mono" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ node, ...props }) => <pre className="md-pre mono" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="md-quote" {...props} />,
          table: ({ node, ...props }) => (
            <div className="md-table-wrap">
              <table className="md-table" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="md-thead" {...props} />,
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => <tr className="md-tr" {...props} />,
          th: ({ node, ...props }) => <th className="md-th" {...props} />,
          td: ({ node, ...props }) => <td className="md-td" {...props} />,
          hr: () => <hr className="md-hr" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
