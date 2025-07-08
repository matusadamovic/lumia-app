'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { BackgroundGradientAnimation } from '@/components/background-gradient-animation';

export default function Home() {
  const [online, setOnline] = useState<number | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const socket = io({ path: '/api/socket' });
    socketRef.current = socket;

    const handleCount = (count: number) => setOnline(count);
    socket.on('online-count', handleCount);

    return () => {
      socket.off('online-count', handleCount);
      socket.disconnect();
    };
  }, []);

  //new

  return (
    <BackgroundGradientAnimation>
      <main className="flex flex-col md:flex-row min-h-screen p-4 gap-8 items-center justify-center">
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <h1 className="text-4xl font-bold">Lumia</h1>
          <div className="text-sm text-gray-500">
            Live online users: {online ?? '--'}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <Link href="/chat" className="bg-blue-600 text-white rounded px-4 py-2">
            Start Videochat
          </Link>
          <button className="bg-gray-200 rounded px-4 py-2">Select Country</button>
          <button className="bg-gray-200 rounded px-4 py-2">Select Gender</button>
        </div>
      </main>
    </BackgroundGradientAnimation>
  );
}
