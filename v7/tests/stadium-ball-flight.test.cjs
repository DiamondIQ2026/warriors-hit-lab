'use strict';
// Stadium Mode regression checks for the isolated V7 experimental preview.
// No production assets or V6.3 storage keys are accessed.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../experimental/visual-prototype.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'inline V7 script');
const anchor="el('menuButton').onclick=";
assert.ok(source.includes(anchor),'test hook');
const script=source.replace(anchor,
 "window.__flightGeometry=flightGeometry;window.__fenceDistance=fenceDistance;"+
 "window.__parkAdjustedHit=parkAdjustedHit;window.__state=()=>state;"+
 "window.__swing=swing;window.__field=field;"+anchor);
function boot(rolls=[.99]){
 const elements={},created=[],timers=[],writes=[],listeners={};
 const fielders=Array.from({length:8},()=>({
  props:{},classes:[],
  style:{props:{},setProperty(key,value){this.props[key]=value}},
  classList:{add(name){this.owner.classes.push(name)}}
 }));
 for(const f of fielders)f.classList.owner=f;
 const el=id=>elements[id]??(elements[id]={
  id,innerHTML:'',textContent:'',clientWidth:300,clientHeight:250,disabled:false,
  classes:[],classList:{add(){},remove(){},toggle(){}},
  style:{setProperty(){}},
  appendChild(node){created.push(node)},
  querySelectorAll(){return fielders}
 });
 const document={
  getElementById:el,addEventListener:(name,fn)=>listeners[name]=fn,
  createElement:tag=>{const props={};return {
   tag,className:'',textContent:'',props,attributes:{},
   style:{setProperty:(key,value)=>{props[key]=value}},
   setAttribute(key,value){this.attributes[key]=value}
  }}
 };
 const window={scrollTo(){}};
 const random=Object.create(Math);
 random.random=()=>rolls.length?rolls.shift():.99;
 vm.runInNewContext(script,{document,window,
  localStorage:{getItem:()=>null,setItem:(key,value)=>writes.push([key,value])},
  setTimeout:fn=>timers.push(fn),Math:random});
 return {state:window.__state(),geometry:window.__flightGeometry,
  fence:window.__fenceDistance,adjust:window.__parkAdjustedHit,
  field:window.__field,swing:window.__swing,created,fielders,writes,
  tick(){const fn=timers.shift();assert.ok(fn,'pending animation');fn()}};
}
test('flight animation starts at home plate and uses responsive pixel transforms',()=>{
 assert.match(html,/\.field \.ball\{left:50%;top:80%;animation:tracked-flight/);
 assert.match(html,/@keyframes tracked-flight\{/);
 assert.match(html,/var\(--flight-mid-x,0px\)/);
 assert.match(html,/var\(--flight-end-y,0px\)/);
 assert.doesNotMatch(html,/offset-path:var\(--flight-path\)/);
});
test('geometry lands at correct left, center and right positions',()=>{
 const app=boot();
 for(const [x,expected] of [[19,-93],[50,0],[81,93]]){
  const g=app.geometry(x,42,20,300,250);
  assert.equal(g.endX,expected);
  assert.equal(g.endY,-95);
  assert.equal(g.midX,expected/2);
 }
});
test('high fly-ball apex stays visible on a short mobile field',()=>{
 const app=boot();
 for(const h of [120,180,250]){
  const g=app.geometry(81,9,62,180,h);
  const apexY=h*.8+g.midY;
  assert.ok(apexY>=11.99,'ball stays inside field at peak');
  assert.ok(apexY<=h*.8,'ball rises above batter');
  assert.equal(g.endY,(9-80)*h/100);
 }
});
test('ground balls fly lower than fly balls to same landing spot',()=>{
 const app=boot();
 const ground=app.geometry(50,42,4,300,250);
 const fly=app.geometry(50,42,48,300,250);
 assert.ok(fly.midY<ground.midY);
 assert.equal(ground.endY,fly.endY);
});
test('left and right batting zones produce opposite ball flight and fielder reaction',()=>{
 for(const [zone,sign] of [[1,-1],[3,1]]){
  const app=boot([0,.5]); // successful HARD single
  app.state.screen='Drill';app.state.zone=zone;app.state.contact='HARD';
  app.swing();
  const ball=app.created.find(n=>n.props['--flight-end-x']);
  assert.ok(ball,'ball was drawn');
  const dx=parseFloat(ball.props['--flight-end-x']);
  assert.ok(sign*dx>0,'ball heads to selected side');
  assert.ok(app.fielders.some(f=>f.classes.includes('reacting')),'fielder reacts');
  assert.equal(app.state.trainingReps,1);
  assert.equal(app.state.reps,0,'training does not affect game');
  app.tick();assert.equal(app.state.animating,false);
 }
});
test('Tropicana Field center fence converts short simulated homers into wall doubles',()=>{
 const app=boot();
 assert.equal(app.fence(1),315);
 assert.equal(app.fence(5),404);
 assert.equal(app.fence(3),322);
 assert.equal(app.adjust('MEDIUM',5,4).bases,2);
 assert.equal(app.adjust('HARD',5,4).bases,4);
});
test('wall-contact ball flight shows a distinct marker and accessible simulated call',()=>{
 const app=boot([0,.01]);
 app.state.screen='Drill';app.state.zone=5;app.state.contact='MEDIUM';
 app.swing();
 assert.equal(app.state.trainingFeedback,'OFF THE WALL — DOUBLE!');
 assert.ok(app.created.some(n=>n.className.includes('wall-contact')));
 const call=app.created.find(n=>n.className==='play-call');
 assert.ok(call);
 assert.equal(call.attributes.role,'status');
 assert.equal(call.attributes['aria-live'],'polite');
 assert.match(call.textContent,/OFF THE WALL/);
 assert.match(app.field(),/Tropicana Field simulated field/);
 assert.match(app.field(),/data-zone="9"/);
 assert.ok(app.writes.every(([key])=>key==='hitlab-v7-visual-prototype-only'));
});

test('low-zone home run is announced as a fly ball, not a ground ball',()=>{
 const app=boot([0,.01]);
 app.state.screen='Drill';app.state.zone=9;app.state.contact='HARD';
 app.swing();
 assert.equal(app.state.trainingFeedback,'HOME RUN!');
 const call=app.created.find(n=>n.className==='play-call');
 assert.match(call.textContent,/^FLY BALL · HOME RUN!/);
});
test('low-zone outs remain ground balls while low-zone wall hits are fly balls',()=>{
 const out=boot([.99]);
 out.state.screen='Drill';out.state.zone=9;out.swing();
 assert.match(out.created.find(n=>n.className==='play-call').textContent,/^GROUND BALL · BALL IN PLAY — OUT/);
 const wall=boot([0,.01]);
 wall.state.screen='Drill';wall.state.zone=8;wall.state.contact='MEDIUM';wall.swing();
 assert.equal(wall.state.trainingFeedback,'OFF THE WALL — DOUBLE!');
 assert.match(wall.created.find(n=>n.className==='play-call').textContent,/^FLY BALL · OFF THE WALL/);
});
