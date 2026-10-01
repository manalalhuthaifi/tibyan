(function(){
  'use strict';
  var C=window.TibyanLearning;
  var L=window.Learning={transport:api,data:{state:C.empty(),assignments:[],metadata:[],reports:[]},loaded:false,error:'',pending:[],context:null,sessionId:'',mockTimes:[],mockStarted:0,mockIndex:0,reviewFilter:'due',mapFilter:'all',bankFilter:'all',track:'qudrat'};
  var labels={needs:'تحتاج مراجعة',improved:'تحسنت',improving:'في طور التحسن',mastered:'أتقنت',insufficient:'بيانات غير كافية',reviewed:'مراجع',pending:'تحتاج مراجعة',easy:'سهل',medium:'متوسط',hard:'صعب',unspecified:'غير محدد',open:'قيد المراجعة',resolved:'تمت المعالجة',dismissed:'أُغلق بعد المراجعة'};
  var views={'review-center':'أتقني أخطاءكِ','skill-map':'خريطة المهارات','weekly-report':'تقرير التقدم الأسبوعي','assignments':'مهام المعلمة','question-bank':'بنك الأسئلة الموثّق'};
  var curated=[
    ['الورق مادة تُستخدم مع المقص، وليس وظيفة للمقص.','','الحديد مادة قد يُصنع منها المقص، وليس وظيفته.','الخياطة وظيفة مرتبطة بالإبرة؛ المقص يُستخدم للقص.'],
    ['', 'النجاح تحقق بالفعل؛ «بعيد المنال» لا يقابل العمل المتصل بعد «بل».','«محل شك» لا يوضح التناقض بين الصدفة والعمل المستمر.','«سابقًا لأوانه» يتعلق بالتوقيت، ولا يفسر سبب النجاح.'],
    ['«أثنى» تتفق مع الالتزام والإتقان الواردين في الجملة.','','الالتزام بالمواعيد سبب للثناء، ويتفق مع معنى الجملة.','الإتقان سبب للمدح، فلا يناقض السياق.'],
    ['النص ينفي البرودة صراحة بوصفها سببًا لانخفاض النشاط.','','لم يذكر النص قلة الأزهار سببًا لانخفاض النشاط.','لم يذكر النص ثقل الرطوبة؛ السبب المذكور هو صعوبة الملاحة.'],
    ['الكتاب أداة يستعملها المعلم، بينما العلاقة المطلوبة هي مكان العمل.','الطالب هو من يتلقى التعليم، وليس مكان عمل المعلم.','','المنهج محتوى يُدرّس، وليس مكان العمل.'],
    ['الطريق الممهد يسهل القيادة، فلا يفسر الاضطرار إلى تخفيف السرعة.','','اتساع الطريق لا يفسر وحده ضرورة تخفيف السرعة.','إضاءة الطريق تحسن الرؤية، ولا تفسر الاضطرار إلى تخفيف السرعة.']
  ];
  var defaultMetadata={};curated.forEach(function(d,n){if(Q[n])defaultMetadata[C.key(Q[n])]={source:'بنك تبيان المدرسي',difficulty:'easy',review_status:'pending',distractors:d};});
  function uid(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():'session-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
  function date(value){return value?new Date(value).toLocaleDateString('ar-SA-u-ca-gregory',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Riyadh'}):'متاحة الآن';}
  function badge(value){return '<span class="learning-badge '+esc(value)+'">'+esc(labels[value]||value)+'</span>';}
  function stat(label,value){return '<div class="learning-stat"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';}
  function qText(q){return C.questionText(q);}
  function fullQuestion(q){return Object.assign({},q,{s:q.s||sectionOfSkill(q.skill)||'verbal'});}
  function meta(q){return L.data.metadata.find(function(m){return m.question_key===C.key(q);})||defaultMetadata[C.key(q)]||{source:q.by?'إعداد: '+q.by:'بنك تبيان المدرسي',difficulty:'unspecified',review_status:'pending',distractors:['','','','']};}
  function message(text){return '<p class="learning-note" role="status">'+esc(text)+'</p>';}
  function button(name,title,description){return '<button type="button" data-learn-nav="'+name+'"><span>'+esc(title)+(description?'<small>'+esc(description)+'</small>':'')+'</span><span class="arrow" aria-hidden="true">←</span></button>';}
  Object.keys(views).forEach(function(name){
    var main=document.createElement('main');main.id='v-'+name;main.className='hidden learning-page';
    main.innerHTML='<div class="wrap"><div class="head"><h1>'+views[name]+'</h1></div><div id="learning-'+name+'"></div></div>';
    document.querySelector('footer').before(main);VIEWS.push(name);
  });
  var home=document.createElement('div');home.className='band';home.id='learning-home-links';
  home.innerHTML='<h2>متابعة التعلم</h2><div class="learning-links">'+button('review-center','أتقني أخطاءكِ','مراجعة متباعدة وتدريب موجّه')+button('skill-map','خريطة المهارات','تقدّمكِ في كل مهارة')+button('weekly-report','التقرير الأسبوعي','الدقة والوقت والتحسن')+button('assignments','مهام المعلمة','التكليفات ومواعيد التسليم')+'</div>';
  document.querySelector('#v-home .home-overview').after(home);
  var teacherLinks=document.createElement('div');teacherLinks.className='learning-links no-print';
  teacherLinks.innerHTML=button('assignments','مهام الطالبات','إنشاء التكليفات ومتابعة التسليم')+button('question-bank','مراجعة بنك الأسئلة','المصادر وشروح الخيارات والبلاغات');
  document.querySelector('#v-teacher .head').after(teacherLinks);
  var bankLink=document.createElement('div');bankLink.className='learning-links';bankLink.innerHTML=button('question-bank','بنك الأسئلة الموثّق','المصادر والمراجعة والبلاغات');
  document.querySelector('#v-qadd .head').after(bankLink);
  var doneLink=document.createElement('div');doneLink.className='learning-links';doneLink.innerHTML=button('review-center','متابعة إتقان الأخطاء')+button('assignments','العودة إلى المهام');
  document.querySelector('#v-done .wrap').appendChild(doneLink);
  var sync=document.createElement('div');sync.id='learning-sync';sync.className='learning-sync hidden';sync.setAttribute('role','status');
  document.querySelector('#topbar-el').after(sync);
  var feedback=document.createElement('div');feedback.id='learning-feedback';feedback.className='learning-feedback';el('q-after').appendChild(feedback);
  var reportButton=document.createElement('button');reportButton.className='link';reportButton.style.marginTop='18px';reportButton.textContent='الإبلاغ عن مشكلة في السؤال';reportButton.dataset.learnAction='report-current';el('v-quiz').querySelector('.wrap').appendChild(reportButton);
  var dialog=document.createElement('dialog');dialog.id='learning-dialog';dialog.className='learning-dialog';document.body.appendChild(dialog);
  function syncStatus(){
    sync.classList.toggle('hidden',!L.pending.length);
    sync.innerHTML=L.pending.length?'<span>تعذّر حفظ '+ar(L.pending.length)+' جلسة. نتائجها لم تتزامن بعد.</span><button type="button" data-learn-action="retry-save">إعادة محاولة الحفظ</button>':'';
  }
  L.load=function(){
    return api('/api/learning').then(function(data){L.data={state:data.state||C.empty(),assignments:data.assignments||[],metadata:data.metadata||[],reports:data.reports||[]};L.loaded=true;L.error='';return L.data;}).catch(function(error){L.error=error.message;throw error;});
  };
  function refresh(name){return L.load().then(function(){if(curView===name)paint(name);}).catch(function(){if(curView===name)paint(name);});}
  L.open=function(name){if(!views[name])return;L.track=me.activeTrack||'qudrat';view(name);if(!L.loaded)refresh(name);};
  function paint(name){
    var box=el('learning-'+name);if(!box)return;
    if(!L.loaded){box.innerHTML=message(L.error||'جارٍ تحميل البيانات...')+(L.error?'<button class="btn quiet" data-learn-action="reload">إعادة المحاولة</button>':'');return;}
    if(name==='review-center')paintReviews(box);
    if(name==='skill-map')paintMap(box);
    if(name==='weekly-report')paintWeekly(box);
    if(name==='assignments')paintAssignments(box);
    if(name==='question-bank')paintBank(box);
  }
  var oldView=view;view=function(name){oldView(name);if(views[name]){paint(name);if(me.role==='student')paintTabbar(name==='review-center'?'miss':name==='skill-map'?'byskill':'home');}};
  var oldToken=setToken;setToken=function(value){L.loaded=false;L.data={state:C.empty(),assignments:[],metadata:[],reports:[]};L.pending=[];L.context=null;syncStatus();return oldToken(value);};
  var oldBootstrap=bootstrapAfterAuth;bootstrapAfterAuth=function(){return oldBootstrap().then(function(){return L.load().catch(function(){});});};
  var oldRoster=loadRoster;loadRoster=function(callback){return oldRoster(function(){L.load().catch(function(){}).then(function(){if(callback)callback();});});};
  var oldSerialize=serializeLogItem;serializeLogItem=function(item){var value=oldSerialize(item);value.q=C.cleanQuestion(fullQuestion(item.q));value.secs=item.secs||0;return value;};
  var oldStart=startQuiz;startQuiz=function(list,name,type){L.context=null;L.sessionId=uid();return oldStart(list,name,type);};
  function flushMockTime(){if(L.mockStarted){L.mockTimes[L.mockIndex]=(L.mockTimes[L.mockIndex]||0)+(Date.now()-L.mockStarted)/1000;L.mockStarted=Date.now();}}
  var oldMock=paintMock;paintMock=function(){flushMockTime();L.mockIndex=mk.i;L.mockStarted=Date.now();return oldMock();};
  el('do-mock').addEventListener('click',function(){L.context=null;L.sessionId=uid();L.mockTimes=[];L.mockStarted=0;},true);
  var oldPick=pick;pick=function(index){oldPick(index);if(mode!=='place')paintFeedback(items[i],index);};
  api=function(endpoint,options){
    if(endpoint!=='/api/attempts'||!options||!options.body)return L.transport(endpoint,options);
    var body=JSON.parse(options.body);L.sessionId=L.sessionId||uid();body.learningContext=Object.assign({sessionKey:L.sessionId},L.context||{});
    if(body.mode==='mock'){flushMockTime();L.mockStarted=0;body.log.forEach(function(item,n){item.secs=Math.round(L.mockTimes[n]||0);});}
    var request=Object.assign({},options,{body:JSON.stringify(body)});
    return saveAttempt(request).catch(function(error){if(!L.pending.some(function(p){return p.key===body.learningContext.sessionKey;}))L.pending.push({key:body.learningContext.sessionKey,request:request});syncStatus();throw error;});
  };
  function saveAttempt(request){
    return L.transport('/api/attempts',request).catch(function(error){if(error.data&&error.data.error==='هذه الجلسة محفوظة بالفعل.')return L.transport('/api/me');throw error;}).then(function(result){
      if(result.profile)applyProfile(result.profile);
      return L.load().catch(function(){}).then(function(){if(views[curView])paint(curView);return result;});
    });
  }
  function filters(values,current,attribute){return '<div class="learning-filter">'+values.map(function(v){return '<button type="button" '+attribute+'="'+v[0]+'" class="'+(v[0]===current?'on':'')+'" aria-pressed="'+(v[0]===current)+'">'+v[1]+'</button>';}).join('')+'</div>';}
  function paintReviews(box){
    var all=Object.values(L.data.state.reviews),now=Date.now();
    box.innerHTML='<div class="learning-stats">'+stat('تحتاج مراجعة',ar(all.filter(function(r){return r.stage==='needs';}).length))+stat('تحسنت',ar(all.filter(function(r){return r.stage==='improved';}).length))+stat('أتقنت',ar(all.filter(function(r){return r.stage==='mastered';}).length))+'</div>'+filters([['due','المستحقة الآن'],['needs','تحتاج مراجعة'],['improved','تحسنت'],['mastered','أتقنت'],['all','الكل']],L.reviewFilter,'data-review-filter');
    var rows=all.filter(function(r){return L.reviewFilter==='all'||L.reviewFilter==='due'?(L.reviewFilter==='all'||r.stage!=='mastered'&&r.dueAt<=now):r.stage===L.reviewFilter;}).sort(function(a,b){return (a.dueAt||Infinity)-(b.dueAt||Infinity);});
    if(!rows.length){box.innerHTML+=message(all.length?'لا توجد مراجعات في هذا التصنيف.':'لم تُسجل أخطاء للمراجعة بعد.');return;}
    box.innerHTML+='<div class="learning-grid" style="margin-top:20px">'+rows.map(function(r){
      return '<article class="learning-item"><div class="learning-meta">'+badge(r.stage)+'<span>'+esc(r.skill)+'</span></div><h2>'+esc(qText(r.q))+'</h2>'+(r.why?'<p>سبب الخطأ: '+esc(reasonLabel(r.why))+'</p>':'')+'<details><summary>الشرح والإجابة الصحيحة</summary><p>'+esc(r.q.e||'لا يوجد شرح محفوظ لهذا السؤال.')+'</p><p>الإجابة: '+esc(r.q.c[r.q.a])+'</p></details><div class="learning-meta"><span>'+ar(r.successes)+' / ٣ مراجعات ناجحة</span>'+(r.stage!=='mastered'?'<span>المراجعة: '+date(r.dueAt)+'</span>':'')+'</div>'+(r.stage!=='mastered'?'<button class="btn" data-review-start="'+r.key+'" '+(r.dueAt>now?'disabled':'')+'>تدريب المراجعة</button>':'')+'</article>';
    }).join('')+'</div>';
  }
  function paintMap(box){
    var skills={};Q.forEach(function(q){if(TRACK_OF_SECTION[q.s]===L.track&&!skills[q.skill])skills[q.skill]=me.skills[q.skill]||{n:0,ok:0};});
    var rows=C.mastery(skills);
    box.innerHTML='<div class="learning-toolbar"><label for="learning-map-track">القسم</label><select id="learning-map-track"><option value="qudrat">القدرات</option><option value="tahsili">التحصيلي</option></select></div>'+filters([['all','كل المهارات'],['needs','تحتاج تدريبًا'],['improving','في طور التحسن'],['mastered','أتقنت'],['insufficient','بيانات غير كافية']],L.mapFilter,'data-map-filter');
    el('learning-map-track').value=L.track;
    rows=rows.filter(function(r){return L.mapFilter==='all'||r.status===L.mapFilter;});
    box.insertAdjacentHTML('beforeend','<div class="learning-grid" style="margin-top:20px">'+rows.map(function(r){return '<article class="learning-item"><div class="learning-row"><h2>'+esc(r.name)+'</h2>'+badge(r.status)+'</div><div class="learning-meter"><i style="width:'+(r.pct||0)+'%"></i></div><p>'+ (r.pct===null?'لم تبدئي هذه المهارة بعد.':ar(r.pct)+'٪ دقة الإجابات · '+ar(r.n)+' محاولات')+'</p><button class="btn quiet" data-skill-start="'+esc(r.name)+'">تدريب المهارة</button></article>';}).join('')+'</div>');
    if(!rows.length)box.innerHTML+=message('لا توجد مهارات في هذا التصنيف.');
  }
  function paintWeekly(box){
    var week=C.weekly(L.data.state.sessions,Date.now(),L.track),a=week.current,b=week.previous;
    var delta=a.accuracy!==null&&b.accuracy!==null?a.accuracy-b.accuracy:null;
    box.innerHTML='<div class="learning-toolbar"><label for="learning-week-track">القسم</label><select id="learning-week-track"><option value="qudrat">القدرات</option><option value="tahsili">التحصيلي</option></select><button class="link no-print" data-learn-action="print">طباعة التقرير</button></div><div class="learning-stats">'+stat('أسئلة آخر ٧ أيام',ar(a.n))+stat('دقة الإجابات',a.accuracy===null?'—':ar(a.accuracy)+'٪')+stat('متوسط زمن الإجابة',a.seconds===null?'—':ar(a.seconds)+' ثانية')+'</div><p class="learning-note">'+(delta===null?'لا تتوفر بيانات كافية لمقارنة الأسبوعين.':delta===0?'دقة الإجابات مماثلة للأيام السبعة السابقة.':(delta>0?'تحسنت دقة الإجابات بمقدار ':'انخفضت دقة الإجابات بمقدار ')+ar(Math.abs(delta))+' نقاط مئوية مقارنة بالأيام السبعة السابقة.')+'</p>';
    el('learning-week-track').value=L.track;
    var max=Math.max(1,...week.days.map(function(d){return d.stats.n;}));
    box.insertAdjacentHTML('beforeend','<section class="learning-section"><h2>نشاط التدريب</h2><div class="learning-chart" role="img" aria-label="عدد الأسئلة المحلولة في كل يوم خلال آخر سبعة أيام">'+week.days.map(function(d){return '<div class="learning-day"><b>'+ar(d.stats.n)+'</b><div class="learning-bar-area"><div class="learning-bar" style="height:'+Math.round(d.stats.n/max*120)+'px"></div></div><small>'+new Date(d.date+'T12:00:00+03:00').toLocaleDateString('ar-SA-u-ca-gregory',{day:'numeric',month:'numeric'})+'</small></div>';}).join('')+'</div></section>');
    var skills=C.mastery(a.skills).filter(function(s){return s.n>=5;}).sort(function(x,y){return x.pct-y.pct;});
    box.insertAdjacentHTML('beforeend','<section class="learning-section"><h2>أولوية الأسبوع القادم</h2>'+(skills.length?'<p class="learning-note">ركّزي على «'+esc(skills[0].name)+'»: دقة الإجابات '+ar(skills[0].pct)+'٪ من '+ar(skills[0].n)+' محاولات.</p><button class="btn quiet" data-skill-start="'+esc(skills[0].name)+'">تدريب هذه المهارة</button>':message('أكملي خمس محاولات على الأقل في مهارة لتظهر توصية مبنية على أدائكِ.'))+'</section>');
    if(a.seconds!==null&&b.seconds!==null)box.insertAdjacentHTML('beforeend',message('متوسط الزمن في الفترة السابقة: '+ar(b.seconds)+' ثانية.'));
    var changes=Object.keys(a.skills).filter(function(name){return a.skills[name].n>=5&&b.skills[name]&&b.skills[name].n>=5;}).map(function(name){var current=a.skills[name],previous=b.skills[name];return {name:name,change:Math.round(current.ok/current.n*100)-Math.round(previous.ok/previous.n*100)};}).filter(function(item){return item.change>0;}).sort(function(x,y){return y.change-x.change;});
    box.insertAdjacentHTML('beforeend','<section class="learning-section"><h2>المهارات التي تحسنت</h2>'+(changes.length?changes.map(function(item){return '<p class="learning-note">'+esc(item.name)+' · تحسن بمقدار '+ar(item.change)+' نقاط مئوية.</p>';}).join(''):message('لا توجد مقارنة كافية تُظهر تحسن مهارة محددة خلال هذه الفترة.'))+'</section>');
  }
  function paintAssignments(box){
    if(me.role==='teacher'){
      var students=roster().filter(function(s){return s.id;}),skills=Array.from(new Set(Q.map(function(q){return q.skill;})));
      var classes=Array.from(new Set(students.map(function(s){return s.cls;})));
      box.innerHTML='<section class="learning-section"><h2>مهمة جديدة</h2><form id="learning-task-form" class="learning-form"><div class="wide"><label for="task-title">عنوان المهمة</label><input id="task-title" required maxlength="160" placeholder="مراجعة مهارة النسب"></div><div><label for="task-skill">المهارة</label><select id="task-skill">'+skills.map(function(s){return '<option>'+esc(s)+'</option>';}).join('')+'</select></div><div><label for="task-due">آخر موعد للتسليم</label><input id="task-due" type="date" required min="'+C.dayKey(Date.now())+'"></div><div><label for="task-target">إرسال إلى</label><select id="task-target"><option value="class">فصل كامل</option><option value="students">طالبات محددات</option></select></div><div id="task-class-field"><label for="task-class">الفصل</label><select id="task-class">'+classes.map(function(s){return '<option>'+esc(s)+'</option>';}).join('')+'</select></div><div class="wide hidden" id="task-students-field"><label>الطالبات</label><div class="learning-checks" id="task-students">'+students.map(function(s){return '<label><input type="checkbox" name="task-student" value="'+s.id+'"><span>'+esc(s.name)+' · '+esc(s.cls)+'</span></label>';}).join('')+'</div></div><div class="wide"><label>أسئلة المهمة</label><div class="learning-checks" id="task-questions"></div><p class="learning-status" id="task-count"></p></div><div class="wide"><label for="task-notes">ملاحظة للطالبة</label><textarea id="task-notes" maxlength="2000"></textarea></div><div class="wide"><button class="btn" id="task-submit" type="submit" '+(!students.length?'disabled':'')+'>إرسال المهمة</button><p class="learning-status" role="status" id="task-message"></p></div></form></section>';
      el('task-due').value=C.dayKey(Date.now()+7*86400000);paintTaskQuestions();
      if(!students.length)el('task-message').textContent='لا توجد حسابات طالبات متاحة لإرسال المهام.';
    }else box.innerHTML='';
    box.insertAdjacentHTML('beforeend','<section class="learning-section"><h2>'+ (me.role==='teacher'?'متابعة المهام':'مهامكِ')+'</h2><div id="task-list"></div></section>');
    var rows=L.data.assignments;
    if(!rows.length){el('task-list').innerHTML=message('لا توجد مهام حتى الآن.');return;}
    el('task-list').innerHTML='<div class="learning-grid">'+rows.map(function(a){
      var recipients=a.recipients||[],submitted=recipients.filter(function(r){return r.submittedAt;}),complete=submitted.length===recipients.length&&recipients.length>0;
      var status=a.archived?'مؤرشفة':complete?'مكتملة':new Date(a.due_at).getTime()<Date.now()?'متأخرة':'بانتظار التسليم';
      return '<article class="learning-item"><div class="learning-meta"><span class="learning-badge '+(status==='متأخرة'?'overdue':'')+'">'+status+'</span><span>'+esc(a.skill)+'</span></div><h3>'+esc(a.title)+'</h3><p>'+esc(a.notes||'')+'</p><p>التسليم: '+date(a.due_at)+' · '+ar(a.questions.length)+' أسئلة</p>'+(me.role==='teacher'?'<p>تم التسليم: '+ar(submitted.length)+' / '+ar(recipients.length)+'</p><details><summary>نتائج الطالبات</summary>'+recipients.map(function(r){return '<p>'+esc(r.name)+' — '+(r.submittedAt?ar(r.right)+' / '+ar(r.total)+' · '+date(r.submittedAt):'لم تُسلّم بعد')+'</p>';}).join('')+'</details>'+(!a.archived?'<button class="btn quiet" data-task-archive="'+a.id+'">أرشفة المهمة</button>':''):complete?'<p>نتيجتكِ: '+ar(submitted[0].right)+' / '+ar(submitted[0].total)+'</p><details><summary>مراجعة أسئلة المهمة</summary>'+a.questions.map(function(q){return '<p><b>'+esc(qText(q))+'</b><br>'+esc(q.c[q.a])+'<br>'+esc(q.e)+'</p>';}).join('')+'</details>':'<button class="btn" data-task-start="'+a.id+'">بدء المهمة</button>')+'</article>';
    }).join('')+'</div>';
  }
  function paintTaskQuestions(){
    var name=el('task-skill').value,pool=Q.filter(function(q){return q.skill===name;});
    el('task-questions').innerHTML=pool.map(function(q){return '<label><input type="checkbox" name="task-question" value="'+C.key(q)+'"><span>'+esc(qText(q))+'</span></label>';}).join('');
    el('task-count').textContent='اختيرت ٠ أسئلة';
  }
  function paintBank(box){
    if(me.role!=='teacher'){box.innerHTML=message('مراجعة بنك الأسئلة متاحة للمعلمة.');return;}
    var open=L.data.reports.filter(function(r){return r.status==='open';}).length;
    box.innerHTML='<div class="learning-toolbar"><label class="sr-only" for="bank-search">البحث في الأسئلة</label><input type="search" id="bank-search" placeholder="ابحثي في نص السؤال أو المهارة"><select id="bank-status" aria-label="حالة المراجعة"><option value="all">كل الأسئلة</option><option value="pending">تحتاج مراجعة</option><option value="reviewed">مراجعة مكتملة</option></select><button class="link" data-go="qadd">إضافة سؤال</button></div><div class="learning-status" id="bank-count"></div><div class="learning-bank-list" id="learning-bank-list"></div><section class="learning-section"><h2>بلاغات الأسئلة · '+ar(open)+' قيد المراجعة</h2><div id="learning-reports"></div></section>';
    el('bank-status').value=L.bankFilter;paintBankRows();paintReports();
  }
  function paintBankRows(){
    var query=searchText(el('bank-search').value.trim());
    var rows=Q.filter(function(q){var m=meta(q);return (L.bankFilter==='all'||m.review_status===L.bankFilter)&&(!query||searchText(qText(q)+' '+q.skill+' '+m.source).includes(query));});
    el('bank-count').textContent='عدد النتائج: '+ar(rows.length);
    el('learning-bank-list').innerHTML=rows.slice(0,60).map(function(q){var m=meta(q);return '<article class="learning-item"><div class="learning-meta">'+badge(m.review_status)+badge(m.difficulty)+'<span>'+esc(q.skill)+'</span></div><h3>'+esc(qText(q))+'</h3><p>المصدر: '+esc(m.source)+'</p><p>الإجابة الصحيحة: '+esc(q.c[q.a])+'</p><button class="btn quiet" data-meta-edit="'+C.key(q)+'">مراجعة المصدر وشروح الخيارات</button><button class="btn quiet" data-report-question="'+C.key(q)+'">الإبلاغ عن مشكلة</button></article>';}).join('');
    if(rows.length>60)el('learning-bank-list').innerHTML+=message('تظهر أول ٦٠ نتيجة. حددي البحث للوصول إلى السؤال المطلوب.');
    if(!rows.length)el('learning-bank-list').innerHTML=message('لا توجد أسئلة مطابقة.');
  }
  function paintReports(){
    var reports=L.data.reports;
    el('learning-reports').innerHTML=reports.length?reports.map(function(r){return '<article class="learning-item" style="margin-bottom:12px"><div class="learning-meta">'+badge(r.status)+'<span>'+date(r.created_at)+'</span></div><h3>'+esc(qText(r.question))+'</h3><p>'+esc(r.reason)+'</p>'+(r.response?'<p>نتيجة المراجعة: '+esc(r.response)+'</p>':'')+(r.status==='open'?'<label for="report-response-'+r.id+'">ملاحظة المراجعة</label><input id="report-response-'+r.id+'" maxlength="2000"><div class="learning-row"><button class="btn quiet" data-report-resolve="'+r.id+'" data-resolution="resolved">تمت المعالجة</button><button class="btn quiet" data-report-resolve="'+r.id+'" data-resolution="dismissed">إغلاق بعد المراجعة</button></div>':'')+'</article>';}).join(''):message('لا توجد بلاغات.');
  }
  function paintFeedback(q,picked){
    var m=meta(q),letters=['أ','ب','ج','د'];
    feedback.innerHTML='<h3>مراجعة الخيارات</h3>'+q.c.map(function(choice,n){var explanation=n===q.a?q.e:m.distractors[n];return '<details '+(n===picked?'open':'')+'><summary class="'+(n===q.a?'correct':n===picked?'current':'')+'">'+letters[n]+' · '+esc(choice)+(n===q.a?' — الإجابة الصحيحة':n===picked?' — إجابتكِ':'')+'</summary><p>'+esc(explanation||'لم تضف المعلمة شرحًا لهذا الخيار بعد.')+'</p></details>';}).join('')+'<div class="learning-meta"><span>المصدر: '+esc(m.source)+'</span>'+badge(m.review_status)+'</div>';
  }
  function openDialog(html){dialog.innerHTML='<button type="button" class="close" data-learn-action="close-dialog" aria-label="إغلاق" title="إغلاق">×</button>'+html;dialog.showModal();}
  function reportQuestion(q){
    L.reporting=q;openDialog('<h2>الإبلاغ عن سؤال</h2><p>'+esc(qText(q))+'</p><form id="question-report-form"><label for="question-report-reason">وصف المشكلة</label><textarea id="question-report-reason" required minlength="5" maxlength="2000" placeholder="وضحي موضع الخطأ في السؤال أو الإجابة أو الشرح"></textarea><button class="btn" type="submit">إرسال البلاغ</button><p class="learning-status" role="status" id="question-report-message"></p></form>');
  }
  function editMetadata(q){
    L.editing=q;var m=meta(q);
    openDialog('<h2>مراجعة السؤال</h2><p>'+esc(qText(q))+'</p><form id="question-meta-form" class="learning-form"><div class="wide"><label for="question-source">المصدر</label><input id="question-source" maxlength="500" required value="'+esc(m.source)+'"></div><div><label for="question-difficulty">الصعوبة</label><select id="question-difficulty"><option value="unspecified">غير محدد</option><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option></select></div><div><label for="question-status">حالة المراجعة</label><select id="question-status"><option value="pending">تحتاج مراجعة</option><option value="reviewed">مراجعة مكتملة</option></select></div>'+q.c.map(function(choice,n){return '<div class="wide"><label for="question-distractor-'+n+'">'+esc(choice)+(n===q.a?' · الإجابة الصحيحة':' · سبب خطأ الخيار')+'</label>'+(n===q.a?'<p>'+esc(q.e)+'</p>':'<textarea id="question-distractor-'+n+'" maxlength="2000">'+esc(m.distractors[n]||'')+'</textarea>')+'</div>';}).join('')+'<div class="wide"><button class="btn" type="submit">حفظ المراجعة</button><p class="learning-status" role="status" id="question-meta-message"></p></div></form>');
    el('question-difficulty').value=m.difficulty;el('question-status').value=m.review_status;
  }
  async function submit(form,body,status){
    var target=form.querySelector('[type=submit]');target.disabled=true;status.textContent='جارٍ الحفظ...';
    try{var response=await api('/api/learning',{method:'POST',body:JSON.stringify(body)});await L.load();status.textContent='تم الحفظ.';return response;}catch(error){status.textContent=error.message;return null;}finally{target.disabled=false;}
  }
  document.addEventListener('submit',async function(event){
    var form=event.target;
    if(form.id==='learning-task-form'){
      event.preventDefault();var students=roster().filter(function(s){return s.id;}),ids=el('task-target').value==='class'?students.filter(function(s){return s.cls===el('task-class').value;}).map(function(s){return s.id;}):Array.from(form.querySelectorAll('[name=task-student]:checked'),function(x){return Number(x.value);});
      var keys=Array.from(form.querySelectorAll('[name=task-question]:checked'),function(x){return x.value;}),questions=Q.filter(function(q){return keys.includes(C.key(q));}).map(function(q){return C.cleanQuestion(fullQuestion(q));});
      if(!ids.length||!questions.length||questions.length>30){el('task-message').textContent='اختاري الطالبات ومن سؤال واحد إلى ٣٠ سؤالًا.';return;}
      var result=await submit(form,{op:'createAssignment',title:el('task-title').value,skill:el('task-skill').value,track:TRACK_OF_SECTION[questions[0].s],dueAt:el('task-due').value+'T23:59:59+03:00',notes:el('task-notes').value,questions:questions,studentIds:ids},el('task-message'));
      if(result)paintAssignments(el('learning-assignments'));
    }else if(form.id==='question-report-form'){
      event.preventDefault();var sent=await submit(form,{op:'report',question:C.cleanQuestion(fullQuestion(L.reporting)),reason:el('question-report-reason').value},el('question-report-message'));
      if(sent){form.innerHTML=message('تم إرسال البلاغ للمعلمة لمراجعته.');}
    }else if(form.id==='question-meta-form'){
      event.preventDefault();var distractors=L.editing.c.map(function(_,n){return n===L.editing.a?'':el('question-distractor-'+n).value;});
      var saved=await submit(form,{op:'metadata',question:C.cleanQuestion(fullQuestion(L.editing)),source:el('question-source').value,difficulty:el('question-difficulty').value,reviewStatus:el('question-status').value,distractors:distractors},el('question-meta-message'));
      if(saved){dialog.close();paintBankRows();}
    }
  });
  document.addEventListener('change',function(event){var node=event.target;
    if(node.id==='learning-map-track'||node.id==='learning-week-track'){L.track=node.value;paint(curView);}
    if(node.id==='task-skill')paintTaskQuestions();
    if(node.id==='task-target'){el('task-class-field').classList.toggle('hidden',node.value!=='class');el('task-students-field').classList.toggle('hidden',node.value!=='students');}
    if(node.name==='task-question')el('task-count').textContent='اختيرت '+ar(document.querySelectorAll('[name=task-question]:checked').length)+' أسئلة';
    if(node.id==='bank-status'){L.bankFilter=node.value;paintBankRows();}
  });
  document.addEventListener('input',function(event){if(event.target.id==='bank-search')paintBankRows();});
  document.addEventListener('click',async function(event){
    var node=event.target.closest('button');if(!node)return;
    if(node.dataset.learnNav){L.open(node.dataset.learnNav);return;}
    if(node.dataset.reviewFilter){L.reviewFilter=node.dataset.reviewFilter;paint(curView);return;}
    if(node.dataset.mapFilter){L.mapFilter=node.dataset.mapFilter;paint(curView);return;}
    if(node.dataset.reviewStart){var r=L.data.state.reviews[node.dataset.reviewStart];if(!r||r.dueAt>Date.now())return;var candidates=Q.filter(function(q){return q.skill===r.skill&&C.key(q)!==r.key;});var original=Q.find(function(q){return C.key(q)===r.key;})||fullQuestion(r.q);var q=r.successes===0&&candidates.length?shuffle(candidates)[0]:original;me.activeTrack=TRACK_OF_SECTION[q.s]||trackOfSkill(q.skill)||'qudrat';startQuiz([q],'مراجعة الإتقان — '+r.skill,'train');L.context={reviewKey:r.key};return;}
    if(node.dataset.skillStart){me.activeTrack=L.track;me.activeSub='all';var pool=Q.filter(function(q){return q.skill===node.dataset.skillStart&&TRACK_OF_SECTION[q.s]===L.track;});if(pool.length)startQuiz(shuffle(pool).slice(0,5),node.dataset.skillStart,'train');return;}
    if(node.dataset.taskStart){var task=L.data.assignments.find(function(a){return String(a.id)===node.dataset.taskStart;});if(!task)return;me.activeTrack=task.track;var questions=task.questions.map(function(saved){var original=Q.find(function(q){return C.key(q)===C.key(saved);});return original?Object.assign({},saved,{svg:original.svg}):saved;});startQuiz(questions,task.title,'train');L.context={assignmentId:task.id};return;}
    if(node.dataset.metaEdit){var edit=Q.find(function(q){return C.key(q)===node.dataset.metaEdit;});if(edit)editMetadata(edit);return;}
    if(node.dataset.reportQuestion){var reported=Q.find(function(q){return C.key(q)===node.dataset.reportQuestion;});if(reported)reportQuestion(reported);return;}
    if(node.dataset.taskArchive){if(!confirm('أرشفة هذه المهمة وإخفاؤها من قائمة الطالبات؟'))return;node.disabled=true;try{await api('/api/learning',{method:'POST',body:JSON.stringify({op:'archiveAssignment',id:Number(node.dataset.taskArchive)})});await refresh('assignments');}catch(error){alert(error.message);node.disabled=false;}return;}
    if(node.dataset.reportResolve){var response=el('report-response-'+node.dataset.reportResolve).value.trim();if(!response){el('report-response-'+node.dataset.reportResolve).focus();return;}node.disabled=true;try{await api('/api/learning',{method:'POST',body:JSON.stringify({op:'resolveReport',id:Number(node.dataset.reportResolve),status:node.dataset.resolution,response:response})});await refresh('question-bank');}catch(error){alert(error.message);node.disabled=false;}return;}
    if(node.dataset.learnAction==='report-current'&&items[i])reportQuestion(items[i]);
    if(node.dataset.learnAction==='close-dialog')dialog.close();
    if(node.dataset.learnAction==='reload')refresh(curView);
    if(node.dataset.learnAction==='print')window.print();
    if(node.dataset.learnAction==='retry-save'){node.disabled=true;for(var pending of L.pending.slice()){try{await saveAttempt(pending.request);L.pending=L.pending.filter(function(p){return p.key!==pending.key;});}catch(error){break;}}syncStatus();}
  });
  L.paint=paint;L.seed=function(data){L.data=data;L.loaded=true;L.error='';};
})();
