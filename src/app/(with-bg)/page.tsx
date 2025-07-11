'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
//import { AuroraBackground } from '@/components/ui/aurora-background'; // uprav cestu podľa svojej štruktúry
// Background effect provided by layout
import { glassClasses, cn, iconButtonClasses } from '@/lib/utils';
import { countries } from '@/lib/countries';
import BlurModal from '@/components/ui/BlurModal';
import { AiOutlineGlobal } from 'react-icons/ai';
import {
  MdOutlineWc,
  MdSportsEsports,
  MdPlaylistAddCheck,
} from 'react-icons/md';
import IconSwitch from '@/components/ui/IconSwitch';

const gameTitles = [
  'Truth or Dare',
  'Guess Who Am I',
  'Would You Rather',
  'Never Have I Ever',
];

export default function Home() {
  const [online, setOnline] = useState<number | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  useEffect(() => {
    const socket = io({ path: '/api/socket', query: { purpose: 'count' } });
    socketRef.current = socket;

    const handleCount = (count: number) => setOnline(count);
    socket.on('online-count', handleCount);

    return () => {
      socket.off('online-count', handleCount);
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen p-4 gap-8 items-center justify-center">
        {/* ----- tvoj pôvodný obsah stránky ----- */}
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div className="px-4 py-2 text-center">
            <h1 className="text-4xl font-bold text-white flex gap-1">
              {Array.from('LUMIA').map((letter) => (
                <span key={letter} className="px-1">{letter}</span>
              ))}
            </h1>
          </div>
          <div className="text-sm text-gray-300">
            Live online users: {online ?? '--'}
          </div>
        </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <Link
          href={`/chat?country=${encodeURIComponent(country)}&gender=${encodeURIComponent(gender)}&gameMode=${gameMode ? 1 : 0}&games=${selectedGames.join(',')}`}
          className={cn(glassClasses, 'px-4 py-2')}
        >
          Start Videochat
        </Link>
        <div>
          <button
            onClick={() => setCountryOpen((o) => !o)}
            aria-label="Select Country"
            className={cn(glassClasses, iconButtonClasses)}
          >
            {country ? countries.find((c) => c.name === country)?.flag : <AiOutlineGlobal />}
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setGenderOpen((o) => !o)}
            aria-label="Select Gender"
            className={cn(glassClasses, iconButtonClasses)}
          >
            {gender === 'Male' ? '♂️' : gender === 'Female' ? '♀️' : gender === 'Other' ? '⚧' : <MdOutlineWc />}
          </button>
        </div>
        <div>
          <IconSwitch
            checked={gameMode}
            onChange={setGameMode}
            icon={<MdSportsEsports className="text-xs" />}
            className={cn(glassClasses)}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setGamesOpen(true)}
            aria-label="Select Games"
            className={cn(glassClasses, iconButtonClasses, 'relative')}
          >
            <MdPlaylistAddCheck />
            {selectedGames.length > 0 && (
              <span className="absolute -top-1 -right-1 text-xs bg-red-500 rounded-full px-1">
                {selectedGames.length}
              </span>
            )}
          </button>
        </div>
        </div>
        {/* --------------------------------------- */}
      </div>
    <BlurModal open={countryOpen} onClose={() => setCountryOpen(false)}>
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
        {countries.map(({ code, name, flag }) => (
          <button
            key={code}
            onClick={() => {
              setCountry(name);
              setCountryOpen(false);
            }}
            className="block px-2 py-1 w-full text-left hover:bg-white/20 flex items-center gap-2"
          >
            <span className="text-xl">{flag}</span>
            {name}
          </button>
        ))}
      </div>
    </BlurModal>
    <BlurModal open={gamesOpen} onClose={() => setGamesOpen(false)}>
      <div className="flex flex-col gap-2">
        {gameTitles.map((title) => (
          <label key={title} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedGames.includes(title)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedGames((prev) => [...prev, title]);
                } else {
                  setSelectedGames((prev) => prev.filter((t) => t !== title));
                }
              }}
            />
            {title}
          </label>
        ))}
      </div>
    </BlurModal>
    <BlurModal open={genderOpen} onClose={() => setGenderOpen(false)}>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            setGender('Male');
            setGenderOpen(false);
          }}
          className="block px-2 py-1 w-full text-left hover:bg-white/20"
        >
          ♂️ Male
        </button>
        <button
          onClick={() => {
            setGender('Female');
            setGenderOpen(false);
          }}
          className="block px-2 py-1 w-full text-left hover:bg-white/20"
        >
          ♀️ Female
        </button>
        <button
          onClick={() => {
            setGender('Other');
            setGenderOpen(false);
          }}
          className="block px-2 py-1 w-full text-left hover:bg-white/20"
        >
          ⚧ Other
        </button>
      </div>
    </BlurModal>
  </>
  );
}
