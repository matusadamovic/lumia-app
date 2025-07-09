'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
//import { AuroraBackground } from '@/components/ui/aurora-background'; // uprav cestu podľa svojej štruktúry
import { Vortex } from '@/components/ui/vortex';   // ← nový import
import { glassClasses, cn } from '@/lib/utils';
import GlassSelect from '@/components/GlassSelect';
import { countries } from '@/lib/countries';

export default function Home() {
  const [online, setOnline] = useState<number | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');

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

  return (
    <Vortex
      /* Tailwind trieda Vortexu, v ktorej držíš layout */
      className="flex flex-col md:flex-row min-h-screen p-4 gap-8 items-center justify-center"
      /* Tailwind trieda pre absolútny div s canvasom (voliteľné) */
      containerClassName="bg-transparent"
      /* príklady vlastných props – prispôsob podľa seba */
      particleCount={700}
      baseHue={220}          // východzia farba (modro-fialová)
      //rangeHue={100}         // rozsah odtieňov
      backgroundColor="#000" // farba pozadia, ak nechceš, nechaj default
    >
      {/* ----- tvoj pôvodný obsah stránky ----- */}
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <h1 className="text-4xl font-bold">Lumia</h1>
        <div className="text-sm text-gray-300">
          Live online users: {online ?? '--'}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <Link
          href={`/chat?country=${encodeURIComponent(country)}&gender=${encodeURIComponent(gender)}`}
          className={cn(glassClasses, 'px-4 py-2')}
        >
          Start Videochat
        </Link>
        <GlassSelect
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="text-white"
        >
          <option value="" disabled>
            Select Country
          </option>
          {countries.map(({ code, name, flag }) => (
            <option key={code} value={name}>{`${flag} ${name}`}</option>
          ))}
        </GlassSelect>
        <GlassSelect
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="text-white"
        >
          <option value="" disabled>
            Select Gender
          </option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </GlassSelect>
      </div>
      {/* --------------------------------------- */}
    </Vortex>
  );
}
