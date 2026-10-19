const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
let inserted;
const db = {supabase: {from(table) {
  return {select(){return this;},eq(){return this;},
    insert(value){inserted=value;return this;},
    maybeSingle:async()=>({data:{id:1,tutar:'0.30',durum:'pending'},error:null}),
    single:async()=>({data:{id:2,...inserted},error:null}),
    then(resolve,reject){return Promise.resolve({data:[{tutar:'0.10'}],error:null}).then(resolve,reject);}
  };
}}};
require.cache[require.resolve('../database')]={id:require.resolve('../database'),filename:require.resolve('../database'),loaded:true,exports:db};
require.cache[require.resolve('../middleware/authorization')]={id:require.resolve('../middleware/authorization'),filename:require.resolve('../middleware/authorization'),loaded:true,exports:{requirePermission:()=> (req,res,next)=>next()}};
let server,base;
before(async()=>{const app=express();app.use(express.json());app.use('/payments',require('../routes/payments'));server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(()=>new Promise(r=>server.close(r)));
test('remaining twenty cents on a thirty-cent fee can be paid exactly',async()=>{
 const response=await fetch(base+'/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fee_id:1,amount:'0.20',payment_date:'2026-10-19',payment_method:'cash'})});
 assert.equal(response.status,201);
 const result=await response.json();assert.equal(result.data.total_paid,0.3);assert.equal(result.data.fee_status,'paid');assert.equal(inserted.tutar,0.2);
});
test('one cent above remaining balance is rejected before insert',async()=>{
 inserted=undefined;
 const response=await fetch(base+'/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fee_id:1,amount:'0.21',payment_date:'2026-10-19',payment_method:'cash'})});
 assert.equal(response.status,400);assert.equal(inserted,undefined);
});
