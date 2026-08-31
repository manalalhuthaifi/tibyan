# تبيان — النشر على Vercel مع MongoDB Atlas

## ١) متغيّرات البيئة (Vercel → Settings → Environment Variables)

| المتغيّر | القيمة |
|---|---|
| `MONGODB_URI` | سلسلة الاتصال من Atlas (Connect → Drivers) |
| `MONGODB_DB` | `tibyan` |
| `JWT_SECRET` | نص طويل عشوائي |
| `SEED_SECRET` | نص طويل عشوائي |
| `TEACHER_USER` / `TEACHER_PASS` / `TEACHER_NAME` | `areej` / كلمة مرور قوية / `أ. أريج` |
| `MANAGER_USER` / `MANAGER_PASS` / `MANAGER_NAME` | `manager` / كلمة مرور قوية / `أ. عفاف` |

في Atlas → Network Access أضيفي `0.0.0.0/0` حتى تصل دوال Vercel لقاعدة البيانات.

## ٢) النشر

```bash
npm i -g vercel
vercel --prod
```

## ٣) التهيئة مرة واحدة بعد أول نشر

```bash
curl -X POST https://<اسم-المشروع>.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret":"<SEED_SECRET>"}'
```
ينشئ حسابي المعلمة والمديرة والفهارس.

## البنية

```
api/auth/signup.js   إنشاء حساب طالبة
api/auth/login.js    تسجيل الدخول
api/me.js            قراءة/حفظ تقدّم الطالبة
api/students.js      قائمة الطالبات (معلمة/مديرة)
api/questions.js     بنك الأسئلة
api/channels.js      القنوات الموصى بها
api/contacts.js      سجل التواصل
api/seed.js          التهيئة الأولى
api/health.js        فحص الاتصال
public/index.html    التطبيق
```

المجموعات في MongoDB: `users` · `questions` · `channels` · `contacts`.

الملف `public/index.html` يعمل أيضًا وحده بدون خادم (وضع محلي) إذا فُتح مباشرة من القرص.
