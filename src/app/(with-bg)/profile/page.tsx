'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AiOutlineEdit, AiOutlineLogout } from 'react-icons/ai';
import { supabase, fetchMyProfile, type Profile } from '@/lib/supabaseClient';
import { countries } from '@/lib/countries';
import requireAuth from '@/lib/requireAuth';
import { glassClasses, cn } from '@/lib/utils';

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

  const locationInfo = profile.location
    ? countries.find((c) => c.name === profile.location)
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className={cn(
          glassClasses,
          'p-4 max-w-md w-full flex flex-col items-center gap-4 text-center'
        )}
      >
        <h1 className="text-2xl font-bold">Profile</h1>
        {profile.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt="Avatar"
          width={128}
          height={128}
          className="w-32 h-32 object-cover rounded-full border"
        />
      )}
      <p>{user.email}</p>
      <p>{profile.nickname ?? '-'}</p>
      <p>{profile.birthdate ?? '-'}</p>
      <p>{profile.gender ?? '-'}</p>
      <p>
        {profile.location
          ? locationInfo
            ? `${locationInfo.flag} ${locationInfo.name}`
            : profile.location
          : '-'}
      </p>
      <button
        onClick={() => router.push('/profile/edit')}
        className="bg-blue-600 text-white rounded-full p-2 w-fit"
        aria-label="Edit profile"
      >
        <AiOutlineEdit size={24} />
      </button>
      <button
        onClick={handleSignOut}
        className="bg-red-600 text-white rounded-full p-2 w-fit"
        aria-label="Sign out"
      >
        <AiOutlineLogout size={24} />
      </button>
      </div>
    </div>
  );
}

export default requireAuth(ProfilePage);

