'use client';

import { useEffect, useState, FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, fetchMyProfile, type Profile } from '@/lib/supabaseClient';
import requireAuth from '@/lib/requireAuth';
import flags from 'emoji-flags';

function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        setUser(data.user);
        const prof = await fetchMyProfile();
        setProfile(prof);
        if (prof) setNewNickname(prof.nickname ?? '');
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!profile || !user) return;
    setSaving(true);
    setErrorMsg(null);

    let avatar_url = profile.avatar_url;
    if (avatarFile) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`public/${user.id}`, avatarFile, { upsert: true });
      if (uploadError) {
        setErrorMsg(uploadError.message);
        setSaving(false);
        return;
      }
      avatar_url = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path).data.publicUrl;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url, nickname: newNickname })
      .eq('id', user.id);
    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }
    setProfile({ ...profile, avatar_url, nickname: newNickname });
    setEditing(false);
    setAvatarFile(null);
    setSaving(false);
  }

  if (loading) return <p className="p-4">Loading...</p>;
  if (!user) return <p className="p-4">No user found.</p>;
  if (!profile)
    return <p className="p-4">No profile information available.</p>;

  const country = profile.location ? flags.countryCode(profile.location) : null;
  const locationText = country
    ? `${country.emoji} ${country.name}`
    : profile.location ?? '-';

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
      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <input
            type="text"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setAvatarFile(e.target.files ? e.target.files[0] : null)
            }
            className="border px-3 py-2 rounded"
          />
          {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 text-white rounded px-4 py-2"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setAvatarFile(null);
              }}
              className="bg-gray-300 rounded px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>Nickname: {profile.nickname ?? '-'}</p>
          <p>Birthdate: {profile.birthdate ?? '-'}</p>
          <p>Gender: {profile.gender ?? '-'}</p>
          <p>Location: {locationText}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white rounded px-4 py-2 w-fit"
            >
              Edit Profile
            </button>
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white rounded px-4 py-2 w-fit"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default requireAuth(ProfilePage);

