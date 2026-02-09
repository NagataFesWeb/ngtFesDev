-- Create a trigger function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (user_id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
