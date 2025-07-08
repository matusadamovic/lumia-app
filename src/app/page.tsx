'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col md:flex-row min-h-screen p-4 gap-8 items-center justify-center">
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <h1 className="text-4xl font-bold">Lumia</h1>
        <div className="text-sm text-gray-500">Live online users: --</div>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <Link href="/chat" className="bg-blue-600 text-white rounded px-4 py-2">
          Start Videochat
        </Link>
        <button className="bg-gray-200 rounded px-4 py-2">Select Country</button>
        <button className="bg-gray-200 rounded px-4 py-2">Select Gender</button>
      </div>
    </main>
  );
}
