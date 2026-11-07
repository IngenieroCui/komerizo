-- Secretaries manage unlinked business records; privileged account profiles require an admin.
begin;
alter policy profiles_update on public.komerizo_usuarios using (
 exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and komerizo_usuarios.auth_user_id is null and i.barrio_id=komerizo_usuarios.barrio_id))) with check (
 exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and komerizo_usuarios.auth_user_id is null and i.barrio_id=komerizo_usuarios.barrio_id and i.comuna_id=komerizo_usuarios.comuna_id)));
commit;
