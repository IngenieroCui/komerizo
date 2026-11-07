import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { readFile,writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
const url='https://xmmqbbgivvfcsdlvtxqk.supabase.co'
const key='sb_publishable_hLY3GL7TOLn1F8l35QGZew_LRpXNUlV'
const encrypted=(await readFile('.private/demo-credentials.dpapi','utf8')).trim()
const accounts=JSON.parse(execFileSync('pwsh.exe',['-NoProfile','-Command',"$v=([Console]::In.ReadToEnd()).Trim()|ConvertTo-SecureString; [System.Net.NetworkCredential]::new('', $v).Password"],{input:encrypted,encoding:'utf8'}))
const evidence={checkedAt:new Date().toISOString(),logins:[],checks:[]}
const clients={}
for(const a of accounts){
 const c=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const login=await c.auth.signInWithPassword(a); assert.ifError(login.error)
 const p=await c.from('komerizo_usuarios').select('*,komerizo_usuario_roles(komerizo_roles(id,nombre))').eq('auth_user_id',login.data.user.id).single();assert.ifError(p.error)
 const role=p.data.komerizo_usuario_roles[0].komerizo_roles.nombre
 evidence.logins.push({email:a.email,role,profileId:p.data.id})
 const refresh=await c.auth.refreshSession();assert.ifError(refresh.error)
 clients[role]={client:c,profile:p.data}
}
const {client:secretary,profile}=clients.Secretario
const title='Verificación persistente '+new Date().toISOString()
const insert=await secretary.from('komerizo_reuniones').insert({titulo:title,descripcion:'Registro ficticio creado con JWT del secretario',tipo_reunion:'Reunion',fecha_reunion:'2026-11-22',creador_id:profile.id,barrio_id:profile.barrio_id,comuna_id:profile.comuna_id,roles_invitados:[]}).select().single();assert.ifError(insert.error)
const meetingId=insert.data.id
const persisted=await clients.Presidente.client.from('komerizo_reuniones').select('id,titulo').eq('id',meetingId).single();assert.ifError(persisted.error);assert.equal(persisted.data.titulo,title)
const updated=await secretary.from('komerizo_reuniones').update({lugar:'Sala de verificación persistente'}).eq('id',meetingId).select().single();assert.ifError(updated.error)
assert.equal(updated.data.lugar,'Sala de verificación persistente')
evidence.checks.push({operation:'secretary insert/read/update; president persisted read',meetingId,title,result:'passed'})
const forbidden=await secretary.from('komerizo_usuario_roles').insert({usuario_id:profile.id,rol_id:clients.Administrador.profile.komerizo_usuario_roles[0].komerizo_roles.id}).select();assert(forbidden.error);assert.equal(forbidden.error.code,'42501')
evidence.checks.push({operation:'secretary self-promotion to administrator',result:'rejected',code:forbidden.error.code})
const adminAllowed=await clients.Administrador.client.from('komerizo_roles').select('id,nombre');assert.ifError(adminAllowed.error);assert.equal(adminAllowed.data.length,3)
const noAuth=createClient(url,key,{auth:{persistSession:false}})
const anonymous=await noAuth.from('komerizo_usuarios').select('id');assert(anonymous.error || anonymous.data.length===0)
evidence.checks.push({operation:'anonymous profile read',result:'rejected or no rows',code:anonymous.error?.code})
const protectedLink=await secretary.from('komerizo_usuarios').update({auth_user_id:clients.Administrador.profile.auth_user_id}).eq('id',profile.id);assert.equal(protectedLink.error?.code,'42501')
evidence.checks.push({operation:'secretary changes Auth identity link',result:'rejected',code:protectedLink.error.code})
for(const {client} of Object.values(clients)){const result=await client.auth.signOut();assert.ifError(result.error);assert.equal((await client.auth.getSession()).data.session,null)}
evidence.checks.push({operation:'all roles refresh and sign out',result:'passed'})
await writeFile('.private/verification.json',JSON.stringify(evidence,null,2))
console.log(JSON.stringify(evidence,null,2))
