/* Pure parsing algorithms. All construction and trace events are immutable snapshots. */
export const EPS='ε';
const copy=x=>JSON.parse(JSON.stringify(x));
const uniq=a=>[...new Set(a)];
export function grammar(text){
 const lines=text.split(/\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length)throw Error('Enter at least one production.');
 const rules=[], nts=[];
 for(const [i,line] of lines.entries()){
  const m=line.match(/^([^\s|]+)\s*(?:->|→)\s*(.*)$/);if(!m||!m[2].trim())throw Error(`Line ${i+1}: use A -> symbols | alternative. Write ε for an empty production.`);
  if(['ε','eps','$'].includes(m[1])||m[1].includes('->'))throw Error(`Line ${i+1}: invalid nonterminal.`);
  nts.push(m[1]);for(const alt of m[2].split('|')){if(!alt.trim())throw Error(`Line ${i+1}: an empty alternative must be written ε or eps.`);let rhs=alt.trim().split(/\s+/);if(rhs.some(x=>['ε','eps'].includes(x))){if(rhs.length!==1)throw Error(`Line ${i+1}: ε must stand alone.`);rhs=[];}if(rhs.some(x=>x==='$'||x.includes('->')||x==='→'))throw Error(`Line ${i+1}: $ is reserved for end of input; separate symbols with spaces.`);rules.push({lhs:m[1],rhs});}
 }
 const nonterminals=uniq(nts);let augmented=nonterminals[0]+"'";const all=uniq(rules.flatMap(p=>[p.lhs,...p.rhs]));while(all.includes(augmented))augmented+="'";
 const productions=[{lhs:augmented,rhs:[nonterminals[0]]},...rules].map((p,id)=>({...p,id}));
 if(productions.length>100)throw Error('Use at most 99 productions for this teaching lab.');
 const terminals=uniq(rules.flatMap(p=>p.rhs).filter(s=>!nonterminals.includes(s)));
 return {productions,nonterminals,terminals,start:nonterminals[0],augmented};
}
export function sets(g){
 const ns=[g.augmented,...g.nonterminals],first=Object.fromEntries(ns.map(n=>[n,new Set()])),follow=Object.fromEntries(ns.map(n=>[n,new Set()]));
 for(const t of [...g.terminals,'$'])first[t]=new Set([t]);
 const seq=xs=>{const out=new Set();let nullable=true;for(const x of xs){for(const a of first[x]??[])if(a!==EPS)out.add(a);if(!first[x]?.has(EPS)){nullable=false;break;}}if(nullable)out.add(EPS);return out;};
 let changed=true;while(changed){changed=false;for(const p of g.productions)for(const t of seq(p.rhs))if(!first[p.lhs].has(t)){first[p.lhs].add(t);changed=true;}}
 follow[g.start].add('$');follow[g.augmented].add('$');changed=true;
 while(changed){changed=false;for(const p of g.productions)for(let i=0;i<p.rhs.length;i++){const b=p.rhs[i];if(!follow[b])continue;const tail=seq(p.rhs.slice(i+1));for(const t of tail)if(t!==EPS&&!follow[b].has(t)){follow[b].add(t);changed=true;}if(tail.has(EPS))for(const t of follow[p.lhs])if(!follow[b].has(t)){follow[b].add(t);changed=true;}}}
 return {first,follow,seq};
}
const ik=i=>JSON.stringify([i.p,i.dot,i.la??null]);
const sk=items=>items.map(ik).sort().join('|');
const core=items=>uniq(items.map(i=>`${i.p}:${i.dot}`)).sort().join('|');
export function closure(g,seed,lr1=false,s=sets(g),onAdd=()=>{}){
 const items=seed.map(copy),seen=new Set(items.map(ik));
 for(let k=0;k<items.length;k++){
  const item=items[k],p=g.productions[item.p],b=p.rhs[item.dot];if(!g.nonterminals.includes(b))continue;
  const las=lr1?[...s.seq([...p.rhs.slice(item.dot+1),item.la])].filter(a=>a!==EPS):[undefined];
  for(const q of g.productions.filter(p=>p.lhs===b))for(const la of las){const next={p:q.id,dot:0,...(lr1?{la}:{})};if(!seen.has(ik(next))){seen.add(ik(next));items.push(next);onAdd(copy(next),copy(item),copy(items));}}
 }
 return items;
}
export function goto(g,items,symbol,lr1=false,s=sets(g)){
 return closure(g,items.filter(i=>g.productions[i.p].rhs[i.dot]===symbol).map(i=>({...i,dot:i.dot+1})),lr1,s);
}
export function itemText(g,i){const p=g.productions[i.p],rhs=[...p.rhs];rhs.splice(i.dot,0,'•');return `${p.lhs} → ${rhs.join(' ')}${i.la!==undefined?' , '+i.la:''}`;}
export const productionText=p=>`${p.lhs} → ${p.rhs.join(' ')||EPS}`;
export function buildLR(g,variant){
 const lr1=variant==='CLR(1)'||variant==='LALR(1)',s=sets(g),states=[],edges=[],events=[],origins=[];
 const emit=(message,active={})=>events.push({phase:'collection',message,states:copy(states),edges:copy(edges),active:copy(active)});
 const seed=[{p:0,dot:0,...(lr1?{la:'$'}:{})}];states.push({id:0,items:copy(seed),kernel:copy(seed)});origins.push({from:null,symbol:null,seed:copy(seed),additions:[]});
 emit(`Augment with ${productionText(g.productions[0])}. Seed I0 with the start item.`,{state:0,item:seed[0]});
 const closeState=id=>{const additions=[];states[id].items=closure(g,states[id].kernel,lr1,s,(next,from,items)=>{states[id].items=items;additions.push({next,from});emit(`Closure I${id}: the dot before ${g.productions[from.p].rhs[from.dot]} adds ${itemText(g,next)}.`,{state:id,item:next,source:from});});origins[id].additions=additions;emit(`Closure I${id} is complete (${states[id].items.length} items).`,{state:id});};
 closeState(0);const known=new Map([[sk(states[0].items),0]]);
 for(let id=0;id<states.length;id++){
  const symbols=uniq(states[id].items.map(i=>g.productions[i.p].rhs[i.dot]).filter(Boolean));
  for(const symbol of symbols){
   const kernel=states[id].items.filter(i=>g.productions[i.p].rhs[i.dot]===symbol).map(i=>({...i,dot:i.dot+1}));
   emit(`GOTO(I${id}, ${symbol}): move the dot across ${symbol}, then take closure.`,{state:id,symbol});
   const items=closure(g,kernel,lr1,s),key=sk(items);let target=known.get(key);
   if(target===undefined){target=states.length;if(target>=100)throw Error('Construction exceeds 100 states. Use a smaller grammar.');known.set(key,target);states.push({id:target,items:copy(kernel),kernel:copy(kernel)});origins.push({from:id,symbol,seed:copy(kernel),additions:[]});edges.push({from:id,to:target,symbol});emit(`Create I${target} from GOTO(I${id}, ${symbol}).`,{state:target,edge:edges.length-1});closeState(target);}
   else {edges.push({from:id,to:target,symbol});emit(`GOTO(I${id}, ${symbol}) matches I${target}; add the transition.`,{state:target,edge:edges.length-1});}
  }
 }
 let canonical=copy(states),canonicalOrigins=copy(origins),mergeGroups=null;
 if(variant==='LALR(1)'){
  const groups=new Map();for(const st of states){const k=core(st.items);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(st.id);}mergeGroups=[...groups.values()];const map=new Map();mergeGroups.forEach((ids,j)=>ids.forEach(i=>map.set(i,j)));
  emit(`CLR(1) collection complete. Group ${states.length} states by identical LR(0) cores before merging lookaheads.`,{merging:true});
  for(const [j,ids] of mergeGroups.entries())emit(`Merge group M${j}: ${ids.map(i=>'I'+i).join(' + ')}. Preserve the core and union lookaheads; never merge different cores.`,{merge:ids,state:ids[0]});
  const merged=mergeGroups.map((ids,id)=>({id,items:uniqItems(ids.flatMap(i=>states[i].items)),kernel:uniqItems(ids.flatMap(i=>states[i].kernel)),mergedFrom:ids}));
  const newEdges=[];for(const e of edges){const next={from:map.get(e.from),to:map.get(e.to),symbol:e.symbol};if(!newEdges.some(x=>JSON.stringify(x)===JSON.stringify(next)))newEdges.push(next);}
  states.splice(0,states.length,...merged);edges.splice(0,edges.length,...newEdges);emit(`LALR(1) merge complete: ${canonical.length} CLR states → ${states.length} merged states.`,{state:0,merged:true});
 }
 const table={},tableEvents=[],conflicts=[];
 const add=(state,symbol,action,item,reason)=>{const key=`${state}|${symbol}`,cell=table[key]??[];if(cell.some(a=>a.kind===action.kind&&a.to===action.to&&a.p===action.p))return;
  table[key]=[...cell,{...action,item,reason}];const conflict=table[key].length>1&&action.kind!=='goto';if(conflict){const kinds=table[key].map(x=>x.kind);const type=kinds.includes('shift')&&kinds.includes('reduce')?'shift-reduce':kinds.filter(x=>x==='reduce').length>1?'reduce-reduce':'action conflict';conflicts.push({state,symbol,type,actions:copy(table[key])});}
  tableEvents.push({phase:'table',states:copy(states),edges:copy(edges),table:copy(table),active:{state,symbol,item,cell:key},message:`${conflict?'CONFLICT — ':''}I${state}, ${symbol}: ${actionLabel(action)}. ${reason}${conflict?` This grammar is not ${variant}; this cell has multiple actions.`:''}`});};
 for(const st of states){for(const e of edges.filter(e=>e.from===st.id)){const terminal=g.terminals.includes(e.symbol),item=st.items.find(i=>g.productions[i.p].rhs[i.dot]===e.symbol);add(st.id,e.symbol,{kind:terminal?'shift':'goto',to:e.to},item,`${terminal?'Shift':'GOTO'} from the transition I${e.from} —${e.symbol}→ I${e.to}.`);}
  for(const i of st.items){const p=g.productions[i.p];if(i.dot!==p.rhs.length)continue;if(i.p===0){add(st.id,'$',{kind:'accept'},i,'The augmented start item is complete on end of input.');continue;}
   const lookaheads=variant==='LR(0)'?[...g.terminals,'$']:variant==='SLR(1)'?[...s.follow[p.lhs]]:[i.la];
   for(const t of lookaheads)add(st.id,t,{kind:'reduce',p:i.p},i,`${productionText(p)} is complete. ${variant==='LR(0)'?'LR(0) reduces on every terminal.':variant==='SLR(1)'?`${t} ∈ FOLLOW(${p.lhs}).`:`Item lookahead is ${t}.`}`);
  }
 }
 tableEvents.push({phase:'table',states:copy(states),edges:copy(edges),table:copy(table),active:{},message:conflicts.length?`Construction complete. ${conflicts.length} conflicting insertion(s): the grammar is not ${variant}. Trace defaults to stopping at any encountered conflict.`:`Construction complete. No conflicts: this grammar is ${variant}. You can now test a string.`});
 return {g,variant,sets:s,states,edges,events:[...events,...tableEvents],collectionCount:events.length,table,conflicts,origins,canonical,canonicalOrigins,mergeGroups};
}
function uniqItems(items){const m=new Map(items.map(i=>[ik(i),i]));return [...m.values()];}
export function actionLabel(a){return a.kind==='shift'?'s'+a.to:a.kind==='reduce'?'r'+a.p:a.kind==='goto'?String(a.to):'accept';}
export function tokenize(g,text){const tokens=text.trim()?text.trim().split(/\s+/):[];const bad=tokens.find(t=>!g.terminals.includes(t));if(bad)throw Error(`Unknown token “${bad}”. Terminals: ${g.terminals.join(', ')||'(none)'}. Separate tokens with spaces; do not type $.`);return [...tokens,'$'];}
export function parseLR(model,text,policy='stop'){
 const {g,table}=model,input=tokenize(g,text),stack=[0],out=[],seen=new Set();let pos=0,resolutions=0;
 const push=(message,status='running',active={})=>out.push({phase:'parse',message,status,stack:copy(stack),input:input.slice(pos),position:pos,resolutions,active});
 push('Start with state 0 on the stack and append the end marker $.');
 for(let step=0;step<1000;step++){
  const st=stack.at(-1),token=input[pos],key=`${st}|${token}`,actions=table[key]??[];const fingerprint=JSON.stringify([stack,pos]);
  if(seen.has(fingerprint)){push('REJECT — a reduction cycle repeats the same stack and input.','reject',{cell:key,state:st,symbol:token});return out;}seen.add(fingerprint);
  const active={cell:key,state:st,symbol:token};
  if(!actions.length){push(`REJECT at token ${pos+1} (${token}): ACTION[I${st}, ${token}] is empty.`,'reject',active);return out;}
  let a=actions[0],prefix='';if(actions.length>1){const choices=actions.map(actionLabel).join(' / ');if(policy==='stop'){push(`REJECT by this deterministic parser: conflict at ACTION[I${st}, ${token}] = ${choices}. No action chosen. This does not prove the string is outside the grammar's language.`,'conflict',active);return out;}resolutions++;a=policy==='shift'?(actions.find(a=>a.kind==='shift')??actions.filter(a=>a.kind==='reduce').sort((a,b)=>a.p-b.p)[0]):(actions.filter(a=>a.kind==='reduce').sort((a,b)=>a.p-b.p)[0]??actions[0]);prefix=`CONFLICT ${choices}; explicit ${policy==='shift'?'prefer shift':'prefer lowest-numbered reduction'} policy selects ${actionLabel(a)}. `;}
  active.item=a.item;
  if(a.kind==='accept'){push(`${prefix}ACCEPT${resolutions?` under the selected conflict policy (${resolutions} resolved conflict(s)); the grammar remains non-${model.variant}.`:': the augmented start production is complete and input is exhausted.'}`,'accept',active);return out;}
  if(a.kind==='shift'){stack.push(token,a.to);pos++;push(`${prefix}Shift ${token}; push state ${a.to}.`,'running',active);}
  else if(a.kind==='reduce'){const p=g.productions[a.p];stack.splice(stack.length-2*p.rhs.length,2*p.rhs.length);const next=(table[`${stack.at(-1)}|${p.lhs}`]??[]).find(a=>a.kind==='goto');if(!next){push(`REJECT: missing GOTO after ${productionText(p)}.`,'reject',active);return out;}stack.push(p.lhs,next.to);push(`${prefix}Reduce r${p.id}: ${productionText(p)}. Pop ${2*p.rhs.length} stack entries; GOTO on ${p.lhs} pushes I${next.to}.`,'running',active);}
 }
 push('Stopped after 1,000 actions: trace limit reached, no acceptance claim.','limit');return out;
}
