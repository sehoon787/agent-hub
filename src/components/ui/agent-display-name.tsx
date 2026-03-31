function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface AgentDisplayNameProps {
  displayName: string;
  variant?: 'card' | 'inline';
  className?: string;
}

export function AgentDisplayName({ displayName, variant = 'card', className }: AgentDisplayNameProps) {
  const slashIdx = displayName.indexOf('/');

  if (slashIdx === -1) {
    // No owner prefix — just show as-is
    return <span className={className}>{displayName}</span>;
  }

  const owner = displayName.slice(0, slashIdx);
  const agentName = slugToTitle(displayName.slice(slashIdx + 1));

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
