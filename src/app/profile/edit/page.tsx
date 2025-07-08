'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  supabase,
  fetchMyProfile,
  updateProfile,
  type Profile,
} from '@/lib/supabaseClient';
import { countries } from '@/lib/countries';
import requireAuth from '@/lib/requireAuth';

function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const prof = await fetchMyProfile();
      if (prof) {
        setProfile(prof);
        setNickname(prof.nickname ?? '');
        setGender(prof.gender ?? '');
        setLocation(prof.location ?? '');
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('No user');
      return;
    }

    let avatar_url = profile?.avatar_url ?? null;
    if (avatarFile) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`public/${user.id}`, avatarFile, { upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      avatar_url = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path).data.publicUrl;
    }

    const updateError = await updateProfile({
      nickname,
      gender,
      location,
      avatar_url,
    });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push('/profile');
  }

  if (loading) return <p className="p-4">Loading...</p>;
  if (!profile) return <p className="p-4">No profile found.</p>;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 max-w-sm mx-auto p-4"
    >
      <div className="flex flex-col items-center gap-2">
        {avatarFile ? (
          <Image
            src={URL.createObjectURL(avatarFile)}
            alt="Avatar preview"
            width={128}
            height={128}
            className="w-32 h-32 object-cover rounded-full border"
          />
        ) : profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt="Avatar"
            width={128}
            height={128}
            className="w-32 h-32 object-cover rounded-full border"
          />
        ) : null}
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setAvatarFile(e.target.files ? e.target.files[0] : null)
          }
          className="border px-3 py-2 rounded w-full"
        />
      </div>
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Nickname"
        className="border px-3 py-2 rounded"
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="border px-3 py-2 rounded"
      >
        <option value="" disabled>
          Select Gender
        </option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="border px-3 py-2 rounded"
      >
        <option value="" disabled>
          Select Country
        </option>
        {countries.map(({ code, name, flag }) => (
          <option key={code} value={name}>{`${flag} ${name}`}</option>
        ))}
      </select>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2">
        Save
      </button>
    </form>
  );
}

export default requireAuth(EditProfilePage);

