# 🎙️ AI Voice Assistant

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

</div>

## 🌟 نظرة عامة

مساعد صوتي ذكي يعمل على الويب مع واجهة تفاعلية جذابة. يمكنه فهم والرد على الأوامر الصوتية باللغة العربية والإنجليزية باستخدام صوت طبيعي.

## ✨ المميزات الرئيسية

🎤 **تفاعل صوتي متقدم**
- التعرف التلقائي على الصوت باللغتين العربية والإنجليزية
- نطق طبيعي بصوت واضح
- محادثة مستمرة بدون توقف
- دعم متعدد اللغات

🔮 **واجهة مستخدم مميزة**
- تصميم عصري وجذاب
- كرة AI تفاعلية مع تأثيرات بصرية
- تغيير الألوان حسب حالة المساعد
- تجربة مستخدم سلسة وممتعة
- وضع ليلي/نهاري

🧠 **ذكاء اصطناعي متطور**
- مدعوم بواسطة Groq AI
- فهم ذكي للسياق والمحادثة
- ردود دقيقة وطبيعية
- ذاكرة محادثة متقدمة

## 🚀 البدء السريع

### المتطلبات الأساسية
- Node.js (الإصدار 14 أو أحدث)
- متصفح حديث يدعم Web Speech API
- مفتاح Groq API

### خطوات التثبيت

1. **استنساخ المشروع**
   ```bash
   git clone https://github.com/kawtinx/oise_web_ai.git
   cd oise_web_ai
   ```

2. **تثبيت المكتبات**
   ```bash
   npm install
   ```

3. **إعداد متغيرات البيئة**
   - انسخ ملف `.env.example` إلى `.env`
   - أضف مفتاح Groq API الخاص بك
   ```bash
   cp .env.example .env
   ```

4. **تشغيل المشروع**
   ```bash
   npm start
   ```

## 💻 الاستخدام

1. افتح المتصفح على `http://localhost:3000`
2. اضغط على زر المايكروفون للبدء
3. تحدث بوضوح باللغة العربية أو الإنجليزية
4. انتظر الرد الصوتي من المساعد

## 🛠️ التقنيات المستخدمة

- **الواجهة الأمامية**: HTML5, CSS3, JavaScript
- **الخادم**: Node.js, Express
- **الذكاء الاصطناعي**: Groq AI API
- **التعرف الصوتي**: Web Speech API
- **تحويل النص إلى كلام**: Web Speech Synthesis

## 🔧 التخصيص

يمكنك تخصيص المساعد من خلال:
- تعديل ملف `config.js` لتغيير الإعدادات الأساسية
- تحديث الأنماط في `style.css`
- إضافة لغات جديدة في `languages.js`

## 📝 المساهمة

نرحب بمساهماتكم! يرجى اتباع هذه الخطوات:
1. Fork المشروع
2. إنشاء فرع للميزة الجديدة
3. تقديم Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 👥 المطورون

- [@kawtinx](https://github.com/kawtinx) - مطور رئيسي

## 📞 الدعم

إذا واجهت أي مشاكل، يرجى:
- فتح issue جديد
- التواصل عبر البريد الإلكتروني: support@example.com
