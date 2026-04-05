import ReactMarkdown from 'react-markdown';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">{children}</h3>,
        h2: ({ children }) => <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">{children}</h3>,
        h3: ({ children }) => <h4 className="text-sm font-semibold text-zinc-300 mt-3 mb-1">{children}</h4>,
        p: ({ children }) => <p className="text-sm text-zinc-400 mb-2 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside text-sm text-zinc-400 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-zinc-400 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm text-zinc-400">{children}</li>,
        strong: ({ children }) => <strong className="text-zinc-300 font-semibold">{children}</strong>,
        code: ({ children }) => <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-xs text-violet-300">{children}</code>,
        pre: ({ children }) => <pre className="rounded-lg bg-zinc-900 p-3 overflow-x-auto text-xs my-2">{children}</pre>,
        a: ({ href, children }) => <a href={href} className="text-violet-400 hover:text-violet-300" target="_blank" rel="noopener noreferrer">{children}</a>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-700 pl-3 text-sm text-zinc-500 italic my-2">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
