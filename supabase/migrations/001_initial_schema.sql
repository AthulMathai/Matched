create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  country text,
  language text,
  date_of_birth date,
  age_verified boolean default false,
  is_banned boolean default false,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_gender text check (preferred_gender in ('male', 'female', 'any')) default 'any',
  preferred_country text default 'global',
  preferred_language text default 'any',
  allow_global boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.tags (
  id bigserial primary key,
  name text unique not null
);

create table if not exists public.user_tags (
  user_id uuid references public.profiles(id) on delete cascade,
  tag_id bigint references public.tags(id) on delete cascade,
  primary key (user_id, tag_id)
);

create table if not exists public.match_queue (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  preferred_gender text,
  preferred_country text,
  preferred_language text,
  status text check (status in ('waiting', 'matched', 'cancelled')) default 'waiting',
  created_at timestamptz default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_1_id uuid references public.profiles(id) on delete cascade,
  user_2_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('active', 'ended', 'reported')) default 'active',
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds integer,
  ended_reason text,
  created_at timestamptz default now()
);

create table if not exists public.chat_history (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  other_user_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete cascade,
  duration_seconds integer not null,
  is_hidden boolean default false,
  created_at timestamptz default now(),
  unique(user_id, other_user_id, session_id)
);

create table if not exists public.pings (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  status text check (status in ('pending', 'accepted', 'ignored', 'blocked')) default 'pending',
  preset_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  ping_id uuid references public.pings(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.blocked_users (
  id bigserial primary key,
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_user_id uuid references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  reason text not null,
  notes text,
  status text check (status in ('open', 'reviewing', 'resolved', 'dismissed')) default 'open',
  created_at timestamptz default now()
);

create table if not exists public.ad_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  placement text not null,
  watched_seconds integer default 0,
  completed boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_match_queue_status_created
on public.match_queue(status, created_at);

create index if not exists idx_chat_sessions_user_1_status
on public.chat_sessions(user_1_id, status);

create index if not exists idx_chat_sessions_user_2_status
on public.chat_sessions(user_2_id, status);

create index if not exists idx_chat_history_user
on public.chat_history(user_id, created_at desc);

create index if not exists idx_pings_receiver
on public.pings(receiver_id, created_at desc);

create index if not exists idx_pings_sender
on public.pings(sender_id, created_at desc);

create index if not exists idx_messages_ping
on public.messages(ping_id, created_at);

create index if not exists idx_reports_status
on public.reports(status, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.tags enable row level security;
alter table public.user_tags enable row level security;
alter table public.match_queue enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_history enable row level security;
alter table public.pings enable row level security;
alter table public.messages enable row level security;
alter table public.blocked_users enable row level security;
alter table public.reports enable row level security;
alter table public.ad_impressions enable row level security;