(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./learning-core'));
  else root.TibyanGrowth=factory(root.TibyanLearning);
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  var DAY=86400000;
  function invalid(message){var error=new Error(message);error.statusCode=400;throw error;}
  function settings(value){
    if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value.examDate||'')||!Number.isFinite(Date.parse(value.examDate+'T00:00:00+03:00'))||C.dayKey(Date.parse(value.examDate+'T00:00:00+03:00'))!==value.examDate)invalid('حددي تاريخ اختبار صحيحًا.');
    var minutes=Number(value.minutes),days=Array.from(new Set(Array.isArray(value.days)?value.days:[]));
    if(!Number.isInteger(minutes)||minutes<10||minutes>180||!days.length||days.some(function(d){return !Number.isInteger(d)||d<0||d>6;}))invalid('اختاري وقتًا من ١٠ إلى ١٨٠ دقيقة ويومًا واحدًا على الأقل.');
    return {examDate:value.examDate,minutes:minutes,days:days.sort(),track:value.track==='tahsili'?'tahsili':'qudrat'};
  }
  function entries(sessions,track){var rows=[];(sessions||[]).forEach(function(s){(s.entries||[]).forEach(function(e){if(!track||e.track===track)rows.push(Object.assign({at:s.at,mode:s.mode},e));});});return rows;}
  function priority(names,rows){
    return names.map(function(name){var sample=rows.filter(function(e){return e.skill===name;}).slice(-20),independent=sample.filter(function(e){return !(e.hints>0);}),right=independent.filter(function(e){return e.ok;}).length;
      var pct=independent.length?Math.round(right/independent.length*100):null;
      var risk=sample.filter(function(e){return e.confidence==='high'&&!e.ok;}).length;
      return {name:name,n:independent.length,pct:pct,score:(pct===null?90:100-pct)+(sample.filter(function(e){return !e.ok;}).length*3)+risk*8,reason:risk?'إجابات خاطئة مع ثقة مرتفعة':!independent.length?'لم تُقاس هذه المهارة بعد':pct<65?'دقة الحل المستقل تحتاج دعمًا':'تثبيت المهارة'};
    }).sort(function(a,b){return b.score-a.score||a.name.localeCompare(b.name,'ar');});
  }
  function plan(preferences,sessions,names,now){
    var p=settings(preferences),today=C.dayKey(now||Date.now()),start=Date.parse(today+'T00:00:00+03:00'),exam=Date.parse(p.examDate+'T00:00:00+03:00');
    var ranked=priority(names,entries(sessions,p.track)),dates=[],capacity=Math.max(3,Math.floor(p.minutes*60/90));
    for(var d=0;d<Math.min(366,Math.ceil((exam-start)/DAY));d++){
      var at=start+d*DAY,weekday=new Date(at+3*3600000).getUTCDay();if(!p.days.includes(weekday))continue;
      var date=C.dayKey(at),completed=entries(sessions,p.track).filter(function(e){return e.purpose==='plan'&&C.dayKey(e.at)===date;}).length;
      dates.push({date:date,skill:ranked.length?ranked[dates.length%Math.min(3,ranked.length)].name:null,target:capacity,completed:completed,remaining:Math.max(0,capacity-completed)});
    }
    return {today:today,daysLeft:Math.max(0,Math.ceil((exam-start)/DAY)),expired:exam<=start,dates:dates.slice(0,7),studyDays:dates.length,priority:ranked,minutes:p.minutes};
  }
  function calibration(rows){
    var out={independent:0,assisted:0,confidentWrong:0,uncertainRight:0,uncertainWrong:0,unrated:0,total:rows.length};
    rows.forEach(function(e){if(e.hints>0){out.assisted++;return;}if(e.confidence==='high'){if(e.ok)out.independent++;else out.confidentWrong++;}else if(e.confidence==='low'){if(e.ok)out.uncertainRight++;else out.uncertainWrong++;}else out.unrated++;});return out;
  }
  function timing(rows){
    var timed=rows.filter(function(e){return e.secs>0;}),total=timed.reduce(function(n,e){return n+e.secs;},0);
    return {n:rows.length,seconds:Math.round(total),average:timed.length?Math.round(total/timed.length):null,unanswered:rows.filter(function(e){return e.picked==null;}).length,quickWrong:rows.filter(function(e){return !e.ok&&e.picked!=null&&e.secs>0&&e.secs<=15;}),slow:rows.filter(function(e){return e.secs>=90;}),revisited:rows.filter(function(e){return e.visits>1;}).length,rows:rows};
  }
  function alerts(student,sessions,assignments,now){
    now=now||Date.now();var out=[],week=C.weekly(sessions,now),current=week.current,previous=week.previous;
    var recent=entries(sessions).filter(function(e){return Date.parse(e.at)>=now-7*DAY;}),errors={};recent.forEach(function(e){if(!e.ok)errors[e.skill]=(errors[e.skill]||0)+1;});
    Object.keys(errors).forEach(function(skill){if(errors[skill]>=3)out.push({type:'skill',skill:skill,reason:'تعثر متكرر في '+skill,count:errors[skill]});});
    if(current.n>=5&&previous.n>=5&&previous.accuracy-current.accuracy>=15)out.push({type:'accuracy',reason:'انخفاض الدقة مقارنة بالأسبوع السابق',count:previous.accuracy-current.accuracy});
    var latest=(sessions||[]).reduce(function(last,s){return Math.max(last,Date.parse(s.at)||0);},0);
    if(latest&&now-latest>=7*DAY)out.push({type:'inactive',reason:'لا توجد جلسات خلال آخر سبعة أيام',count:Math.floor((now-latest)/DAY)});
    (assignments||[]).forEach(function(a){var recipient=(a.recipients||[]).find(function(r){return Number(r.student_id)===Number(student.id);});if(recipient&&!recipient.submittedAt&&!a.archived&&Date.parse(a.due_at)<now)out.push({type:'assignment',skill:a.skill,reason:'مهمة متأخرة: '+a.title,count:1});});
    var calibrationResult=calibration(recent),highWrong=calibrationResult.confidentWrong;
    if(highWrong>=3)out.push({type:'confidence',reason:'أخطاء متكررة مع ثقة مرتفعة بالإجابة',count:highWrong});
    return out;
  }
  return {settings:settings,entries:entries,priority:priority,plan:plan,calibration:calibration,timing:timing,alerts:alerts};
});
