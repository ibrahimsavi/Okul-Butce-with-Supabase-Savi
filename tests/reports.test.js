const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const ExcelJS=require('exceljs');
const transactions=Array.from({length:1205},(_,id)=>({id:id+1,islem_turu:'gelir',tutar:1,islem_tarihi:'2026-10-19',aciklama:'Test'}));
const students=Array.from({length:1205},(_,id)=>({id:id+1,ad:'Öğrenci '+id,soyad:'Test',sinif:'1',sube:'A'}));
const db={supabase:{from(table){let start=0,end=999;
 return {select(){return this;},order(){return this;},gte(){return this;},lte(){return this;},range(a,b){start=a;end=b;return this;},then(resolve,reject){const source=table==='transactions'?transactions:table==='students'?students:[];return Promise.resolve({data:source.slice(start,Math.min(end+1,start+400)),error:null}).then(resolve,reject);}};
}}};
require.cache[require.resolve('../database')]={id:require.resolve('../database'),filename:require.resolve('../database'),loaded:true,exports:db};
require.cache[require.resolve('../middleware/authorization')]={id:require.resolve('../middleware/authorization'),filename:require.resolve('../middleware/authorization'),loaded:true,exports:{requirePermission:()=> (req,res,next)=>next()}};
let server,base;
before(async()=>{const app=express();app.use('/reports',require('../routes/reports'));app.use('/transactions',require('../routes/transactions'));server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(()=>new Promise(r=>server.close(r)));
test('transaction summary includes records past the server row limit',async()=>{
 const result=await fetch(base+'/transactions/stats/summary');assert.equal(result.status,200);
 const {data}=await result.json();assert.equal(data.gelir.transaction_count,1205);assert.equal(data.net_balance,1205);
});
test('student and financial Excel exports include the last page',async()=>{
 for(const [path,sheetName] of [['students','Öğrenciler'],['financial','İşlemler']]){
  const result=await fetch(base+'/reports/'+path);assert.equal(result.status,200);
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(await result.arrayBuffer()));
  const sheet=workbook.getWorksheet(sheetName);assert.equal(sheet.rowCount,1206);assert.equal(sheet.getCell('A1206').value,1205);
 }
});
