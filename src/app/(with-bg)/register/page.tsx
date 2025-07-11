'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { countries } from '@/lib/countries';
import { cn, glassClasses } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nickname || !birthdate || !gender || !location) {
      setError('Please fill in all required fields.');
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const user = signUpData.user;
    if (!user) {
      setError('Failed to create user.');
      return;
    }

    let avatar_url: string | null = null;
    if (avatarFile) {
      const {
        data: uploadData,
        error: uploadError,
      } = await supabase.storage
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

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      avatar_url,
      nickname,
      birthdate,
      gender,
      location,
    });

    if (profileError) {
      setError(profileError.message);
      return;
    }

    router.push('/profile');
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className={cn(glassClasses, 'p-4 max-w-md w-full flex flex-col gap-4')}
      >
        <h1 className="text-xl font-bold text-center">Register</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border px-3 py-2 rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border px-3 py-2 rounded"
          required
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname"
          className="border px-3 py-2 rounded"
          required
        />
      <input
        type="date"
        value={birthdate}
        onChange={(e) => setBirthdate(e.target.value)}
        className="border px-3 py-2 rounded"
        required
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="border px-3 py-2 rounded"
        required
      >
        <option value="" disabled>
          Select Gender
        </option>
        <option value="Male">♂️</option>
        <option value="Female">♀️</option>
        <option value="Other">⚧</option>
      </select>
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="border px-3 py-2 rounded"
        required
      >
        <option value="" disabled>
          Select Country
        </option>
        {countries.map(({ code, name, flag }) => (
          <option key={code} value={name}>{flag}</option>
        ))}
      </select>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setAvatarFile(e.target.files ? e.target.files[0] : null)
          }
          className="border px-3 py-2 rounded"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2"
        >
          Register
        </button>
      </form>
    </div>
  );
}
