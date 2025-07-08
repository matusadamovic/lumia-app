import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createBrowserSupabaseClient();

export interface Profile {
  id: string;
  avatar_url: string | null;
  nickname: string | null;
  birthdate: string | null;
  gender: string | null;
  location: string | null;
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, avatar_url, nickname, birthdate, gender, location'
    )
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error loading profile', error);
    return null;
  }
  return data as Profile | null;
}
