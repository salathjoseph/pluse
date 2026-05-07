
-- Digital Well-Being & Detox Support Platform
-- Production PostgreSQL Schema (Supabase)

-- Extensions
create extension if not exists "uuid-ossp";

-- 1. Users Profile (Extends Auth.Users)
create table public.users_profile (
    id uuid references auth.users on delete cascade primary key,
    email text not null,
    encrypted_name text, -- AES-256 Encrypted
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users_profile enable row level security;
create policy "Users can view own profile" on public.users_profile for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users_profile for update using (auth.uid() = id);

-- 2. Chat Sessions
create table public.chat_sessions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    ended_at timestamp with time zone
);

alter table public.chat_sessions enable row level security;
create policy "Users can manage own sessions" on public.chat_sessions for all using (auth.uid() = user_id);

-- 3. Chat Messages (Encrypted Storage)
create table public.chat_messages (
    id uuid default uuid_generate_v4() primary key,
    session_id uuid references public.chat_sessions on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    sender text check (sender in ('user', 'bot')) not null,
    encrypted_message text not null, -- AES-256 Encrypted GCM
    mood text,
    habit_type text,
    urgency_level integer default 0, -- 0-5
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;
create policy "Users can access own messages" on public.chat_messages for all using (auth.uid() = user_id);

-- 4. Habits
create table public.habits (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    habit_type text not null, -- e.g., 'Screen Time', 'Social Media', 'Mindfulness'
    baseline float8,
    target float8,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habits enable row level security;
create policy "Users can manage habits" on public.habits for all using (auth.uid() = user_id);

-- 5. Habit Logs
create table public.habit_logs (
    id uuid default uuid_generate_v4() primary key,
    habit_id uuid references public.habits on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    log_value float8 not null,
    log_date date default current_date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habit_logs enable row level security;
create policy "Users can manage habit logs" on public.habit_logs for all using (auth.uid() = user_id);

-- 6. Well-being Logs
create table public.wellbeing_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    mood text not null,
    stress_score integer check (stress_score >= 1 and stress_score <= 10),
    encrypted_notes text, -- AES-256 Encrypted
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wellbeing_logs enable row level security;
create policy "Users can manage wellbeing logs" on public.wellbeing_logs for all using (auth.uid() = user_id);
