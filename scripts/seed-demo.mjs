import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { DEMO_REF, demoAccounts, seedDemo } from './seed-core.mjs'

if(process.platform!=='win32') throw new Error('This credential vault uses Windows DPAPI. Run privately on Windows.')
const url=process.env.SUPABASE_URL
if(url!==`https://${DEMO_REF}.supabase.co`) throw new Error('Seeder is restricted to komerizo-demo')
if(!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required privately; never use NEXT_PUBLIC_')
await mkdir('.private',{recursive:true})
const vault='.private/demo-credentials.dpapi'
let accounts
try {
 const encrypted=await readFile(vault,'utf8')
 accounts=JSON.parse(execFileSync('pwsh.exe',['-NoProfile','-Command',"$v=([Console]::In.ReadToEnd()).Trim()|ConvertTo-SecureString; [System.Net.NetworkCredential]::new('', $v).Password"],{input:encrypted,encoding:'utf8'}))
} catch(error) {
 if(error.code!=='ENOENT') throw error
 accounts=demoAccounts.map(a=>({email:a.email,password:randomBytes(30).toString('base64url')}))
 const encrypted=execFileSync('pwsh.exe',['-NoProfile','-Command',"$v=[Console]::In.ReadToEnd(); ConvertTo-SecureString $v -AsPlainText -Force | ConvertFrom-SecureString"],{input:JSON.stringify(accounts),encoding:'utf8'})
 await writeFile(vault,encrypted,{mode:0o600,flag:'wx'})
}
const client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
console.log(JSON.stringify(await seedDemo(client,accounts),null,2))
