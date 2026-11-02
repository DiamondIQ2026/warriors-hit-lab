'use strict';
// Isolated V7 stadium visual-state regressions. No V6.3 or production writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'V7 inline script must exist');
const anchor="el('menuButton').onclick=";
assert.ok(source.includes(anchor),'stable V7 test hook');
const script=source.replace(anchor,
 "window.__state=()=>state;window.__score=score;window.__field=field;window.__summary=trainingSummary;window.__report=report;window.__results=results;window.__fielders=reactingFielders;window.__step=fielderStep;window.__swing=swing;"+anchor);
function boot(rolls=[.99]){
 const elements={},created=[],writes=[],timers=[];
 const fielders=Array.from({length:8},()=>({
  classes:[],props:{},
  style:{setProperty(key,value){this.owner.props[key]=value}},
  classList:{add(name){this.owner.classes.push(name)}}
 }));
 for(const f of fielders){f.style.owner=f;f.classList.owner=f}
 const el=id=>elements[id]??(elements[id]={
  innerHTML:'',textContent:'',clientWidth:300,clientHeight:250,disabled:false,
  classList:{add(){},remove(){},toggle(){}},
  style:{setProperty(){}},
  appendChild(node){created.push(node)},
  querySelectorAll(){return fielders}
 });
 const document={
  getElementById:el,addEventListener(){},
  createElement:()=>({className:'',textContent:'',style:{setProperty(){}},setAttribute(){}})
 };
 const random=Object.create(Math);
 random.random=()=>rolls.length?rolls.shift():.99;
 const window={scrollTo(){}};
 vm.runInNewContext(script,{document,window,Math:random,
  localStorage:{getItem:()=>null,setItem:(key,value)=>writes.push([key,value])},
  setTimeout:fn=>timers.push(fn)});
 return {state:window.__state(),score:window.__score,field:window.__field,summary:window.__summary,report:window.__report,results:window.__results,fielders:window.__fielders,
  step:window.__step,swing:window.__swing,defenders:fielders,created,writes,
  tick(){const fn=timers.shift();assert.ok(fn);fn()}};
}
test('scorebug renders bases in a diamond with occupied markers and readable order',()=>{
 const app=boot();
 app.state.bases=[true,false,true];
 const score=app.score();
 assert.match(score,/role="group" aria-label="Game scoreboard"/);
 assert.match(score,/role="img" aria-label="Bases: first occupied, second empty, third occupied"/);
 assert.match(score,/base-second"/);
 assert.match(score,/base-third occupied"/);
 assert.match(score,/base-first occupied"/);
 assert.ok(score.indexOf('base-second')<score.indexOf('base-third'));
 assert.ok(score.indexOf('base-third')<score.indexOf('base-first'));
 assert.match(html,/\.score \.base-second\{grid-column:2;grid-row:1\}/);
 assert.match(html,/\.score \.base-third\{grid-column:1;grid-row:2\}/);
 assert.match(html,/\.score \.base-first\{grid-column:3;grid-row:2\}/);
});
test('empty and loaded bases are visually distinct without changing game state',()=>{
 const app=boot();
 app.state.bases=[false,false,false];
 const empty=app.score();
 assert.equal((empty.match(/class="base-indicator/g)||[]).length,3);
 assert.equal((empty.match(/ occupied"/g)||[]).length,0);
 app.state.bases=[true,true,true];
 const loaded=app.score();
 assert.equal((loaded.match(/base-indicator base-(?:first|second|third) occupied/g)||[]).length,3);
 assert.deepEqual(Array.from(app.state.bases),[true,true,true]);
 assert.equal(app.writes.length,0);
});
test('fielder steps always head toward landing and are bounded on small phones',()=>{
 const app=boot();
 for(const [w,h] of [[180,120],[300,250],[390,600]]){
  for(const [x,y] of [[12,9],[88,65],[50,42]]){
   for(let i=0;i<8;i++){
    const step=app.step(x,y,i,w,h);
    assert.ok(Math.hypot(step.x,step.y)<=32.001);
    assert.ok(Number.isFinite(step.x)&&Number.isFinite(step.y));
   }
  }
 }
 const left=app.step(12,25,2,300,250);
 assert.ok(left.x<0,'right fielder runs left toward the ball');
 const right=app.step(88,25,0,300,250);
 assert.ok(right.x>0,'left fielder runs right toward the ball');
});
test('backup defender moves less than primary and never exceeds 18 pixels',()=>{
 const app=boot();
 const primary=app.step(88,9,0,300,250,false);
 const backup=app.step(88,9,0,300,250,true);
 assert.ok(Math.hypot(backup.x,backup.y)<=18.001);
 assert.ok(Math.hypot(primary.x,primary.y)>Math.hypot(backup.x,backup.y));
});
test('one fielder reacts to an out; two react to an extra-base hit',()=>{
 const out=boot([.99]);
 Object.assign(out.state,{screen:'Drill',zone:5,contact:'MEDIUM'});
 out.swing();
 assert.equal(out.defenders.filter(f=>f.classes.includes('reacting')).length,1);
 out.tick();
 const double=boot([0,.20]);
 Object.assign(double.state,{screen:'Drill',zone:5,contact:'MEDIUM'});
 double.swing();
 assert.equal(double.state.trainingFeedback,'DOUBLE!');
 assert.equal(double.defenders.filter(f=>f.classes.includes('reacting')).length,2);
 for(const f of double.defenders.filter(f=>f.classes.includes('reacting'))){
  assert.ok(Math.abs(parseFloat(f.props['--fielder-step-x']))<=32.1);
  assert.ok(Math.abs(parseFloat(f.props['--fielder-step-y']))<=32.1);
 }
 double.tick();
 assert.equal(double.state.animating,false);
});
test('wall double gets backup defense; home run remains a single chase reaction',()=>{
 const wall=boot([0,.01]);
 Object.assign(wall.state,{screen:'Drill',zone:5,contact:'MEDIUM'});
 wall.swing();
 assert.equal(wall.state.trainingFeedback,'OFF THE WALL — DOUBLE!');
 assert.equal(wall.defenders.filter(f=>f.classes.includes('reacting')).length,2);
 const homer=boot([0,0]);
 Object.assign(homer.state,{screen:'Drill',zone:5,contact:'HARD'});
 homer.swing();
 assert.equal(homer.state.trainingFeedback,'HOME RUN!');
 assert.equal(homer.defenders.filter(f=>f.classes.includes('reacting')).length,1);
});
test('accessible game feedback and above-fold zone/CTA ordering are preserved',()=>{
 const start=html.indexOf('function game(){'),end=html.indexOf('function trainingComplete(){');
 const game=html.slice(start,end);
 assert.ok(game.indexOf('quickZonePicker()')<game.indexOf('id="swing"'));
 assert.match(game,/id="feedback" role="status" aria-live="polite"/);
 assert.match(html,/@media\(max-height:740px\)/);
 assert.match(html,/#swing\{min-height:58px/);
});
test('stadium visuals never write a legacy save key',()=>{
 const app=boot([0,.2]);
 Object.assign(app.state,{screen:'Drill',zone:5,contact:'MEDIUM'});
 app.swing();
 assert.equal(app.state.trainingReps,1);
 assert.equal(app.state.reps,0);
 assert.ok(app.writes.length>0);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});

test('on-field runner diamonds reflect occupied bases in game mode',()=>{
 const app=boot();
 app.state.screen='Game';app.state.bases=[true,false,true];
 const field=app.field();
 assert.match(field,/field-base-first occupied/);
 assert.match(field,/field-base-third occupied/);
 assert.match(field,/field-base-second"/);
 assert.doesNotMatch(field,/field-base-second occupied/);
 assert.equal((field.match(/class="field-base field-base-/g)||[]).length,3);
 assert.match(field,/class="field-bases" aria-hidden="true"/);
 assert.match(field,/class="field-home"/);
});
test('training field hides game runners without changing live game bases',()=>{
 const app=boot();
 app.state.screen='Drill';app.state.bases=[true,true,true];
 const field=app.field();
 assert.doesNotMatch(field,/field-base-(first|second|third) occupied/);
 assert.deepEqual(Array.from(app.state.bases),[true,true,true]);
 assert.equal(app.writes.length,0);
});
test('base overlay tracks the CSS diamond at different aspect ratios without blocking zone taps',()=>{
 assert.match(html,/\.field \.field-bases\{[^}]*top:62%;width:32%;aspect-ratio:1/);
 assert.match(html,/\.field \.field-bases\{[^}]*pointer-events:none/);
 assert.match(html,/\.field \.field-base-first\{left:100%;top:0\}/);
 assert.match(html,/\.field \.field-base-second\{left:0;top:0\}/);
 assert.match(html,/\.field \.field-base-third\{left:0;top:100%\}/);
});
test('empty training log shows no percentages and no invented coaching focus',()=>{
 const app=boot();
 const summary=app.summary();
 assert.equal(summary.focus,null);
 assert.equal(summary.zones.length,9);
 assert.ok(summary.zones.every(z=>z.reps===0&&z.hits===0));
 assert.match(app.report(),/Record at least 3 reps in two different zones/);
});
test('one-rep 100% is visibly marked as a small sample, not a recommendation',()=>{
 const app=boot();
 app.state.trainingLog=[{zone:3,contact:'HARD',hit:true}];
 const summary=app.summary();
 assert.equal(summary.focus,null);
 assert.equal(summary.zones[2].reps,1);
 assert.equal(summary.zones[2].hits,1);
 assert.match(app.report(),/1\/1 simulated hits · SMALL SAMPLE/);
 assert.match(app.report(),/100%/);
});
test('training recommendations require two comparable zones and use simulated hit rates',()=>{
 const app=boot();
 app.state.trainingLog=[
  {zone:2,contact:'SOFT',hit:false},
  {zone:2,contact:'MEDIUM',hit:false},
  {zone:2,contact:'HARD',hit:true},
  {zone:5,contact:'HARD',hit:true},
  {zone:5,contact:'HARD',hit:true},
  {zone:5,contact:'MEDIUM',hit:true}
 ];
 const summary=app.summary();
 assert.equal(summary.focus,2);
 assert.equal(summary.zones[1].hits,1);
 assert.equal(summary.zones[1].reps,3);
 assert.deepEqual({...summary.contacts},{SOFT:1,MEDIUM:2,HARD:3});
 assert.match(app.report(),/Review Zone 2: lowest simulated hit rate/);
 assert.match(app.report(),/Contact choices: Soft 1 · Medium 2 · Hard 3/);
});
test('invalid drill entries cannot corrupt zone counts or coaching comparisons',()=>{
 const app=boot();
 app.state.trainingLog=[null,{zone:0,hit:true},{zone:10,hit:true},{zone:'3',hit:true},{zone:3,contact:'INVALID',hit:true},{zone:3,contact:'SOFT',hit:false}];
 const summary=app.summary();
 assert.equal(summary.zones[2].reps,2);
 assert.equal(summary.zones[2].hits,1);
 assert.equal(summary.contacts.SOFT,1);
 assert.equal(summary.focus,null);
 app.state.trainingLog='malformed';
 assert.ok(app.summary().zones.every(z=>z.reps===0));
});
test('training report offers the primary library action before the detailed statistics',()=>{
 const app=boot();
 const page=app.report();
 assert.ok(page.indexOf('BACK TO DRILL LIBRARY')<page.indexOf('Zone Performance'));
 assert.match(page,/not measurements of real-world swing accuracy/);
 assert.equal(app.writes.length,0);
});
test('Family Rivalry results expose Play Again immediately after score, before comparison',()=>{
 const app=boot();
 app.state.mode='Family Rivalry';
 const page=app.results();
 assert.ok(page.indexOf('PLAY AGAIN ▶')>page.indexOf('Game scoreboard'));
 assert.ok(page.indexOf('PLAY AGAIN ▶')<page.indexOf('Player Comparison'));
 assert.equal((page.match(/PLAY AGAIN ▶/g)||[]).length,1);
 assert.equal(app.writes.length,0);
});
