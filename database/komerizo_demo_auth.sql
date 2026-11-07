-- Komerizo-only schema. Does not modify Turismo tables, triggers or Auth settings.
begin;
create table public.komerizo_tipo_documento (id bigint generated always as identity primary key, nombre text not null unique, abreviatura text not null unique, created_at timestamptz default now());
create table public.komerizo_comunas (id bigint generated always as identity primary key, nombre text not null unique, created_at timestamptz default now());
create table public.komerizo_barrios (id bigint generated always as identity primary key, nombre text not null, comuna_id bigint not null references public.komerizo_comunas(id), created_at timestamptz default now(), unique(nombre,comuna_id));
create table public.komerizo_roles (id bigint generated always as identity primary key, nombre text not null unique, descripcion text, created_at timestamptz default now());
create table public.komerizo_comisiones (id bigint generated always as identity primary key, nombre text not null unique, descripcion text, created_at timestamptz default now());
create table public.komerizo_usuarios (
 id bigint generated always as identity primary key,
 auth_user_id uuid unique references auth.users(id) on delete set null,
 cc varchar(20) not null unique, tipo_documento_id bigint not null references public.komerizo_tipo_documento(id),
 nombre text not null, apellido text not null, correo_electronico text not null unique,
 telefono text, direccion text, comuna_id bigint references public.komerizo_comunas(id), barrio_id bigint references public.komerizo_barrios(id), jac text,
 fecha_nacimiento date, comision_trabajo_id bigint references public.komerizo_comisiones(id), fecha_inscripcion timestamptz default now(),
 constancia_no_pertenecer_otra_jac boolean default false, estado text not null default 'activo' check(estado in ('activo','inactivo','suspendido')),
 novedades text, observaciones text, firma boolean default false, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.komerizo_usuario_roles (id bigint generated always as identity primary key, usuario_id bigint not null references public.komerizo_usuarios(id) on delete cascade, rol_id bigint not null references public.komerizo_roles(id), assigned_at timestamptz default now(), unique(usuario_id,rol_id));
create table public.komerizo_reuniones (
 id bigint generated always as identity primary key, creador_id bigint not null references public.komerizo_usuarios(id),
 titulo text not null check(length(trim(titulo))>0), descripcion text not null, tipo_reunion text not null, lugar text,
 fecha_reunion date not null, hora_inicio time, hora_fin time, estado text default 'pendiente', es_obligatoria boolean default false, requiere_confirmacion boolean default true,
 comuna_id bigint references public.komerizo_comunas(id), barrio_id bigint references public.komerizo_barrios(id), roles_invitados jsonb not null default '[]',
 fecha_creacion timestamptz default now(), fecha_actualizacion timestamptz default now(), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.komerizo_reuniones_confirmaciones (id bigint generated always as identity primary key, reunion_id bigint not null references public.komerizo_reuniones(id) on delete cascade, usuario_id bigint not null references public.komerizo_usuarios(id), estado_confirmacion text default 'sin_responder', observaciones text, fecha_confirmacion timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(), unique(reunion_id,usuario_id));
create table public.komerizo_solicitud_informes (id bigint generated always as identity primary key, usuario_id bigint not null references public.komerizo_usuarios(id), destinatario_rol_id bigint not null references public.komerizo_roles(id), estado text default 'Pendiente', mensaje_solicitud text not null, mensaje_respuesta text, fecha_solicitud timestamptz default now(), fecha_respuesta timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());

-- Non-exposed helper avoids policy recursion. Its only subject is the authenticated UID.
create schema if not exists komerizo_private;
revoke all on schema komerizo_private from public, anon;
grant usage on schema komerizo_private to authenticated;
create function komerizo_private.identity() returns table(usuario_id bigint,barrio_id bigint,comuna_id bigint,roles text[])
language sql stable security definer set search_path='' as $$
 select u.id,u.barrio_id,u.comuna_id,coalesce(array_agg(r.nombre) filter(where r.nombre is not null),'{}'::text[])
 from public.komerizo_usuarios u left join public.komerizo_usuario_roles ur on ur.usuario_id=u.id left join public.komerizo_roles r on r.id=ur.rol_id
 where u.auth_user_id=(select auth.uid()) and u.estado='activo' and (select auth.uid()) is not null group by u.id
$$;
revoke all on function komerizo_private.identity() from public,anon;
grant execute on function komerizo_private.identity() to authenticated;

do $$ declare t text; begin
 foreach t in array array['komerizo_tipo_documento','komerizo_comunas','komerizo_barrios','komerizo_roles','komerizo_comisiones','komerizo_usuarios','komerizo_usuario_roles','komerizo_reuniones','komerizo_reuniones_confirmaciones','komerizo_solicitud_informes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['komerizo_tipo_documento','komerizo_comunas','komerizo_barrios','komerizo_roles','komerizo_comisiones'] loop
  execute format('create policy member_read on public.%I for select to authenticated using (exists(select 1 from komerizo_private.identity() i where cardinality(i.roles)>0))',t);
  execute format('grant insert,update,delete on public.%I to authenticated',t);
  execute format('create policy admin_write on public.%I for all to authenticated using (exists(select 1 from komerizo_private.identity() i where ''Administrador''=any(i.roles))) with check (exists(select 1 from komerizo_private.identity() i where ''Administrador''=any(i.roles)))',t);
 end loop;
end $$;
grant usage,select on sequence public.komerizo_tipo_documento_id_seq,public.komerizo_comunas_id_seq,public.komerizo_barrios_id_seq,public.komerizo_roles_id_seq,public.komerizo_comisiones_id_seq,public.komerizo_usuarios_id_seq,public.komerizo_usuario_roles_id_seq,public.komerizo_reuniones_id_seq,public.komerizo_reuniones_confirmaciones_id_seq,public.komerizo_solicitud_informes_id_seq to authenticated,service_role;
create policy profiles_read on public.komerizo_usuarios for select to authenticated using (
 auth_user_id=(select auth.uid()) or exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or (i.barrio_id=komerizo_usuarios.barrio_id and i.roles && array['Secretario','Presidente'])));
-- Browser edits never modify auth_user_id or credentials. Linking requires Auth Admin.
grant insert(cc,tipo_documento_id,nombre,apellido,correo_electronico,telefono,direccion,comuna_id,barrio_id,jac,estado,observaciones), update(cc,tipo_documento_id,nombre,apellido,telefono,direccion,comuna_id,barrio_id,jac,estado,observaciones,firma) on public.komerizo_usuarios to authenticated;
create policy profiles_insert on public.komerizo_usuarios for insert to authenticated with check (
 auth_user_id is null and exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and i.barrio_id=komerizo_usuarios.barrio_id and i.comuna_id=komerizo_usuarios.comuna_id)));
create policy profiles_update on public.komerizo_usuarios for update to authenticated using (
 exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and i.barrio_id=komerizo_usuarios.barrio_id))) with check (
 exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and i.barrio_id=komerizo_usuarios.barrio_id and i.comuna_id=komerizo_usuarios.comuna_id)));
create policy user_roles_read on public.komerizo_usuario_roles for select to authenticated using (exists(select 1 from komerizo_private.identity() i where i.usuario_id=komerizo_usuario_roles.usuario_id or 'Administrador'=any(i.roles)));
grant insert,update,delete on public.komerizo_usuario_roles to authenticated;
create policy admin_roles on public.komerizo_usuario_roles for all to authenticated using(exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles))) with check(exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles)));
create policy meetings_read on public.komerizo_reuniones for select to authenticated using(exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or (i.barrio_id=komerizo_reuniones.barrio_id and cardinality(i.roles)>0)));
grant insert,update,delete on public.komerizo_reuniones to authenticated;
create policy meetings_insert on public.komerizo_reuniones for insert to authenticated with check(exists(select 1 from komerizo_private.identity() i where creador_id=i.usuario_id and ('Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and i.barrio_id=komerizo_reuniones.barrio_id and i.comuna_id=komerizo_reuniones.comuna_id))));
create policy meetings_update on public.komerizo_reuniones for update to authenticated using(exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and creador_id=i.usuario_id and i.barrio_id=komerizo_reuniones.barrio_id))) with check(exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles) or ('Secretario'=any(i.roles) and creador_id=i.usuario_id and i.barrio_id=komerizo_reuniones.barrio_id and i.comuna_id=komerizo_reuniones.comuna_id)));
create policy meetings_delete on public.komerizo_reuniones for delete to authenticated using(exists(select 1 from komerizo_private.identity() i where 'Administrador'=any(i.roles)));
grant insert,update on public.komerizo_reuniones_confirmaciones to authenticated;
create policy confirmations_read on public.komerizo_reuniones_confirmaciones for select to authenticated using(exists(select 1 from public.komerizo_reuniones r where r.id=reunion_id));
create policy confirmations_insert on public.komerizo_reuniones_confirmaciones for insert to authenticated with check(exists(select 1 from komerizo_private.identity() i where i.usuario_id=komerizo_reuniones_confirmaciones.usuario_id) and exists(select 1 from public.komerizo_reuniones r where r.id=reunion_id));
create policy confirmations_update on public.komerizo_reuniones_confirmaciones for update to authenticated using(exists(select 1 from komerizo_private.identity() i where i.usuario_id=komerizo_reuniones_confirmaciones.usuario_id)) with check(exists(select 1 from komerizo_private.identity() i where i.usuario_id=komerizo_reuniones_confirmaciones.usuario_id) and exists(select 1 from public.komerizo_reuniones r where r.id=reunion_id));
create policy requests_read on public.komerizo_solicitud_informes for select to authenticated using(exists(select 1 from komerizo_private.identity() i where i.usuario_id=komerizo_solicitud_informes.usuario_id or 'Administrador'=any(i.roles)));
commit;
