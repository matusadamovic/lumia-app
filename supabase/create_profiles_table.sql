create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  avatar_url text,
  nickname text,
  birthdate date,
  gender text,
  location text
);

alter table profiles enable row level security;

create policy "Allow profile owner insert" on profiles
  for insert with check (auth.uid() = id);

create policy "Allow profile owner select" on profiles
  for select using (auth.uid() = id);

create policy "Allow profile owner update" on profiles
  for update using (auth.uid() = id);

create policy "Avatar uploads" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.role() = 'authenticated'
  );

create policy "Avatar read" on storage.objects
  for select using (bucket_id = 'avatars');
