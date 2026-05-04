# ⚡ تحدّي - Daily Challenge App

تطبيق ويب للتحديات اليومية مع الذكاء الاصطناعي وجمع النقاط.

---

## 📁 هيكل المشروع

```
daily-challenge/
├── index.html         ← الصفحة الرئيسية
├── css/
│   └── style.css      ← كل التصميم (RTL + Responsive)
├── js/
│   └── app.js         ← كل المنطق + AI Search
└── README.md
```

---

## 🚀 كيف ترفعه على GitHub + Netlify

### الخطوة 1 – افتح VS Code وانشئ مجلد

```bash
mkdir daily-challenge
cd daily-challenge
# ضع الملفات داخله
```

### الخطوة 2 – ارفع على GitHub

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daily-challenge.git
git push -u origin main
```

### الخطوة 3 – انشر على Netlify (مجاني)

1. روح على [app.netlify.com](https://app.netlify.com)
2. اضغط **"Add new site"** → **"Import an existing project"**
3. اختار **GitHub** وحدد الـ repo بتاعك
4. اضغط **Deploy** — خلاص! 🎉

رابطك هيكون: `https://your-app-name.netlify.app`

---

## ✨ الميزات

| الميزة | الوصف |
|--------|-------|
| 🎯 أهداف يومية | 5 تحديات افتراضية يتجددون كل يوم |
| 🔍 بحث بالـ AI | أي هدف تكتبه يطلعلك تحديات مخصصة |
| ⚡ نقاط وليفلز | 7 مستويات من مبتدئ لخارق |
| 🔥 Streak | عداد الأيام المتتالية |
| 👥 لوحة متصدرين | تشوف نقاط أصدقائك على نفس الجهاز |
| 📤 مشاركة | شارك الموقع عبر واتساب أو نسخ الرابط |
| 📱 Responsive | يشتغل على موبايل ولابتوب بواجهة مختلفة |

---

## 🎮 كيف تشارك مع أصدقائك

1. ارفع الموقع على Netlify
2. ابعت الرابط لأصدقائك
3. كل واحد يفتح بـ اسمه — النقاط بتتحفظ محلياً
4. **لوحة المتصدرين** بتشوف كل اللي فاتحين الموقع على نفس المتصفح

> ⚠️ للأصدقاء على أجهزة مختلفة: تحتاج backend. التطبيق الحالي يعمل محلياً على نفس المتصفح.

---

## 🔑 إعداد Anthropic API

لتشغيل البحث بالذكاء الاصطناعي محلياً:

لو محتاج تختبر محلياً بدون API، عدّل في `js/app.js` دالة `runAISearch` وحط نتائج وهمية.

---

## 🛠️ تطوير مستقبلي

- [ ] Backend (Supabase/Firebase) للمتصدرين الحقيقيين
- [ ] إشعارات يومية
- [ ] تحديات أسبوعية وشهرية
- [ ] ملف شخصي مع صور
