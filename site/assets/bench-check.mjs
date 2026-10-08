// /benchmarks smoke, run by scripts/e2e/run.mjs's `site` surface against the
// local edge on 127.0.0.1:18095. The page is one measured run since
// 2026-09-23 (superbot loop vs claude-agent-sdk on claude haiku 4.5); the
// scatter chart and the placeholder cost/time cards this used to probe are
// gone, so it checks what the page still has: the race finishes both panes on
// the two measured clocks, no page errors, and no sideways overflow at 390.
import { chromium } from 'playwright-core';
const b = await chromium.launch();
const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36';
const fails = [];
const pg = await b.newPage({ viewport:{width:1440,height:900}, userAgent:UA });
pg.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE ERR',m.text()); });
pg.on('pageerror',e=>{ console.log('PAGEERR',e.message); fails.push('page error: '+e.message); });
await pg.goto('http://127.0.0.1:18095/benchmarks',{waitUntil:'load'});
// wait both panes done
await pg.waitForFunction(()=>{const p=[...document.querySelectorAll('.pane')];return p.length===2&&p.every(x=>x.classList.contains('done'));},null,{timeout:45000});
const clocks = await pg.$$eval('.pane [data-clock]',els=>els.map(e=>e.textContent.trim()));
console.log('CLOCKS', JSON.stringify(clocks));
if (!(clocks.includes('0:08.551') && clocks.includes('0:24.057'))) fails.push('race clocks are not the measured 0:08.551 / 0:24.057');
// 390x844
const m = await b.newPage({ viewport:{width:390,height:844}, userAgent:UA });
await m.goto('http://127.0.0.1:18095/benchmarks',{waitUntil:'load'});
await m.waitForTimeout(1500);
const mob = await m.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth}));
console.log('MOBILE', JSON.stringify(mob));
if (mob.scrollWidth > mob.clientWidth) fails.push(`sideways overflow at 390: ${mob.scrollWidth} > ${mob.clientWidth}`);
await b.close();
console.log(fails.length ? 'FAIL bench-check: '+fails.join('; ') : 'PASS bench-check');
process.exit(fails.length ? 1 : 0);
