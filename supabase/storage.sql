-- Tally: private storage for note photos and PDFs. Run once in Supabase > SQL Editor.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800)
on conflict (id) do nothing;

-- Each signed-in person can only see and change files in their own folder.
drop policy if exists "tally own files read" on storage.objects;
drop policy if exists "tally own files add" on storage.objects;
drop policy if exists "tally own files change" on storage.objects;
drop policy if exists "tally own files delete" on storage.objects;
create policy "tally own files read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tally own files add" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tally own files change" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tally own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
