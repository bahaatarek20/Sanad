-- ====================================================================
-- مخطط قاعدة البيانات الشامل والتنفيذي لمنصة «سَنَد» (Sanad Database Schema)
-- انسخ محتوى هذا الملف والصقه بالكامل في Supabase SQL Editor ثم اضغط Run
-- ====================================================================

-- 1. جدول ملفات الطلاب وشريان الحماسة (Student Profiles & Streaks)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  daily_goal_minutes integer default 20,
  current_streak integer default 1,
  total_study_minutes integer default 0,
  last_study_date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. جدول الفوائد الدائمة والكشكول (Perpetual Notes Engine)
create table if not exists public.student_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  course_slug text not null,
  lesson_index integer default 1,
  title text not null default 'فائدة في المتن',
  content text not null,
  video_timestamp_seconds integer default 0,
  tags text[] default array['فائدة']::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. جدول متابعة وضبط المتون المنجزة (Course Completion Progress)
create table if not exists public.student_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  course_slug text not null,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, course_slug)
);

-- 4. جدول مجلس المذاكرة العام المجهول (Anonymous Community Posts)
create table if not exists public.community_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  anonymous_alias text not null,
  course_slug text,
  post_type text check (post_type in ('question', 'summary', 'benefit')) default 'benefit',
  content text not null,
  attachment_url text,
  upvotes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. جدول الردود العلمية على منشورات المجلس (Community Replies)
create table if not exists public.community_replies (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.community_posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  anonymous_alias text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ====================================================================
-- تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
-- ====================================================================
alter table public.profiles enable row level security;
alter table public.student_notes enable row level security;
alter table public.student_progress enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;

-- سياسات البروفايل
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- سياسات كشكول الفوائد الدائم
drop policy if exists "Users can manage own notes" on public.student_notes;
create policy "Users can manage own notes" on public.student_notes for all using (auth.uid() = user_id);

-- سياسات تقدم الطالب
drop policy if exists "Users can manage own progress" on public.student_progress;
create policy "Users can manage own progress" on public.student_progress for all using (auth.uid() = user_id);

-- سياسات مجلس المذاكرة العام (قراءة عامة للجميع، والإضافة للمسجلين)
drop policy if exists "Anyone can read community posts" on public.community_posts;
create policy "Anyone can read community posts" on public.community_posts for select using (true);

drop policy if exists "Users can insert community posts" on public.community_posts;
create policy "Users can insert community posts" on public.community_posts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own community posts" on public.community_posts;
create policy "Users can update own community posts" on public.community_posts for update using (auth.uid() = user_id);

drop policy if exists "Anyone can read community replies" on public.community_replies;
create policy "Anyone can read community replies" on public.community_replies for select using (true);

drop policy if exists "Users can insert community replies" on public.community_replies;
create policy "Users can insert community replies" on public.community_replies for insert with check (auth.uid() = user_id);

-- ====================================================================
-- الإجراءات المخزنة والدوال (Stored Procedures & Triggers)
-- ====================================================================

-- 1. دالة تحديث شريان الحماسة والتتابع اليومي (Update Study Streak)
create or replace function public.update_student_streak(p_user_id uuid)
returns void as $$
declare
  v_last_date date;
  v_current_streak integer;
begin
  select last_study_date, current_streak into v_last_date, v_current_streak
  from public.profiles where id = p_user_id;

  if v_last_date is null then
    update public.profiles set current_streak = 1, last_study_date = current_date where id = p_user_id;
  elsif v_last_date = current_date then
    -- تم تسجيل نشاط اليوم بالفعل
    null;
  elsif v_last_date = current_date - 1 then
    update public.profiles set current_streak = coalesce(v_current_streak, 0) + 1, last_study_date = current_date where id = p_user_id;
  else
    -- انقطاع لأكثر من يوم
    update public.profiles set current_streak = 1, last_study_date = current_date where id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- 2. دالة زيادة إعجاب المشاركة في مجلس المذاكرة (Increment Post Upvotes)
create or replace function public.increment_post_upvotes(post_id_arg uuid)
returns void as $$
begin
  update public.community_posts
  set upvotes_count = coalesce(upvotes_count, 0) + 1
  where id = post_id_arg;
end;
$$ language plpgsql security definer;

-- 3. دالة إنشاء ملف الطالب تلقائياً عند التسجيل في المنصة (Auto-create profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, current_streak, last_study_date)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'طالب علم'), 1, current_date)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ====================================================================
-- ترحيل البيانات: إضافة الأعمدة الناقصة لقواعد البيانات الموجودة
-- (آمن للتشغيل في أي وقت — لا يؤثر على البيانات الموجودة)
-- ====================================================================

-- إضافة عمود إجمالي دقائق المدارسة إذا لم يكن موجوداً
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'total_study_minutes'
  ) then
    alter table public.profiles add column total_study_minutes integer default 0;
  end if;
end $$;

-- 4. دالة تحديث دقائق المدارسة الفعلية (تُستدعى من الخادم دورياً)
create or replace function public.add_study_minutes(p_user_id uuid, p_minutes integer)
returns void as $$
begin
  update public.profiles
  set
    total_study_minutes = coalesce(total_study_minutes, 0) + p_minutes,
    last_study_date = current_date,
    updated_at = now()
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- 5. سياسة INSERT للملفات الشخصية (مطلوبة للتسجيل)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
