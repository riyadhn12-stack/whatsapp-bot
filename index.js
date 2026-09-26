const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
    }
});

let isBotActive = true; // حالة البوت افتراضياً شغال
const spamCount = {}; // لتخزين عدد التنبيهات لكل مستخدم

client.on('qr', (qr) => {
    console.log('امسح الباركود التالي لتشغيل البوت:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('البوت اشتغل وصار متصل بنجاح!');
});

client.on('message', async message => {
    const chat = await message.getChat();
    const text = message.body.trim();

    // أوامر التحكم (تشغيل وإيقاف)
    if (text === '+') {
        isBotActive = true;
        await message.reply('✅ تم تشغيل البوت بنجاح.');
        return;
    }
    if (text === '-') {
        isBotActive = false;
        await message.reply('🛑 تم إيقاف البوت مؤقتاً.');
        return;
    }

    // إذا كان البوت متوقفاً، لا ينفذ أي مراقبة
    if (!isBotActive) return;

    // مراقبة السبام والكلمات الممنوعة داخل المجموعات فقط
    if (chat.isGroup) {
        const msgText = text.toLowerCase();
        
        // قائمة السبام والشتائم المحددة
        const badWords = [
            "اصمل", "اصمل معي", "انيك اهلك", "انيك لك امك", "شد يدك معي",
            "كل زق امك", "كس اختك", "كس ام عرضك", "كس امك", "مسوي قوي",
            "يا ابن الجرار", "يا ابن الحرام", "يا ابن الحيوانه", "يا ابن الحيوانات",
            "يا ابن الدياثه", "يا ابن الديوث", "يا ابن الديوثتين", "يا ابن الزباله",
            "يا ابن الزنا", "يا ابن الزق", "يا ابن الزنوه", "يا ابن الساقطه",
            "يا ابن الشرموطتين", "يا ابن العاهره", "يا ابن النعله", "يا ابن القحبه",
            "يا ابن القحبتين", "يا ابن القحاب", "يا ابن القواد", "يا ابن الكلب",
            "يا ابن الكندره", "يا ابن المسترخصه", "يا ابن المسكين", "يا ابن المصخره",
            "يا ابن المصلوخه", "يا ابن الممحونه", "يا ابن المنحطه", "يا ابن المنيوكه",
            "يا ابن المنيوكتين", "يا ابن الهاتيه", "يا ابن الهطف", "يا ابن الواطيه",
            "يا جرار", "يا جزمه", "يا حشره", "يا زباله", "يا زنوه", "يا ضعيف",
            "يا فحل اختك", "يا فحل مامتك", "يا قواد", "يا مسكين", "يا نعله",
            "يا هطف", "يا واطي", "رابط", "اشتراك", "سحب", "تخفيض", "قناة", "http", "www"
        ];
        
        const containsBadWord = badWords.some(word => msgText.includes(word));
        
        if (containsBadWord) {
            const userId = message.author || message.from;
            
            // تهيئة عداد المستخدم إذا لم يكن موجوداً
            if (!spamCount[userId]) {
                spamCount[userId] = 0;
            }
            spamCount[userId]++;
            
            try {
                // حذف رسالة السبام فوراً
                await message.delete(true);
            } catch (err) {
                console.log('لم يتمكن البوت من حذف الرسالة، تأكد من صلاحيات المشرف.');
            }
            
            // التحقق من الوصول إلى الحد الأقصى (10 محاولات)
            if (spamCount[userId] >= 10) {
                try {
                    await chat.removeParticipants([userId]);
                    await chat.sendMessage(`@${userId.split('@')[0]} تم طردك بسبب تجاوز حد التنبيهات (10 محاولات سبام/شتائم).`, {
                        mentions: [userId]
                    });
                    delete spamCount[userId]; // تصفير العداد بعد الطرد
                } catch (err) {
                    await chat.sendMessage('تجاوز المستخدم الحد الأقصى للسبام، لكن لا أملك صلاحية طرده!');
                }
            } else {
                // تنبيه المستخدم
                await message.reply(`⚠️ تنبيه (${spamCount[userId]}/10): ممنوع استخدام الألفاظ أو السبام هنا!`);
            }
        }
    }
});

client.initialize();
