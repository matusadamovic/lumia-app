'use client';

import { Vortex } from '@/components/ui/vortex';
import io from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

export default function WithBgLayout({ children }: { children: React.ReactNode }) {
  const [particleCount, setParticleCount] = useState(700);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const socket = io({ path: '/api/socket' });
    socketRef.current = socket;

    const handleCount = (count: number) => {
      setParticleCount(count < 4 ? 700 : count);
    };

    socket.on('online-count', handleCount);

    return () => {
      socket.off('online-count', handleCount);
      socket.disconnect();
    };
  }, []);

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
