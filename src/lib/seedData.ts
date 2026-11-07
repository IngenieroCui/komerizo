// Demo provisioning is deliberately private; never run an administrative seed in the browser.
export async function seedInitialData() { throw new Error('Ejecuta scripts/seed-demo.mjs desde un entorno privado.') }
export async function crearUsuarioPrueba(..._args: unknown[]) { throw new Error('Usa Supabase Auth Admin desde el seeder privado.') }
