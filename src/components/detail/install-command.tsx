'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallCommandProps {
  command: string;
  compact?: boolean;
  label?: string;
}

export function InstallCommand({ command, compact, label }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);
  if (!command) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-0 rounded-lg border border-zinc-700 bg-zinc-800/50 font-mono',
        compact ? 'text-xs' : 'text-sm'
      )}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {label && (
        <span
          className={cn(
            'shrink-0 rounded-l-lg border-r border-zinc-700 bg-zinc-800 font-sans font-medium text-zinc-300',
            compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
          )}
        >
          {label}
        </span>
      )}
      <code
        className={cn(
          'min-w-0 flex-1 truncate text-zinc-400',
          compact ? 'px-2 py-1' : 'px-3 py-2',
          !label && 'text-zinc-300'
        )}
      >
        {command}
      </code>
      <button
        onClick={handleCopy}
        className={cn(
          'shrink-0 text-zinc-500 hover:text-zinc-300',
          compact ? 'px-2 py-1' : 'px-3 py-2'
        )}
        aria-label="Copy command"
      >
        {copied ? (
          <Check className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'text-emerald-400')} />
        ) : (
          <Copy className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
        )}
      </button>
    </div>
  );
}
