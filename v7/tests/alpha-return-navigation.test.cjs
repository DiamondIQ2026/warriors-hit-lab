'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const multi=fs.readFileSync(path.join(root,'multiplayer.html'),'utf8');
const cpu=fs.readFileSync(path.join(root,'experimental/visual-prototype.html'),'utf8');

test('mobile start CTA stays before optional shared-profile setup controls',()=>{
 const setup=multi.indexOf('<section id="setup">');
 const start=multi.indexOf('id="start"',setup);
 const optional=multi.indexOf('id="useAlphaHome"',setup);
 assert.ok(setup>=0&&start>setup&&optional>start);
});
test('both gameplay previews return directly to the alpha hub',()=>{
 assert.match(multi,/id="alphaHomeLink" href="\.\/alpha\/index\.html"/);
 assert.match(cpu,/id="alphaHomeLink" href="\.\.\/alpha\/index\.html"/);
 assert.ok(fs.existsSync(path.join(root,'alpha/index.html')));
});
test('hub navigation never touches active game storage',()=>{
 for(const html of [multi,cpu]){
   const link=html.match(/<a id="alphaHomeLink"[^>]*>/);
   assert.ok(link);
   assert.doesNotMatch(link[0],/onclick|javascript:|localStorage/);
 }
});
