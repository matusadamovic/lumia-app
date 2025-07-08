'use client';

import Link from 'next/link';
import { useUser } from '@supabase/auth-helpers-react';

export default function Home() {
  const user = useUser();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <h1 className="text-2xl font-bold">Lumia</h1>
      <Link href="/chat" className="text-blue-600 underline">
        Open Chat
      </Link>
      {user && (
        <Link href="/profile" className="text-blue-600 underline">
          Profile
        </Link>
      )}
    </main>
  );
}
