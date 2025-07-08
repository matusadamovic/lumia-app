'use client';

import { useEffect, useState } from 'react';
import type { User } from "@supabase/supabase-js";
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        setUser(data.user);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <p className="p-4">Loading...</p>;
  if (!user) return <p className="p-4">No user found.</p>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p>Email: {user.email}</p>
      <button
        onClick={handleSignOut}
        className="bg-red-600 text-white rounded px-4 py-2 w-fit"
      >
        Sign Out
      </button>
    </div>
  );
}
