const { test, before, after }=require('node:test');
const assert=require('node:assert/strict');
const bcrypt=require('bcryptjs');
const user={id:1,kullanici_adi:'tester',tam_ad:'Test User',aktif:true,guncelleme_tarihi:'2026-09-18T00:00:00Z',rol_id:3,roles:{rol_adi:'principal'}};
let permissions=['view_categories','view_students','view_transactions','view_fees'];
let queries=[];
const db={supabase:{from(table) {
  const query={ table, select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},range(){return this;},update(){return this;},insert(){throw new Error('Unauthorized write reached database');},delete(){throw new Error('Unauthorized delete reached database');},single(){return Promise.resolve({data:table==='users'?{...user}:null,error:null});},then(resolve,reject){queries.push(table);return Promise.resolve({data:table==='role_permissions'?permissions.map(izin_adi=>({permissions:{izin_adi}})):[],error:null,count:0}).then(resolve,reject);} };return query;
}},initializeDatabase:async()=>true};
require.cache[require.resolve('../database')]={id:require.resolve('../database'),filename:require.resolve('../database'),loaded:true,exports:db};
process.env.SESSION_SECRET='test-only-secret-'.repeat(4);process.env.NODE_ENV='test';delete process.env.APP_ORIGIN;delete process.env.DATABASE_URL;
let server,base,cookie;
before(async()=>{user.sifre_hash=await bcrypt.hash('test-password-123',4);const app=require('../server');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(()=>new Promise(r=>server.close(r)));
async function login(){const res=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'tester',password:'test-password-123'})});assert.equal(res.status,200);return res.headers.get('set-cookie').split(';')[0];}
test('public health and theme assets load; private APIs require session',async()=>{
  assert.equal((await fetch(base+'/health')).status,200);
  assert.match((await (await fetch(base+'/theme.css')).text()),/Shared institutional/);
  assert.equal((await fetch(base+'/api/categories')).status,401);
});
test('login rotates session IDs, principal can read but cannot mutate any business module',async()=>{
  cookie=await login();const next=await fetch(base+'/api/auth/login',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({username:'tester',password:'test-password-123'})});assert.equal(next.status,200);const rotated=next.headers.get('set-cookie').split(';')[0];assert.notEqual(rotated,cookie);
  assert.equal((await fetch(base+'/api/categories',{headers:{Cookie:cookie}})).status,401);cookie=rotated;
  assert.equal((await fetch(base+'/api/categories',{headers:{Cookie:cookie}})).status,200);
  for (const module of ['categories','students','transactions','student-fees','payments']) for(const method of ['POST','PUT','DELETE']) {
    if(module==='payments' && method==='PUT') continue;
    const res=await fetch(base+'/api/'+module+(method==='POST'?'':'/1'),{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403,module+' '+method);
  }
  assert.equal((await fetch(base+'/api/admin/users',{headers:{Cookie:cookie}})).status,403);
});
test('permission revocation is applied without logging out',async()=>{
  cookie=await login();permissions=[];assert.equal((await fetch(base+'/api/categories',{headers:{Cookie:cookie}})).status,403);permissions=['view_categories'];
});
test('inactive users and changed credentials invalidate existing sessions',async()=>{
  cookie=await login();user.aktif=false;assert.equal((await fetch(base+'/api/categories',{headers:{Cookie:cookie}})).status,401);user.aktif=true;
  cookie=await login();user.guncelleme_tarihi='2026-09-19T00:00:00Z';assert.equal((await fetch(base+'/api/categories',{headers:{Cookie:cookie}})).status,401);
});
test('CSRF guard rejects cross-origin login and logout before handlers',async()=>{
  for(const endpoint of ['login','logout'])assert.equal((await fetch(base+'/api/auth/'+endpoint,{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:'{}'})).status,403);
});
test('same-origin bodyless logout destroys the session', async()=>{
  const sessionCookie=await login();
  const result=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:sessionCookie,Origin:base}});
  assert.equal(result.status,200);
  assert.equal((await result.json()).success,true);
  assert.equal((await fetch(base+'/api/auth/session',{headers:{Cookie:sessionCookie}})).status,401);
});
