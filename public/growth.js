(function(){
  'use strict';
  var C=TibyanLearning,F=TibyanGrowth,L=Learning;
  var G=window.Growth={data:{preferences:null,notes:[],alerts:[]},loaded:false,role:null,error:'',purpose:'train',nextPurpose:null,hints:0,confidence:null,foundation:null,noteQuestion:null,lastMock:null,mockSubmitted:false,mockVisits:[],mockFlags:[],mockConfidence:[],lastMockIndex:null};
  var titles={'study-plan':'خطتي حتى الاختبار','diagnostic':'تشخيص مستواي','foundation':'مسار التأسيس','confidence-report':'فهمي وثقتي','time-analysis':'تحليل وقت الاختبار','early-alerts':'طالبات يحتجن المتابعة','notebook':'دفتر تعلمي'};
  var days=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var concepts={
    'تناظر لفظي':['صيغي العلاقة بين الكلمتين في جملة قصيرة. حافظي على ترتيب العلاقة عند تطبيقها على الطرف الآخر.','قلم : كتابة، ومقص : قص. العلاقة هنا أداة ووظيفتها، لا مادتها أو مكان استخدامها.'],
    'إكمال الجمل':['اقرئي الجملة كاملة وحددي العلاقة بين طرفيها قبل النظر إلى الخيارات. «بل» و«لكن» تدلان على الاستدراك أو التضاد، و«لأن» على التعليل.','لم يكن النجاح صدفة، بل نتيجة العمل. ما قبل «بل» هنا منفي، وما بعدها سبب النجاح المثبت.'],
    'الخطأ السياقي':['حددي المعنى العام للجملة، ثم ابحثي عن الكلمة التي تناقضه. اختبري المعنى بعد استبدالها بكلمة مناسبة.','إذا وصفت الجملة طالبًا بالاجتهاد والإتقان ثم قالت «المهمل»، فالكلمة تكسر سياق المدح.'],
    'استيعاب المقروء':['استندي إلى النص، وميزي بين الفكرة الرئيسة والتفاصيل. في أسئلة الاستنتاج اختاري ما تدعمه القرائن، لا ما يبدو صحيحًا عمومًا.','«لا تنخفض الحركة بسبب البرد، بل بسبب صعوبة الملاحة»: السبب المثبت هو صعوبة الملاحة.'],
    'جبر':['حافظي على تساوي طرفي المعادلة: أي عملية على طرف تُطبق على الطرف الآخر. اعزلي المجهول ثم تحققي بالتعويض.','٣س + ٥ = ٢٠. نطرح ٥ من الطرفين ثم نقسم على ٣: س = ٥.'],
    'نسب ومئويات':['النسبة المئوية جزء من مئة. حوليها إلى كسر عشري، وحددي هل المطلوب مقدار الخصم أو السعر بعد الخصم.','خصم ٢٠٪ من ٢٥٠ يعني خصم ٥٠، والسعر المتبقي ٢٠٠.'],
    'الهندسة':['حددي الشكل والقياسات المعطاة. لا تخلطي بين المساحة التي تقاس بوحدات مربعة، والمحيط الذي يقاس بوحدات طول.','مربع مساحته ٤٩ سم²: ضلعه ٧ سم، ومحيطه ٤ × ٧ = ٢٨ سم.'],
    'تحليل بيانات':['رتبي البيانات وحددي المطلوب: المتوسط مجموع القيم مقسومًا على عددها؛ الوسيط القيمة الوسطى بعد الترتيب.','للقيم ٤، ٦، ٨، ١٠: المتوسط = ٢٨ ÷ ٤ = ٧.'],
    'قابلية القسمة':['اختاري اختبار القسمة المناسب بدل إجراء قسمة طويلة. العدد يقبل القسمة على ٣ إذا كان مجموع أرقامه يقبلها، وعلى ٥ إذا انتهى بصفر أو خمسة.','١٢٣: مجموع الأرقام ٦، ولذلك يقبل القسمة على ٣.'],
    'المقارنة الكمية':['بسطي الطرفين واختبري الحالات المسموح بها. إذا تغيرت المقارنة باختلاف قيمة المجهول فالبيانات غير كافية لتحديد طرف أكبر.','س و٢س: إذا كان س موجبًا فالطرف الثاني أكبر؛ إذا كان س سالبًا فالطرف الأول أكبر.'],
    'عد الأشكال':['عدي الأشكال بحسب الحجم أو الاتجاه في مجموعات منظمة، ثم أضيفي الشكل الكامل. لا تفترضي أن عدد الوحدات الصغيرة هو الإجمالي.','عند تقسيم مثلث، ابحثي عن المثلثات الصغيرة، ثم المركبة من أكثر من وحدة، ثم المثلث الخارجي.'],
    'الاحتمال والسرعة':['في النتائج المتساوية الاحتمال: الاحتمال = النتائج المطلوبة ÷ جميع النتائج. في الحركة المنتظمة: السرعة = المسافة ÷ الزمن.','قطع ١٢٠ كم في ساعتين يعني سرعة متوسطة ٦٠ كم/ساعة.'],
    'المتتابعة الحسابية':['الفرق بين كل حدين متتاليين ثابت. الحد النوني يساوي الحد الأول مضافًا إليه (ن − ١) مضروبًا في الفرق.','٢، ٥، ٨، ١١: الفرق ٣، والحد الخامس = ٢ + ٤ × ٣ = ١٤.'],
    'أحياء':['اربطي اسم البنية بوظيفتها، وميزي بين البنية والعملية التي تحدث فيها. ابدئي بعضيات الخلية ثم انتقلي إلى الوراثة والعمليات الحيوية.','الميتوكوندريا ترتبط بالتنفس الخلوي وإنتاج الطاقة، والرايبوسومات ببناء البروتين.'],
    'كيمياء':['حددي الكمية المطلوبة ووحدتها. ميزي بين العدد الذري (عدد البروتونات) والعدد الكتلي (البروتونات + النيوترونات).','ذرة بها ٦ بروتونات و٨ نيوترونات: عددها الذري ٦ وعددها الكتلي ١٤.'],
    'فيزياء':['اكتبي المعطيات بوحدات متوافقة، وحددي القانون، ثم عوضي وتحققي من وحدة الناتج.','قوة تؤثر في كتلة ٥ كجم وتسارعها ٢ م/ث²: ق = ك × ت = ١٠ نيوتن.'],
    'رياضيات':['حددي نوع العملية وقاعدتها قبل التعويض. في الاشتقاق، مشتقة س أس ن هي ن × س أس (ن − ١).','مشتقة س² هي ٢س، وليست س³ ÷ ٣؛ الأخيرة مرتبطة بالتكامل.']
  };
  function uid(){return crypto.randomUUID?crypto.randomUUID():'note-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
  function text(value){return esc(String(value==null?'':value));}
  function date(value){return new Date(value.length===10?value+'T12:00:00+03:00':value).toLocaleDateString('ar-SA-u-ca-gregory',{day:'numeric',month:'long'});}
  function note(value){return '<p class="learning-note">'+text(value)+'</p>';}
  function stat(label,value){return '<div class="learning-stat"><span>'+text(label)+'</span><b>'+text(value)+'</b></div>';}
  function link(name,label){return '<button type="button" data-growth-nav="'+name+'"><span>'+text(label)+'</span><span class="arrow" aria-hidden="true">←</span></button>';}
  function icon(action,title,glyph){return '<button type="button" class="growth-icon" data-growth-action="'+action+'" title="'+text(title)+'" aria-label="'+text(title)+'">'+glyph+'</button>';}
  function rows(){return F.entries(L.data.state.sessions||[]);}
  function pool(track){return Q.filter(function(q){return TRACK_OF_SECTION[q.s]===track;});}
  function names(track){return Array.from(new Set(pool(track).map(function(q){return q.skill;})));}
  function track(){return G.data.preferences?G.data.preferences.track:me.activeTrack||'qudrat';}
  Object.keys(titles).forEach(function(name){var main=document.createElement('main');main.id='v-'+name;main.className='hidden learning-page growth-page';main.innerHTML='<div class="wrap"><div class="head"><h1>'+titles[name]+'</h1></div><div id="growth-'+name+'"></div></div>';document.querySelector('footer').before(main);VIEWS.push(name);});
  var links=document.createElement('section');links.className='band growth-home';links.innerHTML='<h2>مساري الشخصي</h2><div class="learning-links">'+link('study-plan','خطتي حتى الاختبار')+link('diagnostic','تشخيص مستواي')+link('foundation','مسار التأسيس')+link('confidence-report','فهمي وثقتي')+link('time-analysis','تحليل وقت الاختبار')+link('notebook','دفتر تعلمي')+'</div>';el('learning-home-links').after(links);
  document.querySelector('#v-teacher .learning-links').insertAdjacentHTML('beforeend',link('early-alerts','طالبات يحتجن المتابعة'));
  document.querySelector('#v-done .learning-links').insertAdjacentHTML('beforeend',link('confidence-report','فهمي وثقتي')+link('time-analysis','تحليل وقت الاختبار')+link('diagnostic','نتيجة التشخيص'));
  var quizTools=document.createElement('div');quizTools.id='growth-quiz-tools';el('q-c').before(quizTools);
  var quizNote=document.createElement('button');quizNote.className='link';quizNote.dataset.growthAction='note-current';quizNote.textContent='أضيفي فكرة إلى دفتر تعلمكِ';el('q-after').appendChild(quizNote);
  var mockTools=document.createElement('div');mockTools.id='growth-mock-tools';el('mk-c').before(mockTools);
  var mockGrid=document.createElement('nav');mockGrid.id='growth-mock-grid';mockGrid.setAttribute('aria-label','أسئلة الاختبار');el('mk-c').after(mockGrid);
  var dialog=document.createElement('dialog');dialog.id='growth-dialog';dialog.className='learning-dialog';document.body.appendChild(dialog);
  G.load=function(){return api('/api/growth').then(function(data){G.data={preferences:data.preferences||null,notes:data.notes||[],alerts:data.alerts||[]};G.loaded=true;G.role=me.role;G.error='';return G.data;}).catch(function(error){G.error=error.message;throw error;});};
  G.open=function(name){if(!titles[name])return;view(name);Promise.all([L.load(),G.load()]).then(function(){if(curView===name)paint(name);}).catch(function(){if(curView===name)paint(name);});};
  function paint(name){
    var box=el('growth-'+name);if(!box)return;
    if(!G.loaded||G.role!==me.role){box.innerHTML=note(G.error||'جارٍ تحميل بياناتكِ...')+(G.error?'<button class="btn quiet" data-growth-action="reload">إعادة المحاولة</button>':'');return;}
    if(G.error){box.innerHTML=note(G.error)+'<button class="btn quiet" data-growth-action="reload">إعادة المحاولة</button>';return;}
    if(name==='early-alerts'){paintAlerts(box);return;}
    if(me.role!=='student'){box.innerHTML=note('هذا المسار خاص بحساب الطالبة.');return;}
    ({'study-plan':paintPlan,'diagnostic':paintDiagnostic,'foundation':paintFoundation,'confidence-report':paintConfidence,'time-analysis':paintTiming,'notebook':paintNotebook})[name](box);
  }
  var previousView=view;view=function(name){previousView(name);if(titles[name]){paint(name);if(me.role==='student')paintTabbar('home');}};
  var previousToken=setToken;setToken=function(value){G.loaded=false;G.data={preferences:null,notes:[],alerts:[]};G.lastMock=null;G.error='';dialog.close();return previousToken(value);};
  var previousStart=startQuiz;startQuiz=function(list,label,type){G.purpose=G.nextPurpose||'train';G.nextPurpose=null;return previousStart(list,label,type);};
  G.begin=function(list,label,purpose){if(!list.length)return;G.nextPurpose=purpose;startQuiz(list,label,'train');};
  var previousPaint=paintQ;paintQ=function(){previousPaint();G.hints=0;G.confidence=null;paintQuizTools();};
  function confidenceControls(name,value){return '<fieldset class="growth-confidence"><legend>مدى ثقتكِ بإجابتكِ</legend>'+['high','low'].map(function(v){return '<label><input type="radio" name="'+name+'" value="'+v+'" '+(value===v?'checked':'')+'><span>'+(v==='high'?'متأكدة':'مترددة')+'</span></label>';}).join('')+'</fieldset>';}
  function paintQuizTools(){quizTools.innerHTML=confidenceControls('growth-confidence',G.confidence)+(mode!=='place'&&G.purpose!=='diagnostic'&&!L.context?.assignmentId?'<div class="growth-hints"><button type="button" class="link" data-growth-action="hint">تلميح للفكرة</button><span id="growth-hint-count">دون تلميحات</span></div><div id="growth-hint-text" role="status"></div>':'');}
  var previousRecord=record;record=function(q,ok){return previousRecord(q,G.recordingQuiz&&G.hints===3?false:ok);};
  var previousPick=pick;pick=function(index){
    if(el('q-c').querySelector('button:disabled'))return;
    G.recordingQuiz=true;try{previousPick(index);}finally{G.recordingQuiz=false;}var entry=log[log.length-1];entry.hints=G.hints;entry.confidence=G.confidence;entry.purpose=G.purpose;
    quizTools.querySelectorAll('input,button').forEach(function(n){n.disabled=true;});
    if(G.hints===3){entry.ok=false;entry.why='عرضت الإجابة';el('a-k').textContent='عُرضت الإجابة؛ لا تُحتسب حلًا مستقلًا.';el('a-k').className='after-k';}
    if(G.purpose==='diagnostic'){
      el('q-after').classList.add('hidden');el('q-next').classList.remove('hidden');
      el('q-c').querySelectorAll('button').forEach(function(n){n.classList.remove('right','mine');});
    }else el('learning-feedback').insertAdjacentHTML('afterbegin','<p class="growth-answer-status">'+(G.hints?'حل بمساعدة · '+ar(G.hints)+' تلميحات':G.confidence==='high'?'ثقة مرتفعة':G.confidence==='low'?'ثقة منخفضة':'لم تحددي مستوى الثقة')+'</p>');
  };
  var previousSerialize=serializeLogItem;serializeLogItem=function(entry){return Object.assign(previousSerialize(entry),{hints:entry.hints||0,confidence:entry.confidence||null,purpose:entry.purpose||G.purpose,visits:entry.visits||1,flagged:!!entry.flagged});};
  var previousApi=api;api=function(endpoint,options){
    if(endpoint!=='/api/attempts'||!options?.body)return previousApi(endpoint,options);
    var body=JSON.parse(options.body);
    if(body.mode==='mock')body.log.forEach(function(entry,n){entry.purpose='train';entry.hints=0;entry.confidence=G.mockConfidence[n]||null;entry.visits=G.mockVisits[n]||1;entry.flagged=!!G.mockFlags[n];});
    return previousApi(endpoint,Object.assign({},options,{body:JSON.stringify(body)}));
  };
  var previousFinish=finish;finish=function(){previousFinish();if(G.purpose==='diagnostic'){el('d-h').textContent='اكتمل التشخيص';el('d-p').textContent='نتيجة أولية لتوجيه التأسيس، وليست توقعًا لدرجة الاختبار الرسمي.';}else if(log.some(function(e){return e.hints>0;})){el('d-note').textContent='حل مستقل: '+ar(log.filter(function(e){return e.ok&&!e.hints;}).length)+' · حل بمساعدة: '+ar(log.filter(function(e){return e.hints>0;}).length)+'.';}};
  function defaults(){return G.data.preferences||{examDate:me.examDate?C.dayKey(me.examDate):'',minutes:30,days:[0,1,2,3,4],track:me.activeTrack||'qudrat'};}
  function paintPlan(box){
    var p=defaults();box.innerHTML='<section class="learning-section"><h2>إعداد الخطة</h2><form id="growth-plan-form" class="learning-form"><div><label for="growth-exam-date">موعد الاختبار</label><input id="growth-exam-date" type="date" min="'+C.dayKey(Date.now()+86400000)+'" max="'+C.dayKey(Date.now()+365*86400000)+'" required value="'+text(p.examDate)+'"></div><div><label for="growth-plan-track">القسم</label><select id="growth-plan-track"><option value="qudrat">القدرات</option><option value="tahsili">التحصيلي</option></select></div><div class="wide"><label for="growth-minutes">الوقت اليومي بالدقائق</label><input id="growth-minutes" type="number" min="10" max="180" step="1" value="'+p.minutes+'" required></div><fieldset class="wide growth-days"><legend>أيام الدراسة</legend>'+days.map(function(d,n){return '<label><input type="checkbox" name="growth-days" value="'+n+'" '+(p.days.includes(n)?'checked':'')+'><span>'+d+'</span></label>';}).join('')+'</fieldset><div class="wide"><button class="btn" type="submit">حفظ الخطة</button><p class="learning-status" id="growth-plan-status" role="status"></p></div></form></section><div id="growth-plan-schedule"></div>';
    el('growth-plan-track').value=p.track;
    if(!G.data.preferences){el('growth-plan-schedule').innerHTML=note('حددي موعدكِ وأيام الدراسة لتظهر خطة التدريب.');return;}
    var plan=F.plan(p,L.data.state.sessions,names(p.track)),target=el('growth-plan-schedule');
    target.innerHTML='<div class="learning-stats">'+stat('حتى الاختبار',ar(plan.daysLeft)+' يوم')+stat('أيام دراسة متاحة',ar(plan.studyDays))+stat('وقت الدراسة اليومي',ar(plan.minutes)+' دقيقة')+'</div>';
    if(plan.expired){target.innerHTML+=note('موعد الخطة انتهى. حددي موعدًا جديدًا.');return;}
    if(!plan.dates.length){target.innerHTML+=note('لا يوجد يوم دراسة قبل موعد الاختبار ضمن الأيام المختارة. عدلي أيام الدراسة.');return;}
    target.innerHTML+='<section class="learning-section"><h2>جلساتكِ القادمة</h2><div class="growth-schedule">'+plan.dates.map(function(d){var today=d.date===plan.today,priority=plan.priority.find(function(s){return s.name===d.skill;});return '<article class="growth-schedule-row"><div><b>'+(today?'اليوم':date(d.date))+'</b><span>'+text(d.skill||'لا توجد أسئلة متاحة')+'</span><small>'+text(priority?priority.reason:'')+'</small></div><div><span>'+ar(d.completed)+' / '+ar(d.target)+' سؤال</span>'+(today&&d.remaining&&d.skill?'<button class="btn quiet" data-plan-start="'+text(d.skill)+'" data-plan-count="'+d.remaining+'">جلسة اليوم</button>':today?'<span class="learning-badge mastered">اكتملت جلسة اليوم</span>':'')+'</div></article>';}).join('')+'</div></section>'+note('الأولوية الحالية: '+(plan.priority[0]?.name||'لا توجد بيانات')+'. عدد الأسئلة تقديري حسب الوقت المتاح.');
  }
  function trackSelect(id,value){return '<label for="'+id+'">القسم</label><select id="'+id+'"><option value="qudrat" '+(value==='qudrat'?'selected':'')+'>القدرات</option><option value="tahsili" '+(value==='tahsili'?'selected':'')+'>التحصيلي</option></select>';}
  G.selectedTrack=null;
  function latestDiagnostic(tr){return (L.data.state.sessions||[]).slice().reverse().find(function(s){return (s.entries||[]).some(function(e){return e.purpose==='diagnostic'&&e.track===tr;});});}
  function paintDiagnostic(box){
    var tr=G.selectedTrack||track(),session=latestDiagnostic(tr);
    var questionCount=Math.min(30,names(tr).reduce(function(total,skill){return total+Math.min(2,pool(tr).filter(function(q){return q.skill===skill;}).length);},0));
    box.innerHTML='<div class="learning-toolbar">'+trackSelect('growth-diagnostic-track',tr)+'</div><section class="learning-section"><h2>نقطة البداية</h2>'+note(ar(questionCount)+' سؤالًا · نتيجة أولية لتوجيه التأسيس، وليست توقعًا لدرجة الاختبار الرسمي.')+'<button class="btn" data-growth-action="start-diagnostic">'+(session?'إعادة التشخيص':'بدء التشخيص')+'</button></section>';
    if(!session){box.innerHTML+=note('لم تكملي تشخيصًا لهذا القسم بعد.');return;}
    var entries=session.entries.filter(function(e){return e.track===tr;}),priority=F.priority(Array.from(new Set(entries.map(function(e){return e.skill;}))),entries);
    box.innerHTML+='<section class="learning-section"><h2>آخر تشخيص · '+date(session.at)+'</h2><div class="learning-stats">'+stat('عدد الأسئلة',ar(entries.length))+stat('الإجابات الصحيحة',ar(entries.filter(function(e){return e.ok;}).length))+stat('أولوية التأسيس',priority.length?priority[0].name:'—')+'</div><div class="learning-grid">'+priority.map(function(s){return '<article class="learning-item"><h3>'+text(s.name)+'</h3><p>'+ar(s.pct||0)+'٪ من '+ar(s.n)+' أسئلة · عينة أولية</p><button class="btn quiet" data-foundation-skill="'+text(s.name)+'">تأسيس المهارة</button></article>';}).join('')+'</div></section>';
  }
  function paintFoundation(box){
    var tr=G.selectedTrack||track(),ranked=F.priority(names(tr),F.entries(L.data.state.sessions,tr));
    if(G.foundation&&!names(tr).includes(G.foundation))G.foundation=null;
    box.innerHTML='<div class="learning-toolbar">'+trackSelect('growth-foundation-track',tr)+'</div>';
    if(G.foundation){
      var skill=G.foundation,lesson=concepts[skill],examples=pool(tr).filter(function(q){return q.skill===skill;}),example=examples[0];
      box.innerHTML+='<section class="learning-section"><div class="learning-row"><h2>'+text(skill)+'</h2><button class="link" data-growth-action="foundation-back">كل المهارات ←</button></div><div class="growth-lesson"><h3>الفكرة الأساسية</h3>'+note(lesson?lesson[0]:example?.hint||'حددي المعطيات والمطلوب، ثم اربطيهما بالعلاقة المناسبة.')+(lesson?'<h3>مثال محلول</h3>'+note(lesson[1]):'')+'</div>';
      if(example)box.innerHTML+='<details class="growth-example"><summary>تطبيق من بنك الأسئلة</summary><p>'+text(C.questionText(example))+'</p><p>'+text(example.e)+'</p></details>';
      var results=rows().filter(function(e){return e.purpose==='foundation'&&e.skill===skill;}).slice(-5),independent=results.filter(function(e){return e.ok&&!e.hints;}).length;
      box.innerHTML+='<div class="learning-stats">'+stat('تدريبات التأسيس الأخيرة',ar(results.length))+stat('حل صحيح مستقل',ar(independent))+stat('الخطوة التالية',results.length>=3&&independent/results.length>=0.8?'تثبيت المهارة':'تدريب موجّه')+'</div><button class="btn" data-foundation-start="'+text(skill)+'">'+(results.length>=3&&independent/results.length>=0.8?'تدريب تثبيت المهارة':'تدريب تدريجي')+'</button></section>';return;
    }
    box.innerHTML+='<div class="learning-grid">'+ranked.map(function(s,n){return '<article class="learning-item"><div class="learning-meta"><span class="learning-badge">'+(n===0?'أولوية التأسيس':'تأسيس وتدريب')+'</span></div><h2>'+text(s.name)+'</h2><p>'+text(s.reason)+'</p><button class="btn quiet" data-foundation-skill="'+text(s.name)+'">ابدئي المفهوم</button></article>';}).join('')+'</div>';
  }
  function paintConfidence(box){
    var entries=rows(),stats=F.calibration(entries);
    box.innerHTML='<div class="learning-stats">'+stat('صحيح بثقة ودون مساعدة',ar(stats.independent))+stat('صحيح مع تردد',ar(stats.uncertainRight))+stat('خطأ مع ثقة مرتفعة',ar(stats.confidentWrong))+'</div><section class="learning-section"><h2>جودة الفهم</h2><div class="growth-calibration"><p><b>'+ar(stats.assisted)+'</b> حل بمساعدة</p><p><b>'+ar(stats.uncertainWrong)+'</b> خطأ مع تردد</p><p><b>'+ar(stats.unrated)+'</b> إجابات دون تقييم للثقة</p></div>'+note('الصحة مع الثقة لا تثبت الإتقان وحدها. الإجابات الصحيحة مع التردد تستحق التثبيت، والخطأ مع الثقة يستحق مراجعة المفهوم.')+'</section>';
    var risks=entries.filter(function(e){return e.confidence==='high'&&!e.ok&&!e.hints;}).slice(-12).reverse();
    box.innerHTML+='<section class="learning-section"><h2>مفاهيم تستحق المراجعة</h2>'+(risks.length?'<div class="learning-grid">'+risks.map(function(e){return '<article class="learning-item"><span class="learning-badge overdue">خطأ مع ثقة مرتفعة</span><h3>'+text(e.skill)+'</h3><p>'+text(C.questionText(e.q))+'</p><button class="btn quiet" data-foundation-skill="'+text(e.skill)+'">مراجعة المفهوم</button></article>';}).join('')+'</div>':note('لا توجد أخطاء مسجلة مع ثقة مرتفعة.'))+'</section>';
  }
  el('do-mock').addEventListener('click',function(){G.purpose='train';G.mockSubmitted=false;G.mockVisits=[];G.mockFlags=[];G.mockConfidence=[];G.lastMockIndex=null;},true);
  var previousMockPaint=paintMock;paintMock=function(){previousMockPaint();if(G.lastMockIndex!==mk.i){G.mockVisits[mk.i]=(G.mockVisits[mk.i]||0)+1;G.lastMockIndex=mk.i;}
    mockTools.innerHTML=confidenceControls('growth-mock-confidence',G.mockConfidence[mk.i])+'<div class="growth-mock-actions">'+icon('mock-flag',G.mockFlags[mk.i]?'إزالة علامة المراجعة':'تحديد للمراجعة',G.mockFlags[mk.i]?'★':'☆')+'<button class="link" data-growth-action="mock-skip">تجاوز والعودة لاحقًا</button><span>'+(G.mockFlags[mk.i]?'محدد للمراجعة':'')+'</span></div>';
    mockGrid.innerHTML=mk.list.map(function(q,n){return '<button type="button" data-mock-index="'+n+'" class="'+(n===mk.i?'current ':'')+(mk.ans[n]!=null?'answered ':'')+(G.mockFlags[n]?'flagged':'')+'" aria-label="السؤال '+(n+1)+(mk.ans[n]!=null?'، تمت الإجابة':'، دون إجابة')+(G.mockFlags[n]?'، للمراجعة':'')+'" '+(n===mk.i?'aria-current="step"':'')+'>'+ar(n+1)+'</button>';}).join('');
  };
  var previousMockSubmit=submitMock;submitMock=function(auto){if(G.mockSubmitted)return;G.mockSubmitted=true;previousMockSubmit(auto);
    G.lastMock={at:new Date().toISOString(),mode:'mock',entries:mk.list.map(function(q,n){return {q:q,skill:q.skill,track:mk.track,ok:mk.ans[n]===q.a,picked:mk.ans[n],secs:Math.round(L.mockTimes[n]||0),visits:G.mockVisits[n]||1,flagged:!!G.mockFlags[n],confidence:G.mockConfidence[n]||null,hints:0};})};
    var t=F.timing(G.lastMock.entries);el('d-time').textContent=t.average===null?'—':ar(t.average)+'ث';el('d-note').textContent='أسئلة استغرقت ٩٠ ثانية فأكثر: '+ar(t.slow.length)+' · أخطاء سريعة: '+ar(t.quickWrong.length)+' · عُدتِ إلى '+ar(t.revisited)+' أسئلة.';
  };
  function paintTiming(box){
    var sessions=(L.data.state.sessions||[]).filter(function(s){return s.mode==='mock';}),latest=G.lastMock||sessions[sessions.length-1];
    box.innerHTML='<section class="learning-section"><h2>محاكاة تدريبية</h2>'+note('الاختبار التدريبي الحالي: حتى ٢٠ سؤالًا خلال ٢٠ دقيقة. ليس محاكاة مطابقة لعدد أسئلة الاختبار الرسمي أو درجته.')+'<button class="btn quiet" data-growth-action="new-mock">بدء اختبار تجريبي</button></section>';
    if(!latest){box.innerHTML+=note('أكملي اختبارًا تجريبيًا ليظهر تحليل إدارة الوقت.');return;}
    var t=F.timing(latest.entries||[]);
    box.innerHTML+='<section class="learning-section"><h2>آخر اختبار · '+date(latest.at)+'</h2><div class="learning-stats">'+stat('زمن الإجابة المقاس',ar(Math.floor(t.seconds/60))+' د '+ar(t.seconds%60)+' ث')+stat('متوسط السؤال',t.average===null?'غير مقاس':ar(t.average)+' ثانية')+stat('دون إجابة',ar(t.unanswered))+'</div><div class="growth-calibration"><p>'+ar(t.quickWrong.length)+' أخطاء خلال ١٥ ثانية أو أقل</p><p>'+ar(t.slow.length)+' أسئلة استغرقت ٩٠ ثانية فأكثر</p><p>'+ar(t.revisited)+' أسئلة تمت زيارتها أكثر من مرة</p></div>'+note(t.slow.length?'جربي تجاوز السؤال الذي يطول حله، ثم العودة إليه بعد الأسئلة الأسرع.':t.quickWrong.length?'امنحي قراءة المطلوب وقتًا إضافيًا؛ توجد أخطاء في إجابات سريعة.':'حافظي على توزيع وقتكِ، وراجعي الأسئلة المحددة قبل التسليم.')+'<div class="growth-table-wrap"><table class="growth-table"><thead><tr><th>السؤال</th><th>المهارة</th><th>الزمن</th><th>النتيجة</th><th>المراجعة</th></tr></thead><tbody>'+t.rows.map(function(e,n){return '<tr><td>'+ar(n+1)+'</td><td>'+text(e.skill)+'</td><td>'+(e.secs>0?ar(e.secs)+' ث':'غير مقاس')+'</td><td>'+(e.picked==null?'دون إجابة':e.ok?'صحيحة':'خاطئة')+'</td><td>'+ar(e.visits||1)+' زيارة'+(e.flagged?' · محدد':'')+'</td></tr>';}).join('')+'</tbody></table></div></section>';
  }
  function paintAlerts(box){
    if(me.role!=='teacher'&&me.role!=='principal'){box.innerHTML=note('المتابعة المبكرة متاحة للمعلمة.');return;}
    var alerts=G.data.alerts,classes=Array.from(new Set(alerts.map(function(s){return s.cls||'غير محدد';})));box.innerHTML='<div class="learning-toolbar"><label for="growth-alert-class">الفصل</label><select id="growth-alert-class"><option value="all">كل الفصول</option>'+classes.map(function(c){return '<option>'+text(c)+'</option>';}).join('')+'</select><button class="link" data-growth-action="reload">تحديث</button></div>'+note('إشارات للمتابعة وليست حكمًا على الطالبة. انخفاض الدقة يُعرض فقط عند وجود خمس محاولات على الأقل في كل فترة.')+'<div id="growth-alert-list"></div>';paintAlertRows();
  }
  function paintAlertRows(){var cls=el('growth-alert-class').value,students=G.data.alerts.filter(function(s){return cls==='all'||(s.cls||'غير محدد')===cls;});el('growth-alert-list').innerHTML=students.length?'<div class="learning-grid">'+students.map(function(s){return '<article class="learning-item"><div class="learning-meta"><span>'+text(s.cls)+'</span><span class="learning-badge overdue">تحتاج متابعة</span></div><h2>'+text(s.name)+'</h2>'+s.alerts.map(function(a){return '<p>'+text(a.reason)+' · '+ar(a.count)+(a.type==='accuracy'?' نقطة مئوية':'')+'</p>';}).join('')+'<p class="growth-recommendation">'+(s.alerts.some(function(a){return a.skill;})?'الإجراء المقترح: مهمة قصيرة في المهارة المتعثرة ومراجعة مفهومها.':'الإجراء المقترح: مراجعة آخر نشاط وتحديد جلسة متابعة قصيرة.')+'</p><button class="btn quiet" data-alert-student="'+s.id+'">عرض تقرير الطالبة</button><button class="link" data-alert-assignment="'+s.id+'">إعداد مهمة موجهة</button></article>';}).join('')+'</div>':note('لا توجد إشارات متابعة ضمن هذا الفصل.');}
  function openDialog(html){dialog.innerHTML=icon('close-dialog','إغلاق','×')+html;dialog.showModal();}
  function editNote(saved,question){
    G.noteKey=saved?saved.note_key:uid();G.noteQuestion=saved?saved.question:question||null;
    openDialog('<h2>'+(saved?'تعديل الملاحظة':'فكرة جديدة')+'</h2>'+(G.noteQuestion?'<p>'+text(C.questionText(G.noteQuestion))+'</p>':'')+'<form id="growth-note-form"><label for="growth-note-title">العنوان</label><input id="growth-note-title" maxlength="160" required value="'+text(saved?saved.title:question?question.skill:'')+'"><label for="growth-note-body">ما الذي تعلمتِه؟</label><textarea id="growth-note-body" maxlength="4000" required>'+text(saved?saved.body:'')+'</textarea><button class="btn" type="submit">حفظ الملاحظة</button><p class="learning-status" role="status" id="growth-note-status"></p></form>');
  }
  G.noteSearch='';G.noteSkill='all';
  function paintNotebook(box){box.innerHTML='<div class="learning-toolbar"><button class="btn quiet" data-growth-action="new-note">إضافة ملاحظة</button>'+icon('print','طباعة دفتر التعلم',EMPTY_ICONS.doc)+'<label class="sr-only" for="growth-note-search">البحث في الملاحظات</label><input id="growth-note-search" type="search" placeholder="ابحثي في ملاحظاتكِ" value="'+text(G.noteSearch)+'"><select id="growth-note-filter" aria-label="المهارة"><option value="all">كل الملاحظات</option>'+Array.from(new Set(G.data.notes.filter(function(n){return n.question;}).map(function(n){return n.question.skill;}))).map(function(s){return '<option>'+text(s)+'</option>';}).join('')+'</select></div><div id="growth-notes-list"></div>';el('growth-note-filter').value=G.noteSkill;paintNoteRows();}
  function paintNoteRows(){var query=searchText(G.noteSearch),notes=G.data.notes.filter(function(n){return (G.noteSkill==='all'||n.question?.skill===G.noteSkill)&&(!query||searchText(n.title+' '+n.body).includes(query));});el('growth-notes-list').innerHTML=notes.length?notes.map(function(n){return '<article class="growth-note"><div class="learning-row"><h2>'+text(n.title)+'</h2><div class="growth-note-actions no-print"><button class="link" data-note-edit="'+text(n.note_key)+'">تعديل</button><button class="link" data-note-delete="'+text(n.note_key)+'">حذف</button></div></div><p class="growth-note-body">'+text(n.body)+'</p>'+(n.question?'<details><summary>السؤال المرتبط</summary><p>'+text(C.questionText(n.question))+'</p><p>'+text(n.question.e)+'</p></details>':'')+'<small>'+date(n.updated_at)+'</small></article>';}).join(''):note(query||G.noteSkill!=='all'?'لا توجد ملاحظات مطابقة.':'دفتركِ فارغ. أضيفي أول فكرة أو قاعدة تعلمتِها.');}
  async function save(form,body,status){var button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='جارٍ الحفظ...';try{await api('/api/growth',{method:'POST',body:JSON.stringify(body)});await G.load();status.textContent='تم الحفظ.';return true;}catch(error){status.textContent=error.message;return false;}finally{button.disabled=false;}}
  document.addEventListener('submit',async function(event){var form=event.target;
    if(form.id==='growth-plan-form'){event.preventDefault();var p={examDate:el('growth-exam-date').value,minutes:Number(el('growth-minutes').value),track:el('growth-plan-track').value,days:Array.from(form.querySelectorAll('[name=growth-days]:checked'),function(n){return Number(n.value);})};try{F.settings(p);}catch(error){el('growth-plan-status').textContent=error.message;return;}if(await save(form,{op:'preferences',preferences:p},el('growth-plan-status'))){me.examDate=Date.parse(p.examDate+'T00:00:00+03:00');paintHome();paintPlan(el('growth-study-plan'));}}
    if(form.id==='growth-note-form'){event.preventDefault();if(await save(form,{op:'saveNote',key:G.noteKey,title:el('growth-note-title').value,text:el('growth-note-body').value,question:G.noteQuestion?C.cleanQuestion(G.noteQuestion):null},el('growth-note-status'))){dialog.close();if(curView==='notebook')paintNotebook(el('growth-notebook'));}}
  });
  document.addEventListener('change',function(event){var node=event.target;
    if(node.name==='growth-confidence')G.confidence=node.value;
    if(node.name==='growth-mock-confidence')G.mockConfidence[mk.i]=node.value;
    if(node.id==='growth-diagnostic-track'||node.id==='growth-foundation-track'){G.selectedTrack=node.value;G.foundation=null;paint(curView);}
    if(node.id==='growth-alert-class')paintAlertRows();
    if(node.id==='growth-note-filter'){G.noteSkill=node.value;paintNoteRows();}
  });
  document.addEventListener('input',function(event){if(event.target.id==='growth-note-search'){G.noteSearch=event.target.value;paintNoteRows();}});
  document.addEventListener('click',async function(event){var node=event.target.closest('button');if(!node)return;
    if(node.dataset.taskStart){paintQuizTools();return;}
    if(node.dataset.growthNav){G.open(node.dataset.growthNav);return;}
    if(node.dataset.planStart){var plan=F.plan(G.data.preferences,L.data.state.sessions,names(track())),today=plan.dates.find(function(d){return d.date===plan.today;});if(!today?.remaining)return;me.activeTrack=track();G.begin(shuffle(pool(track()).filter(function(q){return q.skill===today.skill;})).slice(0,today.remaining),'جلسة خطة اليوم','plan');return;}
    if(node.dataset.foundationSkill){G.foundation=node.dataset.foundationSkill;var q=Q.find(function(q){return q.skill===G.foundation;});if(q)G.selectedTrack=TRACK_OF_SECTION[q.s];G.open('foundation');return;}
    if(node.dataset.foundationStart){var tr=G.selectedTrack||track(),skill=node.dataset.foundationStart;me.activeTrack=tr;var questions=pool(tr).filter(function(q){return q.skill===skill;}),example=questions[0];var remaining=questions.filter(function(q){return q!==example;});var levels={easy:0,medium:1,hard:2,unspecified:1};remaining.sort(function(a,b){function difficulty(q){var meta=L.data.metadata.find(function(m){return m.question_key===C.key(q);});return levels[meta?.difficulty||'unspecified'];}return difficulty(a)-difficulty(b);});G.begin((remaining.length?remaining:questions).slice(0,5),'تأسيس '+skill,'foundation');return;}
    if(node.dataset.mockIndex!=null&&!G.mockSubmitted){mk.i=Number(node.dataset.mockIndex);paintMock();return;}
    if(node.dataset.alertStudent){var index=roster().findIndex(function(s){return String(s.id)===node.dataset.alertStudent;});if(index>=0){clsFilter='الكل';report(index);view('report');}return;}
    if(node.dataset.alertAssignment){var student=G.data.alerts.find(function(s){return String(s.id)===node.dataset.alertAssignment;});L.open('assignments');if(el('task-target')){el('task-target').value='students';el('task-target').dispatchEvent(new Event('change'));var input=document.querySelector('[name=task-student][value="'+node.dataset.alertAssignment+'"]');if(input)input.checked=true;var alert=student?.alerts.find(function(a){return a.skill;});if(alert&&Array.from(el('task-skill').options).some(function(o){return o.value===alert.skill;})){el('task-skill').value=alert.skill;el('task-skill').dispatchEvent(new Event('change'));}el('task-title').value='متابعة '+(alert?.skill||'التدريب');el('task-title').focus();}return;}
    if(node.dataset.noteEdit){editNote(G.data.notes.find(function(n){return n.note_key===node.dataset.noteEdit;}));return;}
    if(node.dataset.noteDelete){if(!confirm('حذف هذه الملاحظة من دفتركِ؟'))return;node.disabled=true;try{await api('/api/growth',{method:'POST',body:JSON.stringify({op:'deleteNote',key:node.dataset.noteDelete})});await G.load();paintNoteRows();}catch(error){alert(error.message);node.disabled=false;}return;}
    var action=node.dataset.growthAction;
    if(action==='reload'){G.open(curView);return;}
    if(action==='start-diagnostic'){var tr=G.selectedTrack||track(),list=[];names(tr).forEach(function(skill){list=list.concat(shuffle(pool(tr).filter(function(q){return q.skill===skill;})).slice(0,2));});me.activeTrack=tr;G.begin(shuffle(list).slice(0,30),'تشخيص '+TRACK_LABEL[tr],'diagnostic');return;}
    if(action==='foundation-back'){G.foundation=null;paintFoundation(el('growth-foundation'));return;}
    if(action==='hint'&&G.hints<3&&!el('q-c').querySelector('button:disabled')){G.hints++;var q=items[i],content=el('growth-hint-text');if(G.hints===1)content.textContent=q.hint||'حددي المعطيات والمطلوب والعلاقة بينهما.';if(G.hints===2){var steps=(q.steps||[]).slice(0,-1);content.textContent=steps.length?steps.join(' ثم '):'استبعدي الخيار الذي يناقض المعطيات، ثم اختبري الخيارات المتبقية.';}el('growth-hint-count').textContent='تلميحات مستخدمة: '+ar(G.hints);node.textContent=G.hints===1?'خطوة للحل':'عرض الإجابة';if(G.hints===3){content.textContent=q.e;pick(q.a);}return;}
    if(action==='mock-flag'&&!G.mockSubmitted){G.mockFlags[mk.i]=!G.mockFlags[mk.i];paintMock();return;}
    if(action==='mock-skip'&&!G.mockSubmitted){G.mockFlags[mk.i]=true;var next=mk.list.findIndex(function(q,n){return n>mk.i&&mk.ans[n]==null;});if(next<0)next=mk.list.findIndex(function(q,n){return n!==mk.i&&mk.ans[n]==null;});if(next>=0)mk.i=next;paintMock();return;}
    if(action==='new-mock'){paintMockIntro();view('mock-intro');return;}
    if(action==='new-note')editNote(null,null);
    if(action==='note-current'&&items[i])editNote(null,items[i]);
    if(action==='close-dialog')dialog.close();
    if(action==='print')window.print();
  });
  G.paint=paint;G.seed=function(data){G.data=data;G.loaded=true;G.role=me.role;G.error='';};
})();
