'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  defaultValue?: string;
  placeholder?: string;
  /** If provided, updates this callback instead of navigating */
  onChange?: (value: string) => void;
}

export function SearchInput({ defaultValue = '', placeholder, onChange }: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (newVal: string) => {
    setValue(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (onChange) {
        onChange(newVal);
      } else if (newVal.trim()) {
        router.push(`/search?q=${encodeURIComponent(newVal.trim())}`);
      }
    }, 400);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? 'Search agents...'}
        className="h-11 border-zinc-700 bg-zinc-800/50 pl-10 text-zinc-100 placeholder:text-zinc-500"
      />
      <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500 sm:inline-block">
        /
      </kbd>
    </div>
  );
}
