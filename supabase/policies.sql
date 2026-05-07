drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage own preferences" on public.user_preferences;

create policy "Users can manage own preferences"
on public.user_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read tags" on public.tags;
drop policy if exists "Users can insert tags" on public.tags;

create policy "Users can read tags"
on public.tags
for select
to authenticated
using (true);

create policy "Users can insert tags"
on public.tags
for insert
to authenticated
with check (true);

drop policy if exists "Users can manage own user tags" on public.user_tags;

create policy "Users can manage own user tags"
on public.user_tags
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own queue rows" on public.match_queue;

create policy "Users can manage own queue rows"
on public.match_queue
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own sessions" on public.chat_sessions;
drop policy if exists "Users can insert own sessions" on public.chat_sessions;
drop policy if exists "Users can update own sessions" on public.chat_sessions;

create policy "Users can read own sessions"
on public.chat_sessions
for select
to authenticated
using (auth.uid() = user_1_id or auth.uid() = user_2_id);

create policy "Users can insert own sessions"
on public.chat_sessions
for insert
to authenticated
with check (auth.uid() = user_1_id or auth.uid() = user_2_id);

create policy "Users can update own sessions"
on public.chat_sessions
for update
to authenticated
using (auth.uid() = user_1_id or auth.uid() = user_2_id)
with check (auth.uid() = user_1_id or auth.uid() = user_2_id);

drop policy if exists "Users can manage own history" on public.chat_history;

create policy "Users can manage own history"
on public.chat_history
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own pings" on public.pings;
drop policy if exists "Users can insert own sent pings" on public.pings;
drop policy if exists "Users can update received pings" on public.pings;

create policy "Users can read own pings"
on public.pings
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert own sent pings"
on public.pings
for insert
to authenticated
with check (auth.uid() = sender_id);

create policy "Users can update received pings"
on public.pings
for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

drop policy if exists "Users can read own messages" on public.messages;
drop policy if exists "Users can insert own messages" on public.messages;
drop policy if exists "Users can update received messages" on public.messages;

create policy "Users can read own messages"
on public.messages
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert own messages"
on public.messages
for insert
to authenticated
with check (auth.uid() = sender_id);

create policy "Users can update received messages"
on public.messages
for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

drop policy if exists "Users can manage own blocks" on public.blocked_users;

create policy "Users can manage own blocks"
on public.blocked_users
for all
to authenticated
using (auth.uid() = blocker_id)
with check (auth.uid() = blocker_id);

drop policy if exists "Users can create reports" on public.reports;
drop policy if exists "Users can read own reports" on public.reports;

create policy "Users can create reports"
on public.reports
for insert
to authenticated
with check (auth.uid() = reporter_id);

create policy "Users can read own reports"
on public.reports
for select
to authenticated
using (auth.uid() = reporter_id);

drop policy if exists "Users can manage own ad impressions" on public.ad_impressions;

create policy "Users can manage own ad impressions"
on public.ad_impressions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);