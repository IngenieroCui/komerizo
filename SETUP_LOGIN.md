# Autenticación de Komerizo

La aplicación usa Supabase Auth: `signInWithPassword`, `getUser`, `onAuthStateChange`, renovación y `signOut`. El login acepta correo electrónico. El alta de cuentas usa exclusivamente Supabase Auth Admin en un proceso privado.

El perfil activo se obtiene de `komerizo_usuarios` por `auth_user_id`; los roles se consultan desde `komerizo_usuario_roles` y `komerizo_roles`. RLS autoriza las operaciones. El navegador no compara contraseñas ni almacena una identidad administrativa confiable en `localStorage`. Supabase administra su propia sesión y tokens. Los valores antiguos `komerizo_user` y `userRoles` se eliminan al iniciar.

## Configuración

```env
NEXT_PUBLIC_SUPABASE_URL=https://xmmqbbgivvfcsdlvtxqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave pública del proyecto demo>
NEXT_PUBLIC_DEMO_MODE=false
```

Nunca configures una clave `service_role`/`sb_secret_` con prefijo `NEXT_PUBLIC_`. El despliegue recibe únicamente la clave pública. No ejecutes el SQL original ni guardes contraseñas en `komerizo_usuarios`.

## Provisionamiento privado

Aplica las dos migraciones Komerizo documentadas en README exclusivamente sobre `xmmqbbgivvfcsdlvtxqk`. Configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en un proceso privado; ejecuta `node scripts/seed-demo.mjs`. La instalación local autorizada usa `pwsh -File scripts/Run-PrivateSeed.ps1`.

El seeder crea/actualiza las cuentas mediante Auth Admin con correos confirmados, `app_metadata.application=komerizo` y perfiles/roles vinculados. Los metadatos editables por el usuario no autorizan operaciones. Las contraseñas se generan criptográficamente y se cifran con DPAPI en `.private/demo-credentials.dpapi`. La clave administrativa también queda cifrada localmente y fuera de Git.

Para recuperar una contraseña en la misma cuenta Windows:

```powershell
pwsh -File scripts/Copy-DemoPassword.ps1 -Email secretario@komerizo.example.com
```

El script la copia al portapapeles privado; límpialo tras pegarla en el login. También existen `admin@komerizo.example.com` y `presidente@komerizo.example.com`. El README describe recuperación por Auth Admin si se pierde el archivo privado.

## Permisos del recorrido

| Operación | Administrador | Secretario | Presidente |
| --- | --- | --- | --- |
| Recuperar perfil y roles propios | Sí | Sí | Sí |
| Consultar reuniones | Todas | Su barrio | Su barrio |
| Crear reuniones | Sí | Propias en su barrio | No |
| Modificar reuniones | Sí | Propias en su barrio | No |
| Cambiar vínculo Auth desde navegador | No | No | No |
| Administrar roles en la interfaz demo | Canal privado | No | No |

`node scripts/verify-demo.mjs` ejerce los permisos con sesiones reales, incluyendo denegaciones. Las cuentas Komerizo no provocan perfiles turísticos y el trigger existente no fue modificado.

URL: https://komerizo-demo.vercel.app. La URL principal devuelve HTTP 200 sin sesión Vercel. El dominio específico del despliegue redirige a Vercel SSO (HTTP 302), conservando la configuración existente `all_except_custom_domains`. No se generaron enlaces de bypass ni se amplió la protección.
