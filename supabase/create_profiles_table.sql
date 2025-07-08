create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  avatar_url text,
  nickname text,
  birthdate date,
  gender text,
  location text
);
