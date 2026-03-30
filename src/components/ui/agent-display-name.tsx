export function AgentDisplayName({ displayName }: { displayName: string }) {
  const slashIdx = displayName.indexOf('/');
  if (slashIdx === -1) return <>{displayName}</>;
  return (
    <>
      <span className="text-zinc-500">{displayName.slice(0, slashIdx)}/</span>
      {displayName.slice(slashIdx + 1)}
    </>
  );
}
