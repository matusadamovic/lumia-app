'use client';

import { Vortex } from '@/components/ui/vortex';
import { OnlineCountProvider, useOnlineCount } from '@/lib/onlineCountContext';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const count = useOnlineCount();
  const particleCount = count !== null && count >= 4 ? count : 700;

  return (
    <Vortex
      className="min-h-screen"
      containerClassName="bg-transparent"
      particleCount={particleCount}
      baseHue={220}
      backgroundColor="#000"
    >
      {children}
    </Vortex>
  );
}

export default function WithBgLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnlineCountProvider>
      <LayoutContent>{children}</LayoutContent>
    </OnlineCountProvider>
  );
}
