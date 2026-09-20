create bucket if not exists avatars with (public = true);
create policy "Anyone can view avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload their own avatars" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update their own avatars" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete their own avatars" on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update their own listing images" on storage.objects for update using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete their own listing images" on storage.objects for delete using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
