'use strict';
// Isolated V7 prototype: in-memory practice input only. Never reads/writes career storage.
(()=>{
 const $=id=>document.getElementById(id);
 const zones=Array.from(document.querySelectorAll('[data-zone]'));
 const contacts=Array.from(document.querySelectorAll('[data-contact]'));
 const swings=[];
 let zone=null,contact=null;
 const selected=(buttons,key,value)=>{
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset[key]===value));
 };
 const render=()=>{
  selected(zones,'zone',zone);
  selected(contacts,'contact',contact);
  $('record').disabled=!(zone&&contact);
  $('undo').disabled=swings.length===0;
  $('count').textContent=String(swings.length);
  const list=$('history');list.replaceChildren();
  for(const item of swings){
   const li=document.createElement('li');
   li.textContent=item.zone+' • '+item.contact+' contact • '+(item.hand==='L'?'left':'right')+'-handed';
   list.append(li);
  }
 };
 zones.forEach((button,i)=>{
  button.addEventListener('click',()=>{zone=button.dataset.zone;render();});
  button.addEventListener('keydown',event=>{
   const offset={ArrowRight:1,ArrowLeft:-1,ArrowDown:3,ArrowUp:-3}[event.key];
   if(offset===undefined)return;
   const next=i+offset;
   if(next<0||next>=zones.length)return;
   event.preventDefault();zones[next].focus();
  });
 });
 contacts.forEach(button=>button.addEventListener('click',()=>{contact=button.dataset.contact;render();}));
 $('record').addEventListener('click',()=>{
  if(!zone||!contact)return;
  const entry={zone,contact,hand:$('hand').value,kind:'self-reported-practice'};
  swings.push(entry);
  $('feedback').textContent='Practice swing '+swings.length+' recorded: '+entry.zone+' / '+entry.contact+'.';
  zone=null;contact=null;render();
 });
 $('undo').addEventListener('click',()=>{
  if(!swings.length)return;
  swings.pop();$('feedback').textContent='Last practice swing undone.';render();
 });
 render();
})();
