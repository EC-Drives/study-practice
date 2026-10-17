-- Study Practice v2: storage for her working (the stylus area under each question).
--
-- Run after 20261017000100_linked_accounts.sql (it uses public.is_student() and
-- public.can_read_student_folder()). Paste into the SQL editor and press Run.
--
-- Bucket "working" is PRIVATE: images are never reachable by a public link.
-- Each image lives at  <student id>/<session id>/<question id>.png
--   * the student may add and replace images only inside her own folder;
--   * the student and her linked parent may read them;
--   * nobody can delete through the app.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('working', 'working', false, 524288, array['image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy working_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'working'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_student()
  );

-- needed for "replace if it is already there" (an upload retried after a lost connection)
create policy working_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'working'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'working'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_student()
  );

create policy working_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'working'
    and public.can_read_student_folder((storage.foldername(name))[1])
  );
