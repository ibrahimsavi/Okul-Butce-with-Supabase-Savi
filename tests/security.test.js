const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validPassword, sessionOptions, requestSecurity, validateInput, createLoginLimiter } = require('../middleware/security');
const { escapeHtml } = require('../public/safe-html');
function response() { return { code:200, headers:{}, status(n) { this.code=n; return this; }, json(data) { this.data=data; return this; }, setHeader(k,v) { this.headers[k]=v; } }; }
test('session configuration fails closed and uses secure production cookies', () => {
  assert.throws(() => sessionOptions({}));
  assert.throws(() => sessionOptions({ SESSION_SECRET:'savi-butce-secret-key-2025' }));
  assert.throws(() => sessionOptions({ SESSION_SECRET:'a'.repeat(32), NODE_ENV:'production', SESSION_COOKIE_SECURE:'false' }));
  const config=sessionOptions({ SESSION_SECRET:'a'.repeat(32), NODE_ENV:'production' });
  assert.equal(config.cookie.secure,true); assert.equal(config.cookie.httpOnly,true); assert.equal(config.cookie.sameSite,'lax');
});
test('password policy rejects short values, objects and bcrypt truncation', () => {
  for (const value of ['admin123', {}, 'x'.repeat(73), 'ş'.repeat(37)]) assert.equal(validPassword(value),false);
  assert.equal(validPassword('a-long-test-password'),true);
});
test('cross-origin browser mutations and originless forms are blocked', () => {
  for (const headers of [{origin:'https://evil.test'}, {'sec-fetch-site':'cross-site'},{}]) {
    const res=response(); let passed=false;
    requestSecurity({ method:'POST', protocol:'https', get:key=>headers[key] || (key==='host'?'budget.test':undefined), is:()=>false },res,()=>passed=true);
    assert.equal(res.code,403); assert.equal(passed,false);
  }
  const res=response();let passed=false;
  requestSecurity({method:'POST',protocol:'https',get:k=>({host:'budget.test',origin:'https://budget.test'})[k],is:()=>true},res,()=>passed=true);
  assert.equal(passed,true);
});
test('login throttling expires and is isolated by client IP', () => {
  let time=1000;const limit=createLoginLimiter({max:2,windowMs:1000,now:()=>time});let passed=0;
  for(let i=0;i<3;i++) { const res=response();limit({ip:'127.0.0.1'},res,()=>passed++);if(i===2) {assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'1');} }
  assert.equal(passed,2);limit({ip:'127.0.0.2'},response(),()=>passed++);time+=1001;limit({ip:'127.0.0.1'},response(),()=>passed++);assert.equal(passed,4);
});
test('malformed amounts, object values, invalid dates and unbounded pages fail before queries', () => {
  for(const req of [{body:{amount:'Infinity'}},{body:{amount:'1e4'}},{body:{amount:-1}},{body:{amount:1.001}},{body:{name:{x:1}}},{body:{first_name:42}},{body:{due_date:'2026-02-31'}},{query:{limit:'1001'}},{query:{limit:'10foo'}},{query:{offset:'-1'}},{query:{search:{nested:1}}}]) {
    const res=response();let passed=false;validateInput(req,res,()=>passed=true);assert.equal(res.code,400,JSON.stringify(req));assert.equal(passed,false);
  }
  let passed=false;validateInput({body:{amount:125.5,due_date:'2026-09-18'},query:{limit:'1000',offset:'0'}},response(),()=>passed=true);assert.equal(passed,true);
});
test('stored payloads are escaped for text and quoted HTML attributes', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml("O'Brien & Sons"),'O&#39;Brien &amp; Sons');
});
test('ExcelJS export and re-import preserve values after UUID security override', async () => {
  const ExcelJS=require('exceljs');const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Bütçe');sheet.addRow(['Açıklama','Tutar']);sheet.addRow(['Öğrenci aidatı',123.45]);
  sheet.addConditionalFormatting({ref:'B2',rules:[{type:'iconSet',iconSet:'3Triangles',cfvo:[{type:'percent',value:0},{type:'percent',value:33},{type:'percent',value:67}]}]});
  const bytes=await workbook.xlsx.writeBuffer();const loaded=new ExcelJS.Workbook();await loaded.xlsx.load(bytes);
  assert.equal(loaded.worksheets[0].getCell('A2').value,'Öğrenci aidatı');assert.equal(loaded.worksheets[0].getCell('B2').value,123.45);
});
