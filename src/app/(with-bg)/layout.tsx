'use client';

import { Vortex } from '@/components/ui/vortex';

export default function WithBgLayout({ children }: { children: React.ReactNode }) {
  return (
    <Vortex
      className="min-h-screen"
      containerClassName="bg-transparent"
      particleCount={700}
      baseHue={220}
      backgroundColor="#000"
    >
      {children}
    </Vortex>
  );
}
