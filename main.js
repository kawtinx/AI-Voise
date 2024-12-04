// تهيئة المتغيرات الأساسية
let scene, camera, renderer, sphere, innerGlow, particles, composer, bloomPass;
let audioContext, audioAnalyser, audioSource, dataArray;
let isAudioPlaying = false;
let colorPhase = 0;
const colorSpeed = 0.005;
const startColor = new THREE.Color(0xff0000);  // أحمر
const endColor = new THREE.Color(0x00ff00);    // أخضر
let time = 0;  // متغير للوقت للحركة الديناميكية
let lastAudioScale = 1;

// دالة لتنعيم التغييرات
function smoothStep(current, target, speed = 0.1) {
    return current + (target - current) * speed;
}

// دالة لمزج الألوان
function lerpColor(start, end, alpha) {
    const color = new THREE.Color();
    color.r = start.r + (end.r - start.r) * alpha;
    color.g = start.g + (end.g - start.g) * alpha;
    color.b = start.b + (end.b - start.b) * alpha;
    return color;
}

// إعداد معالجة الصوت
function setupAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 512; // زيادة الدقة
        audioAnalyser.smoothingTimeConstant = 0.8; // تنعيم التحليل
        dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        
        // إعداد معالجة ملف الصوت
        document.getElementById('audioFile').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    if (audioSource) {
                        audioSource.disconnect();
                        audioSource.stop();
                    }
                    
                    audioSource = audioContext.createBufferSource();
                    audioSource.buffer = audioBuffer;
                    audioSource.connect(audioAnalyser);
                    audioAnalyser.connect(audioContext.destination);
                    audioSource.loop = true; // تشغيل متكرر
                    audioSource.start(0);
                    isAudioPlaying = true;
                    
                    // تحديث نص الزر
                    document.getElementById('startAudio').textContent = 'تغيير الموسيقى';
                } catch (error) {
                    console.error('خطأ في تحميل الملف الصوتي:', error);
                    alert('حدث خطأ في تحميل الملف الصوتي. يرجى المحاولة مرة أخرى.');
                }
            }
        });

        // إعداد زر التشغيل
        const startButton = document.getElementById('startAudio');
        startButton.addEventListener('click', function() {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            document.getElementById('audioFile').click();
        });
    } catch (error) {
        console.error('خطأ في إعداد الصوت:', error);
    }
}

// دالة التهيئة
function init() {
    try {
        // إنشاء المشهد
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // إعداد الكاميرا
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        
        // إنشاء المُصيِّر
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 1;
        document.getElementById('scene-container').appendChild(renderer.domElement);

        // إعداد تأثير التوهج
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,    // قوة التوهج
            0.4,    // نصف القطر
            0.85    // العتبة
        );
        composer.addPass(bloomPass);
        
        // إنشاء الكرة الرئيسية
        const geometry = new THREE.SphereGeometry(0.8, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7,
            shininess: 50,
            emissive: 0xff0000,
            emissiveIntensity: 1
        });
        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        // إنشاء التوهج الداخلي
        const innerGlowGeometry = new THREE.SphereGeometry(0.7, 32, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        scene.add(innerGlow);

        // إنشاء نظام الجزيئات
        const particlesGeometry = new THREE.BufferGeometry();
        const particleCount = 2000; 
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const particleData = new Array(particleCount);

        // إنشاء مجموعات مختلفة من الجزيئات
        for(let i = 0; i < particleCount; i++) {
            const group = Math.floor(i / (particleCount / 4)); 
            const angle = (i % (particleCount / 4)) / (particleCount / 4) * Math.PI * 2;
            
            // حفظ بيانات كل جزيء
            particleData[i] = {
                group: group,
                angle: angle,
                radius: 1.2 + Math.random() * 0.3,
                speed: 0.02 + Math.random() * 0.01,
                phase: Math.random() * Math.PI * 2,
                amplitude: 0.2 + Math.random() * 0.1
            };

            // تعيين المواقع الأولية
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            // تعيين الألوان الأولية
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 0;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });

        particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);

        // إضافة الإضاءة
        const pointLight = new THREE.PointLight(0xff0000, 2);
        pointLight.position.set(2, 2, 2);
        scene.add(pointLight);

        const ambientLight = new THREE.AmbientLight(0x111111);
        scene.add(ambientLight);

        // دالة الرسم المتكررة
        function animate() {
            requestAnimationFrame(animate);
            time += 0.01;
            
            // تحليل الصوت إذا كان نشطاً
            let targetAudioScale = 1;
            if (isAudioPlaying && audioAnalyser) {
                audioAnalyser.getByteFrequencyData(dataArray);
                
                // تحليل نطاقات التردد المختلفة
                const bassFreq = dataArray.slice(0, 10).reduce((a, b) => a + b) / 10;
                const midFreq = dataArray.slice(10, 100).reduce((a, b) => a + b) / 90;
                const highFreq = dataArray.slice(100).reduce((a, b) => a + b) / (dataArray.length - 100);
                
                // حساب مقياس الصوت مع تأثيرات مختلفة للترددات
                targetAudioScale = 1 + 
                    (bassFreq / 256) * 0.5 +  // تأثير أكبر للترددات المنخفضة
                    (midFreq / 256) * 0.3 +   // تأثير متوسط للترددات المتوسطة
                    (highFreq / 256) * 0.2;    // تأثير أقل للترددات العالية
            }
            
            // تنعيم التغييرات
            lastAudioScale = smoothStep(lastAudioScale, targetAudioScale, 0.1);
            
            // تحديث مرحلة اللون
            colorPhase = (colorPhase + colorSpeed * lastAudioScale) % 2; // ربط سرعة تغير اللون بالصوت
            const alpha = colorPhase < 1 ? colorPhase : 2 - colorPhase;
            const currentColor = lerpColor(startColor, endColor, alpha);

            // تحديث الكرة والتوهج
            sphere.material.color = currentColor;
            sphere.material.emissive = currentColor;
            sphere.material.emissiveIntensity = lastAudioScale;
            innerGlow.material.color = currentColor;
            
            // تحديث الأحجام
            const scaleVector = new THREE.Vector3(lastAudioScale, lastAudioScale, lastAudioScale);
            sphere.scale.copy(scaleVector);
            innerGlow.scale.copy(scaleVector);

            // تحديث مواقع وألوان الجزيئات
            const positions = particles.geometry.attributes.position.array;
            const colors = particles.geometry.attributes.color.array;

            for(let i = 0; i < particleCount; i++) {
                const data = particleData[i];
                const t = time * data.speed + data.phase;
                let x, y, z;
                
                // تعديل نصف القطر بناءً على الصوت
                const dynamicRadius = data.radius * lastAudioScale;

                // حساب المواقع بناءً على المجموعة
                switch(data.group) {
                    case 0: // لولب أفقي
                        x = dynamicRadius * Math.cos(data.angle + t);
                        y = dynamicRadius * Math.sin(data.angle + t);
                        z = Math.sin(t * 2) * data.amplitude * lastAudioScale;
                        break;
                    case 1: // لولب عمودي
                        x = dynamicRadius * Math.cos(data.angle + t);
                        y = Math.sin(t * 2) * data.amplitude * lastAudioScale;
                        z = dynamicRadius * Math.sin(data.angle + t);
                        break;
                    case 2: // شكل الرقم 8
                        x = dynamicRadius * Math.sin(t * 2) * Math.cos(data.angle);
                        y = dynamicRadius * Math.cos(t) * Math.sin(data.angle);
                        z = dynamicRadius * Math.sin(t * 3) * 0.5;
                        break;
                    case 3: // مسار متموج
                        x = dynamicRadius * Math.cos(t + data.angle);
                        y = dynamicRadius * Math.sin(t + data.angle);
                        z = Math.cos(3 * data.angle + t) * data.amplitude * lastAudioScale;
                        break;
                }

                // تحديث المواقع
                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;

                // تحديث الألوان
                colors[i * 3] = currentColor.r;
                colors[i * 3 + 1] = currentColor.g;
                colors[i * 3 + 2] = currentColor.b;
            }

            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.color.needsUpdate = true;
            
            // تدوير العناصر
            sphere.rotation.y += 0.005;
            innerGlow.rotation.y -= 0.003;
            
            // استخدام composer بدلاً من renderer
            composer.render();
        }
        animate();

    } catch (error) {
        console.error("حدث خطأ أثناء التهيئة:", error);
        console.log("تفاصيل الخطأ:", {
            THREE: !!window.THREE,
            EffectComposer: !!window.EffectComposer,
            RenderPass: !!window.RenderPass,
            UnrealBloomPass: !!window.UnrealBloomPass,
            error: error.message
        });
    }
}

// التعامل مع تغيير حجم النافذة
function onWindowResize() {
    if (camera && renderer && composer && bloomPass) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        bloomPass.setSize(window.innerWidth, window.innerHeight);
    }
}

window.addEventListener('resize', onWindowResize, false);

// تهيئة المشهد والصوت
window.addEventListener('load', () => {
    if (window.THREE && window.EffectComposer && window.RenderPass && window.UnrealBloomPass) {
        console.log('تم تحميل جميع المكتبات بنجاح');
        init();
        setupAudio();
    } else {
        console.error('لم يتم تحميل المكتبات بشكل صحيح:', {
            THREE: !!window.THREE,
            EffectComposer: !!window.EffectComposer,
            RenderPass: !!window.RenderPass,
            UnrealBloomPass: !!window.UnrealBloomPass
        });
    }
});
