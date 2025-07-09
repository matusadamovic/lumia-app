'use client'

import { cn, glassClasses } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string
}

export default function GlassSelect({
  containerClassName,
  className,
  children,
  ...props
}: GlassSelectProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <select
        {...props}
        className={cn(
          glassClasses,
          'px-4 py-2 pr-8 appearance-none bg-transparent text-white',
          className,
        )}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </div>
    </div>
  )
}
