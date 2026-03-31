function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface AgentDisplayNameProps {
  displayName: string;
  variant?: 'card' | 'inline';
  /** Render only the agent name (no @owner) */
  nameOnly?: boolean;
  /** Render only the @owner line */
  repoOnly?: boolean;
  className?: string;
}

export function AgentDisplayName({ displayName, variant = 'card', nameOnly, repoOnly, className }: AgentDisplayNameProps) {
  const slashIdx = displayName.indexOf('/');
  const owner = slashIdx !== -1 ? displayName.slice(0, slashIdx) : '';
  const agentName = slashIdx !== -1 ? slugToTitle(displayName.slice(slashIdx + 1)) : displayName;

  if (nameOnly) {
    return <span className={className}>{agentName}</span>;
  }

  if (repoOnly) {
    if (!owner) return null;
    return <span className={`text-xs text-zinc-500 ${className ?? ''}`}>@{owner}</span>;
  }

  if (slashIdx === -1) {
    return <span className={className}>{displayName}</span>;
  }

  if (variant === 'inline') {
    return (
      <span className={className}>
        {agentName}{' '}
        <span className="text-xs text-zinc-500">@{owner}</span>
      </span>
    );
  }

  // variant="card": name on first line, @owner on second line
  return (
    <span className={`flex flex-col ${className ?? ''}`}>
      <span>{agentName}</span>
      <span className="text-xs text-zinc-500">@{owner}</span>
    </span>
  );
}
