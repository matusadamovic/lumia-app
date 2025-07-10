import { cn } from '@/lib/utils';
import React from 'react';

interface IconSwitchProps {
  /** Whether the switch is on */
  checked: boolean;
  /** Callback when the switch changes */
  onChange: (checked: boolean) => void;
  /** Icon shown inside the switch knob */
  icon: React.ReactNode;
  className?: string;
}

export default function IconSwitch({
  checked,
  onChange,
  icon,
  className,
}: IconSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-12 items-center rounded-full transition-colors',
        checked ? 'bg-blue-600' : 'bg-gray-400',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-1 top-1 h-4 w-4 rounded-full bg-white text-black flex items-center justify-center transition-transform',
          checked ? 'translate-x-6' : 'translate-x-0',
        )}
      >
        {icon}
      </span>
    </button>
  );
}
