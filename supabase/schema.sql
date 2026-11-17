create extension if not exists pgcrypto;
create table if not exists public.notes(id uuid primary key default gen_random_uuid(),author text not null default 'a stranger' check(char_length(author) between 1 and 30),category text not null default 'thought' check(category in('thought','question','kindness','recommendation','random')),content text not null check(char_length(content) between 1 and 600),created_at timestamptz not null default now());
create table if not exists public.replies(id uuid primary key default gen_random_uuid(),note_id uuid not null references public.notes(id) on delete cascade,author text not null default 'a stranger',content text not null check(char_length(content) between 1 and 500),created_at timestamptz not null default now());
create table if not exists public.reactions(id uuid primary key default gen_random_uuid(),note_id uuid not null references public.notes(id) on delete cascade,visitor_id text not null,created_at timestamptz not null default now(),unique(note_id,visitor_id));
create table if not exists public.reports(id uuid primary key default gen_random_uuid(),note_id uuid not null references public.notes(id) on delete cascade,reason text not null,created_at timestamptz not null default now());
alter table public.notes enable row level security; alter table public.replies enable row level security; alter table public.reactions enable row level security; alter table public.reports enable row level security;
create policy "public read notes" on public.notes for select to anon,authenticated using(true); create policy "public add notes" on public.notes for insert to anon,authenticated with check(true);
create policy "public read replies" on public.replies for select to anon,authenticated using(true); create policy "public add replies" on public.replies for insert to anon,authenticated with check(true);
create policy "public read reactions" on public.reactions for select to anon,authenticated using(true); create policy "public add reactions" on public.reactions for insert to anon,authenticated with check(true); create policy "public remove reactions" on public.reactions for delete to anon,authenticated using(true);
create policy "public report" on public.reports for insert to anon,authenticated with check(true);
alter publication supabase_realtime add table public.notes; alter publication supabase_realtime add table public.replies; alter publication supabase_realtime add table public.reactions;
create index if not exists replies_note_id_idx on public.replies(note_id);

-- Owner-only deletion RPCs (also available as a migration for existing projects).
-- Owner-only note deletion for the public, account-free wall.
-- Run this once in the Supabase SQL Editor for an existing project.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.note_delete_keys (
  note_id uuid primary key references public.notes(id) on delete cascade,
  token_hash text not null
);
alter table private.note_delete_keys enable row level security;
revoke all on private.note_delete_keys from public, anon, authenticated;

create or replace function public.create_note_with_owner(
  p_author text,
  p_category text,
  p_content text,
  p_owner_token text
)
returns public.notes
language plpgsql
security definer
set search_path = public, extensions, private, pg_temp
as $$
declare
  created_note public.notes;
begin
  if p_owner_token is null or length(p_owner_token) < 64 then
    raise exception 'A valid owner token is required';
  end if;

  insert into public.notes(author, category, content)
  values (coalesce(nullif(trim(p_author), ''), 'a stranger'), p_category, p_content)
  returning * into created_note;

  insert into private.note_delete_keys(note_id, token_hash)
  values (
    created_note.id,
    encode(digest(convert_to(p_owner_token, 'UTF8'), 'sha256'), 'hex')
  );

  return created_note;
end;
$$;

create or replace function public.delete_own_note(p_note_id uuid, p_owner_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, private, pg_temp
as $$
declare
  removed_count integer;
begin
  if p_owner_token is null then
    return false;
  end if;

  delete from public.notes n
  using private.note_delete_keys k
  where n.id = p_note_id
    and k.note_id = n.id
    and k.token_hash = encode(digest(convert_to(p_owner_token, 'UTF8'), 'sha256'), 'hex');

  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

revoke all on function public.create_note_with_owner(text, text, text, text) from public;
revoke all on function public.delete_own_note(uuid, text) from public;
grant execute on function public.create_note_with_owner(text, text, text, text) to anon, authenticated;
grant execute on function public.delete_own_note(uuid, text) to anon, authenticated;
