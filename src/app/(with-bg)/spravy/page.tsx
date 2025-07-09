'use client';

import { glassClasses, cn } from '@/lib/utils';

export default function SpravyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className={cn(
          glassClasses,
          'p-6 max-w-md w-full flex flex-col items-center gap-2 text-center'
        )}
      >
        <p className="text-lg font-semibold">0 active friends</p>
        <p className="text-sm text-gray-300">No message history</p>
      </div>
    </div>
  );
}
