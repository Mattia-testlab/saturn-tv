// Builds a LOCAL-ONLY fixture: the distributed module never accepts localhost.
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'.browser');fs.mkdirSync(out,{recursive:true});
let source=fs.readFileSync(path.join(__dirname,'../saturn.js'),'utf8');
source=source.replace('var host = win.location.hostname.toLowerCase();',"var host = win.location.hostname.toLowerCase(); if (host === '127.0.0.1') host = 'www.animesaturn.net';");
fs.writeFileSync(path.join(out,'saturn-test.js'),source);
fs.copyFileSync(path.join(__dirname,'browser/index.html'),path.join(out,'index.html'));
// Isolated cross-origin transport test; these local origins NEVER enter production.
let bridge=fs.readFileSync(path.join(__dirname,'../saturn.js'),'utf8');
bridge=bridge.replace('var host = win.location.hostname.toLowerCase();',"var host = win.location.hostname.toLowerCase(); if(host==='127.0.0.1')host='www.animesaturn.net';else if(host==='localhost')host='play.saturncdn.net';");
bridge=bridge.replaceAll("'https://play.saturncdn.net'","'http://localhost:8766'").replaceAll("'https://www.animesaturn.net'","'http://127.0.0.1:8766'");
fs.writeFileSync(path.join(out,'saturn-bridge-test.js'),bridge);
for(const file of ['bridge.html','player.html','search.html','favorites.html','ad-focus.html'])fs.copyFileSync(path.join(__dirname,'browser',file),path.join(out,file));
const episode=path.join(out,'anime','test','ep-71');fs.mkdirSync(episode,{recursive:true});
fs.copyFileSync(path.join(__dirname,'browser/early-shield.html'),path.join(episode,'index.html'));
fs.writeFileSync(path.join(out,'shield-probe.js'),'window.shieldProbe=(window.shieldProbe||0)+1;');
console.log('Fixture: '+out+' (serve only on 127.0.0.1)');
