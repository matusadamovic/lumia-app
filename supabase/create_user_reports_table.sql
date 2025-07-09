create table if not exists user_reports (
  id text primary key,
  count integer not null default 0
);

alter table user_reports enable row level security;

create policy "Allow service role" on user_reports
  for all using (auth.role() = 'service_role');
