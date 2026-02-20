-- Allow users to update their own profile
create policy "Profiles update own"
  on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
