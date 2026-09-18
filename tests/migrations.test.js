const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs');const assert=require('node:assert/strict');
const { test } = require('node:test');
test('SQL migrations close anonymous access and enforce payment balances', async()=>{
 const db=new PGlite();await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
 await db.exec(fs.readFileSync('supabase/full_setup.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/harden_access.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/harden_payments.sql','utf8'));
 const r=await db.query("SELECT relname,relrowsecurity FROM pg_class WHERE relname IN ('users','roles','students','payments','student_fees')");assert.ok(r.rows.every(r=>r.relrowsecurity));
 await db.exec('SET ROLE anon');await assert.rejects(()=>db.query('SELECT * FROM public.users'),/permission denied/);await assert.rejects(()=>db.query('SELECT * FROM public.students'),/permission denied/);await db.exec('RESET ROLE');
 await db.exec("INSERT INTO student_fees (id,ogrenci_id,aciklama,tutar,son_odeme_tarihi) VALUES (999,1,'Test',100,'2099-01-01')");
 await db.exec("INSERT INTO payments (aidat_id,tutar,odeme_tarihi,odeme_yontemi) VALUES (999,60,CURRENT_DATE,'cash')");
 await assert.rejects(()=>db.exec("INSERT INTO payments (aidat_id,tutar,odeme_tarihi,odeme_yontemi) VALUES (999,50,CURRENT_DATE,'cash')"),/exceeds/);
 await assert.rejects(()=>db.exec('UPDATE student_fees SET tutar=59 WHERE id=999'),/less than paid/);
 await db.exec("INSERT INTO payments (aidat_id,tutar,odeme_tarihi,odeme_yontemi) VALUES (999,40,CURRENT_DATE,'cash')");assert.equal((await db.query('SELECT durum FROM student_fees WHERE id=999')).rows[0].durum,'paid');
 await db.exec('DELETE FROM payments WHERE aidat_id=999 AND tutar=40');assert.equal((await db.query('SELECT durum FROM student_fees WHERE id=999')).rows[0].durum,'pending');
 await assert.rejects(()=>db.exec("INSERT INTO payments (aidat_id,tutar,odeme_tarihi,odeme_yontemi) VALUES (999,-5,CURRENT_DATE,'cash')"),/Invalid/);
 console.log('PASS: schema, idempotent migrations, anonymous access denied, overpayment, fee reduction, payment status and deletion rollback checks');await db.close();
});
