export const DEMO_REF = 'xmmqbbgivvfcsdlvtxqk'
export const demoAccounts = [
  { email: 'admin@komerizo.example.com', role: 'Administrador', nombre: 'Ana', apellido: 'Demo', cc: 'DEMO-K001' },
  { email: 'secretario@komerizo.example.com', role: 'Secretario', nombre: 'Samuel', apellido: 'Demo', cc: 'DEMO-K002' },
  { email: 'presidente@komerizo.example.com', role: 'Presidente', nombre: 'Paula', apellido: 'Demo', cc: 'DEMO-K003' },
]
function checked(result) { if (result.error) throw new Error(result.error.message); return result.data }
async function upsert(db, table, value, conflict) {
  return checked(await db.from(table).upsert(value, { onConflict: conflict }).select().single())
}
export async function seedDemo(db, accounts) {
  if (accounts.length !== 3 || accounts.some(a => !demoAccounts.some(d => d.email === a.email) || typeof a.password !== 'string' || a.password.length < 20)) throw new Error('Invalid private demo account input')
  const document = await upsert(db, 'komerizo_tipo_documento', {nombre:'Documento de demostración',abreviatura:'DEMO'}, 'nombre')
  const comuna = await upsert(db, 'komerizo_comunas', {nombre:'Comuna Demo Komerizo'}, 'nombre')
  const barrio = await upsert(db, 'komerizo_barrios', {nombre:'Barrio Semillas Demo',comuna_id:comuna.id}, 'nombre,comuna_id')
  await upsert(db, 'komerizo_comisiones', {nombre:'Comisión Ambiental Demo',descripcion:'Información ficticia de evaluación'}, 'nombre')
  const existing = []
  for (let page=1;;page++) {
    const result = await db.auth.admin.listUsers({ page, perPage: 100 })
    checked(result); existing.push(...result.data.users)
    if (result.data.users.length < 100) break
  }
  const profiles = []
  for (const spec of demoAccounts) {
    const password = accounts.find(a=>a.email===spec.email).password
    let authUser = existing.find(u=>u.email===spec.email)
    if (authUser && authUser.app_metadata.application !== 'komerizo') throw new Error('Refusing to reuse another application account')
    const result = authUser
      ? await db.auth.admin.updateUserById(authUser.id, { password, email_confirm:true })
      : await db.auth.admin.createUser({ email:spec.email,password,email_confirm:true,app_metadata:{application:'komerizo'},user_metadata:{full_name:`${spec.nombre} ${spec.apellido}`} })
    checked(result); authUser=result.data.user
    const role=await upsert(db,'komerizo_roles',{nombre:spec.role,descripcion:`Rol ${spec.role} de Komerizo`},'nombre')
    const profile=await upsert(db,'komerizo_usuarios',{auth_user_id:authUser.id,cc:spec.cc,tipo_documento_id:document.id,nombre:spec.nombre,apellido:spec.apellido,correo_electronico:spec.email,comuna_id:comuna.id,barrio_id:barrio.id,jac:'JAC Semillas Demo',estado:'activo'},'correo_electronico')
    await upsert(db,'komerizo_usuario_roles',{usuario_id:profile.id,rol_id:role.id},'usuario_id,rol_id')
    profiles.push({...profile,role:spec.role,role_id:role.id})
  }
  for(let n=1;n<=2;n++) await upsert(db,'komerizo_usuarios',{cc:`DEMO-K10${n}`,tipo_documento_id:document.id,nombre:`Vecino ${n}`,apellido:'Ficticio',correo_electronico:`vecino${n}@komerizo.example.com`,comuna_id:comuna.id,barrio_id:barrio.id,jac:'JAC Semillas Demo',estado:'activo'},'correo_electronico')
  const meetings=checked(await db.from('komerizo_reuniones').select('id').eq('titulo','Asamblea comunitaria de demostración'))
  if (!meetings.length) checked(await db.from('komerizo_reuniones').insert({creador_id:profiles[1].id,titulo:'Asamblea comunitaria de demostración',descripcion:'Revisión del plan ambiental. Datos ficticios.',tipo_reunion:'Reunion',lugar:'Salón Semillas Demo',fecha_reunion:'2026-11-21',hora_inicio:'09:00',hora_fin:'10:00',comuna_id:comuna.id,barrio_id:barrio.id,roles_invitados:profiles.map(p=>p.role_id)}))
  return { accounts:profiles.map(p=>({id:p.id,email:p.correo_electronico,role:p.role})), profiles:5, comuna:comuna.id,barrio:barrio.id }
}
