(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.TibyanLearning=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var DAY=86400000;
  function invalid(message){var error=new Error(message);error.statusCode=400;throw error;}
  function questionText(q){return q.pair?q.pair[0]+' ← '+q.pair[1]+' … '+q.pair[2]+' ← ؟':String(q.q||'');}
  function key(q){
    var text=JSON.stringify([q.skill||'',questionText(q).replace(/\s+/g,' ').trim(),q.c||[]]);
    var a=2166136261,b=5381;
    for(var i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
    return 'q-'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
  }
  function cleanQuestion(value){
    if(!value||!Array.isArray(value.c)||value.c.length!==4||!Number.isInteger(value.a)||value.a<0||value.a>3) invalid('بيانات السؤال غير مكتملة.');
    var out={skill:String(value.skill||'').trim().slice(0,120),q:String(value.q||'').trim().slice(0,4000),c:value.c.map(function(x){return String(x).trim().slice(0,1000);}),a:value.a,e:String(value.e||'').slice(0,4000)};
    if(!out.skill||!out.q||out.c.some(function(x){return !x;})||new Set(out.c).size!==4)invalid('السؤال يحتاج نصًا ومهارة وأربعة خيارات مختلفة.');
    if(['quant','verbal','saat'].indexOf(value.s)>=0)out.s=value.s;
    if(value.p)out.p=String(value.p).slice(0,8000);
    if(Array.isArray(value.pair)&&value.pair.length===3)out.pair=value.pair.map(function(x){return String(x).slice(0,200);});
    if(value.hint)out.hint=String(value.hint).slice(0,1000);
    if(Array.isArray(value.steps))out.steps=value.steps.slice(0,15).map(function(x){return String(x).slice(0,1000);});
    return out;
  }
  function empty(){return {sessions:[],reviews:{}};}
  function stateFromSessions(sessions,legacy){
    var state=empty();
    (legacy||[]).forEach(function(item){
      if(!item.q)return;var k=key(item.q);
      if(!state.reviews[k])state.reviews[k]={key:k,q:item.q,skill:item.q.skill,stage:'needs',successes:0,dueAt:0,why:item.why||'',lastError:item.createdAt||null};
    });
    (sessions||[]).slice().sort(function(a,b){return new Date(a.at)-new Date(b.at);}).forEach(function(session){
      var now=new Date(session.at).getTime(); if(!Number.isFinite(now))return;
      var entries=Array.isArray(session.entries)?session.entries:[];
      entries.forEach(function(item){
        if(item.ok||!item.q)return;var k=key(item.q);
        state.reviews[k]={key:k,q:item.q,skill:item.skill||item.q.skill,stage:'needs',successes:0,dueAt:now,why:item.why||'',lastError:session.at};
      });
      var target=session.reviewKey&&state.reviews[session.reviewKey];
      if(target&&target.stage!=='mastered'&&now>=target.dueAt&&entries.length&&entries.every(function(x){return x.ok&&!(x.hints>0)&&x.skill===target.skill;})){
        target.successes++;
        target.stage=target.successes>=3?'mastered':'improved';
        target.dueAt=target.stage==='mastered'?null:now+(target.successes===1?1:3)*DAY;
        target.lastReview=session.at;
      }else if(target&&entries.some(function(x){return !x.ok&&x.skill===target.skill;})){
        target.stage='needs';target.successes=0;target.dueAt=now;target.lastError=session.at;
      }
      state.sessions.push(session);
    });
    return state;
  }
  function dayKey(at){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
  function weekly(sessions,now,track){
    var today=dayKey(now||Date.now()),end=new Date(today+'T00:00:00+03:00').getTime()+DAY;
    function summary(from,to){
      var rows=(sessions||[]).filter(function(s){var t=new Date(s.at).getTime();return t>=from&&t<to;});
      var entries=[];rows.forEach(function(s){(s.entries||[]).forEach(function(x){if(!track||x.track===track)entries.push(x);});});
      var timed=entries.filter(function(x){return Number(x.secs)>0;});
      return {n:entries.length,right:entries.filter(function(x){return x.ok;}).length,accuracy:entries.length?Math.round(entries.filter(function(x){return x.ok;}).length/entries.length*100):null,seconds:timed.length?Math.round(timed.reduce(function(n,x){return n+x.secs;},0)/timed.length):null,skills:entries.reduce(function(out,x){var s=out[x.skill]||(out[x.skill]={n:0,ok:0});s.n++;if(x.ok)s.ok++;return out;},{})};
    }
    var days=[];
    for(var n=6;n>=0;n--){var start=end-(n+1)*DAY;days.push({date:dayKey(start),stats:summary(start,start+DAY)});}
    return {current:summary(end-7*DAY,end),previous:summary(end-14*DAY,end-7*DAY),days:days};
  }
  function mastery(skills){
    return Object.keys(skills||{}).map(function(name){
      var item=skills[name],n=Number(item.n)||0,ok=Number(item.ok)||0,pct=n?Math.round(ok/n*100):null;
      return {name:name,n:n,ok:ok,pct:pct,status:n<5?'insufficient':pct>=85?'mastered':pct>=65?'improving':'needs'};
    });
  }
  return {key:key,questionText:questionText,cleanQuestion:cleanQuestion,stateFromSessions:stateFromSessions,empty:empty,weekly:weekly,mastery:mastery,dayKey:dayKey};
});
