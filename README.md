# Komerizo · demo con Supabase Auth

Repositorio: https://github.com/IngenieroCui/komerizo

Aplicación: https://komerizo-demo.vercel.app. Su login devuelve HTTP 200 sin sesión Vercel; el dominio específico de cada despliegue conserva Vercel Authentication y redirige a SSO (HTTP 302). Se mantuvo la configuración existente `all_except_custom_domains`. Inicia sesión en la aplicación con una cuenta de evaluación.

| Correo | Rol |
| --- | --- |
| admin@komerizo.example.com | Administrador |
| secretario@komerizo.example.com | Secretario |
| presidente@komerizo.example.com | Presidente |

Las contraseñas aleatorias están cifradas con Windows DPAPI en `.private/demo-credentials.dpapi`, fuera de Git. Desde la misma cuenta Windows que ejecutó el bootstrap:

```powershell
pwsh -NoProfile -File scripts/Copy-DemoPassword.ps1 -Email secretario@komerizo.example.com
```

Pega la contraseña en el login y limpia el portapapeles (`Set-Clipboard -Value ''`). No copies credenciales en incidencias ni logs. Si pierdes el archivo o cambias de equipo, un administrador debe restablecer estas cuentas mediante Auth Admin y guardar un nuevo archivo privado.

## Recorrido

1. Inicia sesión en `/login` con el correo del secretario.
2. El panel muestra datos de su comuna/barrio. Abre **Reuniones**.
3. Consulta la asamblea ficticia. Pulsa **Nueva Reunión**, completa título, descripción y fecha; invita a Secretario y Presidente y guarda.
4. Recarga para comprobar la persistencia. El secretario puede confirmar/cancelar las reuniones que creó.
5. Cierra sesión con el botón de salida. El presidente entra en su propio panel y consulta reuniones del mismo barrio; el administrador entra en `/administrador`.

El presidente tiene consulta; secretario y administrador crean reuniones. Los permisos se verifican con RLS en PostgreSQL. Modificar almacenamiento del navegador o navegar a otra ruta no concede permisos.

## Instalación y seed

Proyecto permitido: `komerizo-demo`, referencia `xmmqbbgivvfcsdlvtxqk`.

Migraciones aplicadas: `20261107124356_komerizo_demo_auth` y `20261107125421_komerizo_demo_profile_scope`. Sus fuentes están en `database/komerizo_demo_auth.sql` y `database/komerizo_demo_profile_scope.sql`.

Diez tablas `komerizo_` con RLS: `tipo_documento`, `comunas`, `barrios`, `roles`, `comisiones`, `usuarios`, `usuario_roles`, `reuniones`, `reuniones_confirmaciones` y `solicitud_informes`. El helper `komerizo_private.identity()` está en un esquema no expuesto y consulta exclusivamente el perfil activo de `auth.uid()` y sus roles. `komerizo_usuarios.auth_user_id` referencia `auth.users`; no hay columna de contraseña.

```powershell
npm ci
# Configura .env.local según .env.example y NEXT_PUBLIC_DEMO_MODE=false.
# Proporciona SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY solo en un proceso privado.
node scripts/seed-demo.mjs
```

En esta instalación, `pwsh -File scripts/Run-PrivateSeed.ps1` recupera la clave existente desde `.private/admin-key.dpapi`, la usa en el proceso privado y retira la variable después. El seeder rechaza cualquier otra URL, usa Auth Admin y upserts. Crea tres cuentas, cinco perfiles ficticios, tres roles, un tipo documental, una comuna, un barrio, una comisión y una reunión inicial. La segunda ejecución conservó las mismas cuentas y perfiles.

Las cuentas nuevas llevan `app_metadata.application=komerizo`. El trigger existente de Turismo filtra `turismo-cajamarca`; no fue modificado. Verificado: tres perfiles turísticos antes/después y cero perfiles Komerizo en Turismo. No se modificaron sus tablas ni datos.

**No ejecutes los SQL heredados** (`database/schema.sql`, `insert_test_user.sql` y workflows secundarios). Son referencias históricas, no la instalación segura de esta demo. El antiguo seeder del navegador está desactivado.

## Verificación y alcance

`npm run build` y TypeScript pasaron. `node scripts/verify-demo.mjs` verifica login, renovación y salida de los tres roles; escritura/actualización del secretario; lectura persistida por el presidente; rechazo de promoción a Administrador y de modificación del vínculo Auth (`42501`); rechazo de lectura anónima. El informe sin secretos queda en `.private/verification.json`.

El flujo principal habilitado es autenticación, paneles, consultas de personas/catálogos y reuniones. Los módulos financieros, ventas, inventario, salón, informes y trámites extensos conservan pantallas heredadas y **no se consideran implementados ni verificados** en esta demo; no se instalaron sus esquemas incompletos. El alta de cuentas y asignación de roles de la demo se realizan por el canal administrativo privado; el formulario de personas administra registros de negocio.

El navegador recibe solo URL y clave pública de Supabase. Nunca se configura la clave administrativa en `NEXT_PUBLIC_*`. No se habilitó registro público ni Google desde la aplicación. Para publicar la URL, el propietario debe cambiar explícitamente Deployment Protection en Vercel; no se generaron enlaces de bypass.

Verificación en producción: login del secretario, consulta de las tres reuniones, actualización de la reunión ID 3 a `confirmada` desde la interfaz y cierre de sesión. La reunión fue creada desde el formulario y comprobada tras recargar; se corrigió la captura de fecha y su visualización local. Los tres paneles de rol también se verificaron en navegador.
