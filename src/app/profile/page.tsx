'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, fetchMyProfile, type Profile } from '@/lib/supabaseClient';
import requireAuth from '@/lib/requireAuth';

function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        setUser(data.user);
        const prof = await fetchMyProfile();
        setProfile(prof);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <p className="p-4">Loading...</p>;
  if (!user) return <p className="p-4">No user found.</p>;
  if (!profile)
    return <p className="p-4">No profile information available.</p>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Image
        src={profile.avatar_url ?? ''}
        alt="Avatar"
        width={128}
        height={128}
        className="w-32 h-32 object-cover rounded-full border"
      />
      <p>Email: {user.email}</p>
      <p>Nickname: {profile.nickname ?? '-'}</p>
      <p>Birthdate: {profile.birthdate ?? '-'}</p>
      <p>Gender: {profile.gender ?? '-'}</p>
      <p>Location: {profile.location ?? '-'}</p>
      <button
        onClick={handleSignOut}
        className="bg-red-600 text-white rounded px-4 py-2 w-fit"
      >
        Sign Out
      </button>
    </div>
  );
}

export default requireAuth(ProfilePage);

