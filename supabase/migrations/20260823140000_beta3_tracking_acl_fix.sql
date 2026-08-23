revoke all on function public.upsert_parcel_tracking_projection(uuid,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function public.generate_parcel_tracking_token(uuid,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function public.revoke_parcel_tracking_token(uuid,text,text) from public, anon, authenticated, service_role;
revoke all on function public.public_parcel_tracking(uuid) from public, anon, authenticated, service_role;
grant execute on function public.upsert_parcel_tracking_projection(uuid,text,text,text,text) to authenticated;
grant execute on function public.generate_parcel_tracking_token(uuid,text,text,text,text) to authenticated;
grant execute on function public.revoke_parcel_tracking_token(uuid,text,text) to authenticated;
grant execute on function public.public_parcel_tracking(uuid) to anon,authenticated;
