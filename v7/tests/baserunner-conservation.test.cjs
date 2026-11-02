'use strict';
// Experimental V7-only scoring invariants. Run: node --test v7/tests/baserunner-conservation.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'V7 inline gameplay script exists');
const anchor="el('menuButton').onclick=";
assert.ok(match[1].includes(anchor),'test hook anchor exists');
const script=match[1].replace(anchor,
  'window.__state=()=>state;window.__advance=advanceBases;window.__swing=swing;window.__complete=completeInning;'+anchor);

function boot(){
  const elements={},writes=[];
  const el=id=>elements[id]??(elements[id]={
    innerHTML:'',textContent:'',disabled:false,clientWidth:300,clientHeight:250,
    classList:{add(){},remove(){},toggle(){}},
    style:{setProperty(){}},appendChild(){},querySelectorAll(){return []}
  });
  const document={getElementById:el,addEventListener(){},
    createElement:()=>({style:{setProperty(){}},classList:{add(){}},setAttribute(){}})};
  const window={scrollTo(){}};
  const random=Object.create(Math);random.random=()=>0;
  vm.runInNewContext(script,{document,window,Math:random,setTimeout(){},
    localStorage:{getItem:()=>null,setItem:(key,value)=>writes.push([key,value])}});
  return {state:window.__state(),advance:window.__advance,
    swing:window.__swing,complete:window.__complete,writes};
}

for(let mask=0;mask<8;mask++)for(let hit=1;hit<=4;hit++){
  test('runner conservation: occupancy '+mask.toString(2).padStart(3,'0')+', '+hit+'-base hit',()=>{
    const app=boot();
    const before=[0,1,2].map(i=>Boolean(mask&(1<<i)));
    app.state.bases=before.slice();
    const scored=app.advance(hit);
    const expectedBases=[false,false,false];
    let expectedRuns=0;
    for(let i=0;i<3;i++)if(before[i]){
      if(i+hit>=3)expectedRuns++;
      else expectedBases[i+hit]=true;
    }
    if(hit===4)expectedRuns++;
    else expectedBases[hit-1]=true;
    assert.equal(scored,expectedRuns,'every scoring runner must be counted');
    assert.deepEqual(Array.from(app.state.bases),expectedBases,'runners advance exactly the hit distance');
    assert.equal(before.filter(Boolean).length+1,
      scored+app.state.bases.filter(Boolean).length,
      'existing runners plus batter are conserved');
    assert.equal(app.state.home,0,'advancing runners alone does not credit the wrong team');
    assert.equal(app.state.away,0);
    assert.equal(app.writes.length,0,'pure advancement does not alter saves');
  });
}

test('loaded home runs credit the correct Family Rivalry side across the handoff',()=>{
  const app=boot(),s=app.state;
  Object.assign(s,{screen:'Game',mode:'Family Rivalry',rivalryTurn:'away',
    home:1,away:2,inning:2,innings:3,outs:0,bases:[true,true,true],
    contact:'HARD',zone:4,gameFinished:false,handoff:false,animating:false});
  app.swing(); // deterministic hit + left-field home run
  assert.equal(s.away,6);
  assert.equal(s.home,1);
  assert.deepEqual(Array.from(s.bases),[false,false,false]);
  assert.equal(s.rivalryStats.away.reps,1);
  assert.equal(s.rivalryStats.away.hits,1);

  s.outs=3;
  app.complete();
  assert.equal(s.rivalryTurn,'home');
  assert.equal(s.handoff,true);
  assert.equal(s.inning,2);
  assert.equal(s.outs,0);
  assert.deepEqual(Array.from(s.bases),[false,false,false]);
  assert.equal(s.away,6);
  assert.equal(s.home,1);

  Object.assign(s,{handoff:false,animating:false,bases:[true,true,true]});
  app.swing();
  assert.equal(s.home,5,'home team receives all four runs');
  assert.equal(s.away,6,'away score is unchanged on the home turn');
  assert.equal(s.gameFinished,false,'no premature walkoff before regulation final');
  assert.equal(s.rivalryStats.home.reps,1);
  assert.equal(s.rivalryStats.home.hits,1);
  assert.deepEqual(new Set(app.writes.map(([key])=>key)),
    new Set(['hitlab-v7-visual-prototype-only']),
    'only isolated V7 save key may be written');
});
