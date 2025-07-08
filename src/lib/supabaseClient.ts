import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createPagesBrowserClient();

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
    .maybeSingle();

  if (error) {
    console.error('Error loading profile', error);
    return null;
  }
  return data as Profile | null;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>>;

/**
 * Update the authenticated user's profile.
 *
 * @param fields - A subset of profile fields to update
 * @returns An Error from Supabase if the update fails, otherwise null.
 */
export async function updateProfile(
  fields: ProfileUpdate,
): Promise<Error | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Error('No user');

  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', user.id);

  return error;
}
