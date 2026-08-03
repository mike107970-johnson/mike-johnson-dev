-- Additive News/Blogs preferences and bookmarks. Test against staging first.
create table if not exists public.user_topic_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  topics text[] not null default '{}',
  hidden_publishers text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.content_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  source_type text not null check(source_type in ('footballvows','external')),
  title text not null,
  url text not null check(url like 'https://%'),
  created_at timestamptz not null default now(),
  primary key(user_id,content_id)
);
alter table public.user_topic_preferences enable row level security;
alter table public.content_bookmarks enable row level security;
create policy "topic preferences owned" on public.user_topic_preferences for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "content bookmarks owned" on public.content_bookmarks for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
