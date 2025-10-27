/* script.js
   نجوم تفاعلية + انفجار + ألعاب نارية (canvas)
   اكتمال من النسخة المرسلة — من كتابة: إسلام + مساعدة ليندا
*/
(() => {
    // --- عناصر DOM متوقعة أو سننشئها إذا لزم ---
    let canvas = document.getElementById('scene');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'scene';
        document.body.prepend(canvas);
    }
    const ctx = canvas.getContext('2d', { alpha: true });

    // سننشئ زر تبديل الصوت إن لم يوجد
    let audio = document.getElementById('bg-audio');
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'bg-audio';
        // ضع هنا اسم ملف الموسيقى الافتراضي إن أردت (تأكد أنه موجود في المشروع)
        // audio.src = 'love.mp3';
        audio.loop = true;
        // لا نضيف autoplay لتفادي منع المتصفحات، التشغيل عند أول تفاعل
        document.body.appendChild(audio);
    }

    let audioToggle = document.getElementById('audio-toggle');
    if (!audioToggle) {
        audioToggle = document.createElement('button');
        audioToggle.id = 'audio-toggle';
        audioToggle.title = 'Toggle music';
        audioToggle.textContent = '▶︎';
        // مظهر بسيط (يمكن تغييره في CSS)
        audioToggle.style.position = 'fixed';
        audioToggle.style.right = '16px';
        audioToggle.style.top = '16px';
        audioToggle.style.zIndex = 9999;
        audioToggle.style.background = 'rgba(0,0,0,0.4)';
        audioToggle.style.color = 'white';
        audioToggle.style.border = 'none';
        audioToggle.style.padding = '8px 10px';
        audioToggle.style.borderRadius = '6px';
        audioToggle.style.cursor = 'pointer';
        document.body.appendChild(audioToggle);
    }

    // عنصر الرسالة في الوسط (إذا لم يوجد سننشئه)
    let messageEl = document.querySelector('.luna-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'luna-message';
        messageEl.style.position = 'fixed';
        messageEl.style.left = '50%';
        messageEl.style.top = '50%';
        messageEl.style.transform = 'translate(-50%,-50%) scale(0.9)';
        messageEl.style.padding = '18px 28px';
        messageEl.style.background = 'rgba(8,6,20,0.6)';
        messageEl.style.backdropFilter = 'blur(6px)';
        messageEl.style.border = '1px solid rgba(255,255,255,0.08)';
        messageEl.style.color = 'white';
        messageEl.style.fontSize = '20px';
        messageEl.style.textAlign = 'center';
        messageEl.style.borderRadius = '12px';
        messageEl.style.opacity = '0';
        messageEl.style.zIndex = 9998;
        messageEl.style.pointerEvents = 'none';
        messageEl.style.maxWidth = '80%';
        messageEl.style.boxShadow = '0 8px 30px rgba(2,4,12,0.6)';
        document.body.appendChild(messageEl);
    }

    // نص الرسالة
    const MESSAGE_TEXT = 'I love uu…u live in my heart 💘🫶🥀🥀🥀';

    // --- إعدادات الرسم والحجم ---
    let W = canvas.width = innerWidth;
    let H = canvas.height = innerHeight;
    const DPR = window.devicePixelRatio || 1;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(DPR, DPR);

    function resize() {
        W = canvas.width = innerWidth;
        H = canvas.height = innerHeight;
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // إعادة ضبط النجوم بالنسبة للحجم الجديد
        initStars();
    }
    window.addEventListener('resize', () => {
        // تأخير بسيط لتفادي إعادة حساب متكرر
        clearTimeout(window._resizeTimeout);
        window._resizeTimeout = setTimeout(resize, 120);
    });

    // --- ثوابت وحاويات ---
    const gravity = 0.06;
    let STAR_COUNT = Math.round(Math.max(60, W * H / 20000));
    const stars = [];
    const sparks = [];      // جسيمات التفجير الصغيرة
    const fireworks = [];   // ألعاب نارية (Spectacular particles)
    const twinkleBase = 0.004;

    // --- تعريف الكائنات ---
    class Star {
        constructor(x, y, r) {
            this.x = x;
            this.y = y;
            this.r = r;
            this.baseR = r;
            this.alpha = 0.8 * (0.6 + Math.random() * 0.4);
            this.tw = Math.random() * 2 + 0.4;
            this.t = Math.random() * 100;
        }
        draw() {
            // هالة متوهجة
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 6);
            g.addColorStop(0, `rgba(255,255,255,${this.alpha})`);
            g.addColorStop(0.35, `rgba(255,220,230,${this.alpha * 0.5})`);
            g.addColorStop(1, 'rgba(50,40,70,0)');
            ctx.beginPath();
            ctx.fillStyle = g;
            ctx.arc(this.x, this.y, this.r * 3.2, 0, Math.PI * 2);
            ctx.fill();

            // نواة النجمة
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
        }
        update(dt) {
            this.t += this.tw * dt * twinkleBase;
            // نبض طفيف بواسطة sin
            const scale = 0.5 + Math.sin(this.t) * 0.5;
            this.alpha = 0.5 + scale * 0.5 * (this.baseR / 2 + 0.6);
        }
    }

    class Spark {
        constructor(x, y, vx, vy, size, color, life, fade) {
            this.x = x; this.y = y;
            this.vx = vx; this.vy = vy;
            this.size = size;
            this.color = color; // {r,g,b}
            this.life = life; this.age = 0;
            this.fade = fade;
        }
        update(dt) {
            this.age += dt;
            this.vy += gravity * dt * 0.6;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            // بعض التخميد
            this.vx *= 0.995;
            this.vy *= 0.995;
        }
        draw() {
            const p = Math.max(0, 1 - (this.age / this.life));
            ctx.beginPath();
            ctx.fillStyle = `rgba(${this.color.r},${this.color.g},${this.color.b},${p * this.fade})`;
            ctx.arc(this.x, this.y, Math.max(0.6, this.size * p), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class Firework {
        constructor(x, y, colors, count) {
            this.x = x; this.y = y;
            this.particles = [];
            this.done = false;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.8 + Math.random() * 6.0;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                const c = colors[Math.floor(Math.random() * colors.length)];
                this.particles.push(new Spark(x, y, vx, vy, 2 + Math.random() * 2, c, 900 + Math.random() * 700, 0.95));
            }
        }
        update(dt) {
            this.particles.forEach(p => p.update(dt));
            this.particles = this.particles.filter(p => p.age < p.life);
            if (this.particles.length === 0) this.done = true;
        }
        draw() {
            this.particles.forEach(p => p.draw());
        }
    }

    // --- تهيئة النجوم ---
    function initStars() {
        stars.length = 0;
        STAR_COUNT = Math.round(Math.max(60, W * H / 20000));
        for (let i = 0; i < STAR_COUNT; i++) {
            const x = Math.random() * (W - 80) + 40;
            const y = Math.random() * (H - 200) + 40; // ترك مسافة أسفل للشاشة لتوازن
            const r = 0.8 + Math.random() * 1.6;
            stars.push(new Star(x, y, r));
        }
    }

    // --- دوال الانفجار والألعاب النارية عند النقر على نجمة ---
    function explodeStarAt(x, y) {
        // أصوات نقر دقيقة (إن أردت أضيف ملف صوتي صغير هنا)
        // نجوم صغيرة متناثرة
        const colors = [
            { r: 255, g: 120, b: 160 }, // pinkish
            { r: 255, g: 200, b: 100 }, // warm
            { r: 160, g: 210, b: 255 }, // cool
            { r: 255, g: 255, b: 255 }  // white
        ];
        const count = 22 + Math.floor(Math.random() * 18);
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const sp = 1 + Math.random() * 6;
            const vx = Math.cos(ang) * sp;
            const vy = Math.sin(ang) * sp;
            const c = colors[Math.floor(Math.random() * colors.length)];
            sparks.push(new Spark(x, y, vx, vy, 1 + Math.random() * 2.2, c, 800 + Math.random() * 700, 0.96));
        }

        // ألعاب نارية أكبر (Spectacular) بعد تأخير طفيف
        setTimeout(() => {
            const bigColors = [
                { r: 255, g: 180, b: 200 },
                { r: 255, g: 230, b: 140 },
                { r: 180, g: 220, b: 255 },
                { r: 240, g: 200, b: 255 }
            ];
            fireworks.push(new Firework(x, y, bigColors, 28 + Math.floor(Math.random() * 30)));
        }, 80 + Math.random() * 160);
    }

    // --- helper: إيجاد أقرب نجمة عند النقر ضمن مسافة ---
    function findNearestStar(x, y, maxDist = 48) {
        let best = null;
        let bestDist = maxDist;
        for (let s of stars) {
            const dx = s.x - x;
            const dy = s.y - y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist * bestDist) {
                best = s;
                bestDist = Math.sqrt(d2);
            }
        }
        return best;
    }

    // --- عرض الرسالة في الوسط مع انيميشن ناعم ---
    let messageTimeout = null;
    function showCentralMessage(text = MESSAGE_TEXT) {
        messageEl.textContent = text;
        messageEl.style.transition = 'opacity 420ms cubic-bezier(.2,.9,.2,1), transform 420ms cubic-bezier(.2,.9,.2,1)';
        messageEl.style.opacity = '1';
        messageEl.style.transform = 'translate(-50%,-50%) scale(1)';
        // بعد 3.6 ثواني التلاشي
        clearTimeout(messageTimeout);
        messageTimeout = setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translate(-50%,-50%) scale(0.92)';
        }, 3800);
    }

    // --- التفاعل: نقر المستخدم على الـcanvas ---
    // نستخدم event coordinates مع مراعاة الـcanvas full size
    canvas.addEventListener('click', (ev) => {
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;

        // تشغيل الموسيقى إن لم تكن تعمل
        if (audio && audio.paused) {
            audio.play().catch(()=>{});
            audioToggle.textContent = '⏸';
        }

        // إيجاد أقرب نجمة
        const star = findNearestStar(x, y, 56);
        if (star) {
            // نعمل انفجار لطيف مكان النجمة وتزيل النجمة (تحويلها لنقطة متوهجة ثم حذف)
            // نضيف تلاشي للنجمة بجعل نصف قطرها يزداد ثم نزيلها من المصفوفة
            const idx = stars.indexOf(star);
            if (idx !== -1) stars.splice(idx, 1);

            // رسم ومؤثر انفجار عند مركز النجمة
            explodeStarAt(star.x, star.y);

            // عرض الرسالة
            showCentralMessage(MESSAGE_TEXT);
        } else {
            // لو ضغط في مكان ليس عليه نجمة، نطلق ألعاب نارية أصغر هناك
            explodeStarAt(x, y);
            showCentralMessage(MESSAGE_TEXT);
        }
    });

    // --- زر تبديل الصوت ---
    let isPlaying = false;
    audioToggle.addEventListener('click', () => {
        if (!isPlaying) {
            audio.play().catch(()=>{});
            audioToggle.textContent = '⏸';
            isPlaying = true;
        } else {
            audio.pause();
            audioToggle.textContent = '▶︎';
            isPlaying = false;
        }
    });

    // --- حلقة الأنيميشن الرئيسية ---
    let last = performance.now();
    function loop(now) {
        const dt = Math.min(40, now - last); // ms
        last = now;
        const step = dt / 16.666; // معيار 60fps scale

        // مسح الخلفية (سماء ليلية بتموج خفيف)
        // نرسم تدرج جميل بدلاً من لون ثابت
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#071226');
        grd.addColorStop(0.5, '#091028');
        grd.addColorStop(1, '#02020a');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        // تحديث ورسم النجوم
        for (let s of stars) {
            s.update(step);
            s.draw();
        }

        // تحديث ورسم sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
            const sp = sparks[i];
            sp.update(step);
            sp.draw();
            if (sp.age >= sp.life) sparks.splice(i, 1);
        }

        // تحديث ورسم fireworks
        for (let i = fireworks.length - 1; i >= 0; i--) {
            const fw = fireworks[i];
            fw.update(step);
            fw.draw();
            if (fw.done) fireworks.splice(i, 1);
        }

        // رسم وميض نجمي خفيف (يمكن إضافة تأثيرات أخرى هنا)

        requestAnimationFrame(loop);
    }

    // --- بدء التشغيل ---
    function start() {
        resize();
        initStars();
        last = performance.now();
        requestAnimationFrame(loop);
    }

    // شغّل
    start();

    // --- تحسين: الضغط الطويل لإظهار/إيقاف الموسيقى مؤقتًا ---
    // (اختياري) دعم لمسات الهواتف
    let touchStartTime = 0;
    canvas.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
    });
    canvas.addEventListener('touchend', (e) => {
        const dt = Date.now() - touchStartTime;
        if (dt < 300) {
            // قصيرة: تعامل كـ click
            const touch = e.changedTouches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            const star = findNearestStar(x, y, 56);
            if (star) {
                const idx = stars.indexOf(star);
                if (idx !== -1) stars.splice(idx, 1);
                explodeStarAt(star.x, star.y);
                showCentralMessage(MESSAGE_TEXT);
            } else {
                explodeStarAt(x, y);
                showCentralMessage(MESSAGE_TEXT);
            }
            if (audio && audio.paused) {
                audio.play().catch(()=>{});
                audioToggle.textContent = '⏸';
                isPlaying = true;
            }
        }
    });

    // --- تنظيف عند الخروج (غير ضروري) ---
    window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // إيقاف أو تخفيف العمل لو أردت - هنا نكتفي بإيقاف الصوت
            if (audio && !audio.paused) {
                audio.pause();
                audioToggle.textContent = '▶︎';
                isPlaying = false;
            }
        }
    });

})();
