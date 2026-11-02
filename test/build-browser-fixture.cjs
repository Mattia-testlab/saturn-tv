// Builds a LOCAL-ONLY fixture: the distributed module never accepts localhost.
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'.browser');fs.mkdirSync(out,{recursive:true});
let source=fs.readFileSync(path.join(__dirname,'../saturn.js'),'utf8');
source=source.replace('var host = win.location.hostname.toLowerCase();',"var host = win.location.hostname.toLowerCase(); if (host === '127.0.0.1') host = 'www.animesaturn.net';");
fs.writeFileSync(path.join(out,'saturn-test.js'),source);
fs.copyFileSync(path.join(__dirname,'browser/index.html'),path.join(out,'index.html'));
console.log('Fixture: '+out+' (serve only on 127.0.0.1)');
