-- Private bucket for InBody reports and other uploads. Files live under {trainee_id}/...
-- Coaches reach their trainees' folders; trainees reach only their own folder.

insert into storage.buckets (id, name, public, file_size_limit)
values ('inbody', 'inbody', false, 20971520) -- 20 MB
on conflict (id) do nothing;

create policy inbody_read on storage.objects for select to authenticated
  using (bucket_id = 'inbody' and public.can_read_trainee(((storage.foldername(name))[1])::uuid));

create policy inbody_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'inbody' and public.can_read_trainee(((storage.foldername(name))[1])::uuid));

create policy inbody_coach_delete on storage.objects for delete to authenticated
  using (bucket_id = 'inbody' and public.owns_trainee(((storage.foldername(name))[1])::uuid));
