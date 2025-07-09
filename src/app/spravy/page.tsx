'use client';

import { Vortex } from '@/components/ui/vortex';
import { glassClasses, cn } from '@/lib/utils';

export default function SpravyPage() {
  return (
    <Vortex
      className="min-h-screen flex items-center justify-center"
      containerClassName="bg-transparent"
      particleCount={700}
      baseHue={220}
      backgroundColor="#000"
    >
      <div className={cn(glassClasses, 'p-4 max-w-md w-full text-center')}>
        <h1 className="text-xl font-bold">Spravy</h1>
        <p>Placeholder page.</p>
      </div>
    </Vortex>
  );
}
