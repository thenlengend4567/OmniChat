-- Enable UUID-OSSP extension for generating UUIDs
create extension if not exists "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. TABLES DEFINITION
--------------------------------------------------------------------------------

-- Public Users Profiles table (mapped to Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  status text default 'offline'::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint username_length check (char_length(username) >= 3),
  constraint status_values check (status in ('online', 'offline', 'away', 'busy'))
);

-- Channels table
create table public.channels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  is_private boolean default false not null,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint channel_name_length check (char_length(name) >= 1)
);

-- Channel Members (junction table for channel membership)
create table public.channel_members (
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text default 'member'::text not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,

  primary key (channel_id, user_id),
  constraint valid_role check (role in ('member', 'admin', 'moderator'))
);

-- Messages table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  attachments jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint message_content_length check (char_length(content) >= 1 or jsonb_array_length(attachments) > 0)
);

--------------------------------------------------------------------------------
-- 2. HELPER SECURITY DEFINER FUNCTIONS (Prevents Policy Recursion)
--------------------------------------------------------------------------------

-- Helper to check if a user is a member of a channel without triggering recursion
create or replace function public.is_channel_member(channel_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.channel_members
    where channel_members.channel_id = is_channel_member.channel_id
    and channel_members.user_id = is_channel_member.user_id
  );
end;
$$ language plpgsql security definer stable;

-- Helper to check if a user is an admin/moderator of a channel without triggering recursion
create or replace function public.is_channel_admin(channel_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.channel_members
    where channel_members.channel_id = is_channel_admin.channel_id
    and channel_members.user_id = is_channel_admin.user_id
    and channel_members.role in ('admin', 'moderator')
  );
end;
$$ language plpgsql security definer stable;

--------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Enable Row Level Security on all tables
alter table public.users enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;

-- ==========================================
-- USERS TABLE POLICIES
-- ==========================================

create policy "Users profiles are viewable by all authenticated users"
  on public.users
  for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ==========================================
-- CHANNELS TABLE POLICIES
-- ==========================================

create policy "Channels are viewable by public channels or members."
  on public.channels
  for select
  to authenticated
  using (
    is_private = false
    or public.is_channel_member(id, auth.uid())
  );

create policy "Any authenticated user can create a channel."
  on public.channels
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Channel creators can update their channels."
  on public.channels
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Channel creators can delete their channels."
  on public.channels
  for delete
  to authenticated
  using (auth.uid() = created_by);

-- ==========================================
-- CHANNEL MEMBERS TABLE POLICIES
-- ==========================================

create policy "Channel memberships are viewable by channel members or public channels."
  on public.channel_members
  for select
  to authenticated
  using (
    exists (
      select 1 from public.channels
      where channels.id = channel_members.channel_id
      and channels.is_private = false
    )
    or public.is_channel_member(channel_id, auth.uid())
  );

create policy "Users can join public channels or be added by channel admins."
  on public.channel_members
  for insert
  to authenticated
  with check (
    -- A user can join a public channel themselves
    (
      auth.uid() = user_id
      and exists (
        select 1 from public.channels
        where channels.id = channel_members.channel_id
        and channels.is_private = false
      )
    )
    -- Or a channel admin/moderator can invite/add them
    or public.is_channel_admin(channel_id, auth.uid())
  );

create policy "Admins can update membership roles."
  on public.channel_members
  for update
  to authenticated
  using (public.is_channel_admin(channel_id, auth.uid()))
  with check (public.is_channel_admin(channel_id, auth.uid()));

create policy "Users can leave channels or admins can remove members."
  on public.channel_members
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_channel_admin(channel_id, auth.uid())
  );

-- ==========================================
-- MESSAGES TABLE POLICIES
-- ==========================================

create policy "Messages are viewable by channel members or public channels."
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.channels
      where channels.id = messages.channel_id
      and channels.is_private = false
    )
    or public.is_channel_member(channel_id, auth.uid())
  );

create policy "Messages can be posted by channel members or public channels."
  on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.channels
        where channels.id = messages.channel_id
        and channels.is_private = false
      )
      or public.is_channel_member(channel_id, auth.uid())
    )
  );

create policy "Messages can be updated by their author."
  on public.messages
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Messages can be deleted by their author."
  on public.messages
  for delete
  to authenticated
  using (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 4. DATABASE TRIGGERS
--------------------------------------------------------------------------------

-- Trigger function to automatically update `updated_at` timestamp on updates
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure public.update_updated_at_column();

create trigger update_channels_updated_at
  before update on public.channels
  for each row execute procedure public.update_updated_at_column();

create trigger update_messages_updated_at
  before update on public.messages
  for each row execute procedure public.update_updated_at_column();

-- Trigger function to automatically add the channel creator as an admin member
create or replace function public.handle_new_channel()
returns trigger as $$
begin
  insert into public.channel_members (channel_id, user_id, role)
  values (new.id, coalesce(new.created_by, auth.uid()), 'admin');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_channel_created
  after insert on public.channels
  for each row execute procedure public.handle_new_channel();

-- Trigger function to sync auth.users inserts into public.users profiles
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_username text;
  temp_username text;
  i integer := 0;
begin
  -- Generate a starting username based on metadata, email prefix, or fallback
  default_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'user_' || substring(new.id::text from 1 for 8)
  );
  
  -- Sanitize username (alphanumeric and underscores)
  default_username := regexp_replace(default_username, '[^a-zA-Z0-9_]', '', 'g');
  if default_username = '' then
    default_username := 'user_' || substring(new.id::text from 1 for 8);
  end if;

  temp_username := default_username;
  
  -- Handle potential username collision by appending an incrementing suffix
  while exists (select 1 from public.users where username = temp_username) loop
    i := i + 1;
    temp_username := default_username || i::text;
  end loop;

  insert into public.users (id, username, display_name, avatar_url, status)
  values (
    new.id,
    temp_username,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', temp_username),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'offline'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--------------------------------------------------------------------------------
-- 5. PERFORMANCE OPTIMIZATION INDEXES
--------------------------------------------------------------------------------

-- Index for searching channels created by specific users or listing private status
create index if not exists channels_created_by_idx on public.channels(created_by);
create index if not exists channels_is_private_idx on public.channels(is_private);

-- Index for checking channel membership list for specific users (since channel_id is already first in PK index)
create index if not exists channel_members_user_id_idx on public.channel_members(user_id);

-- Highly optimized indexes for channel messaging history
create index if not exists messages_channel_created_at_idx on public.messages(channel_id, created_at desc);
create index if not exists messages_user_id_idx on public.messages(user_id);
