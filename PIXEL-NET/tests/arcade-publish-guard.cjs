// Prevent unfinished placeholders and archived titles from appearing on public arcade floor.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('PIXEL-NET');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'games.json'),'utf8'));
const archive=JSON.parse(fs.readFileSync(path.join(root,'archived-games.json'),'utf8'));
assert.ok(Array.isArray(catalog)&&Array.isArray(archive));
const seen=new Set(), archived=new Set(archive.map(x=>x.slug));
for(const g of catalog){
 assert.ok(g.slug&&g.path&&g.thumb,'Game missing required catalog fields');
 assert.ok(!seen.has(g.slug),'Duplicate active game: '+g.slug);seen.add(g.slug);
 assert.ok(!archived.has(g.slug),'Archived game reappeared publicly: '+g.slug);
 const gamePath=path.resolve(root,g.path);
 assert.ok(gamePath.startsWith(root+path.sep)&&fs.existsSync(gamePath),
   'Invalid/missing game wrapper '+g.slug+' '+g.path);
 const thumb=path.resolve(root,g.thumb);
 assert.ok(thumb.startsWith(root+path.sep)&&fs.existsSync(thumb),
   'Missing arcade card art for '+g.slug);
 const wrapper=fs.readFileSync(gamePath,'utf8');
 const entry=wrapper.match(/["']?entry["']?\s*:\s*["']([^"']+)["']/);
 assert.ok(entry,'No game entry configured for '+g.slug);
 const file=path.resolve(path.dirname(gamePath),entry[1]);
 assert.ok(file.startsWith(root+path.sep)&&fs.existsSync(file),
   'Game entry missing or escaped the site: '+g.slug);
 const source=fs.readFileSync(file,'utf8');
 assert.ok(!/location\.replace\(\s*['"][^'"]*coming-soon/i.test(source),
   'Public game redirects to coming soon: '+g.slug);
 assert.ok(!/this entry is a placeholder|is being built/i.test(source),
   'Public game is a placeholder: '+g.slug);
}
assert.ok(catalog.some(x=>x.featured),'No playable featured game');
assert.equal(archive.filter(x=>x.slug==='retro-kombat').length,1);
console.log('PUBLISH_GUARD_PASS '+catalog.length+' active games; '+archive.length+' archived');
