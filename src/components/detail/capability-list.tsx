import { CheckCircle2 } from 'lucide-react';

export function CapabilityList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}
