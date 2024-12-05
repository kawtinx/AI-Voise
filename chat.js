document.addEventListener('DOMContentLoaded', () => {
    class ErrorMonitor {
        constructor(voiceAssistant) {
            this.assistant = voiceAssistant;
            this.errorCount = new Map();
            this.lastError = null;
            this.recoveryStrategies = new Map([
                ['no-speech', this.handleNoSpeechError.bind(this)],
                ['network', this.handleNetworkError.bind(this)],
                ['not-allowed', this.handlePermissionError.bind(this)],
                ['service-not-allowed', this.handlePermissionError.bind(this)],
                ['aborted', this.handleAbortError.bind(this)]
            ]);
        }

        async monitorError(error, context) {
            console.log('نظام المراقبة: تم اكتشاف خطأ', { error, context });
            
            // تسجيل الخطأ
            const errorKey = error.name || error.message;
            this.errorCount.set(errorKey, (this.errorCount.get(errorKey) || 0) + 1);
            this.lastError = { error, timestamp: Date.now(), context };

            // محاولة إصلاح الخطأ
            await this.attemptRecovery(error);
            
            // تحليل نمط الأخطاء
            this.analyzeErrorPatterns();
        }

        async attemptRecovery(error) {
            const strategy = this.recoveryStrategies.get(error.type || 'default');
            if (strategy) {
                console.log('نظام المراقبة: محاولة إصلاح الخطأ');
                await strategy(error);
            } else {
                await this.handleDefaultError(error);
            }
        }

        async handleNoSpeechError() {
            console.log('نظام المراقبة: معالجة خطأ عدم وجود صوت');
            await this.assistant.speak('لم أتمكن من سماعك. هل يمكنك التحدث بصوت أعلى؟');
            setTimeout(() => this.assistant.startListening(), 1000);
        }

        async handleNetworkError() {
            console.log('نظام المراقبة: معالجة خطأ الشبكة');
            await this.assistant.speak('يوجد مشكلة في الاتصال بالإنترنت. جاري المحاولة مرة أخرى...');
            setTimeout(() => this.assistant.initializeSpeechRecognition(), 3000);
        }

        async handlePermissionError() {
            console.log('نظام المراقبة: معالجة خطأ الصلاحيات');
            await this.assistant.speak('يرجى السماح باستخدام الميكروفون للمتابعة');
        }

        async handleAbortError() {
            console.log('نظام المراقبة: معالجة خطأ الإلغاء');
            setTimeout(() => this.assistant.startListening(), 500);
        }

        async handleDefaultError(error) {
            console.log('نظام المراقبة: معالجة خطأ غير معروف');
            await this.assistant.speak('عذراً، حدث خطأ. جاري إعادة تشغيل النظام...');
            setTimeout(() => this.assistant.initializeSpeechRecognition(), 2000);
        }

        analyzeErrorPatterns() {
            // تحليل أنماط الأخطاء المتكررة
            for (const [errorKey, count] of this.errorCount.entries()) {
                if (count >= 3) {
                    console.log(`نظام المراقبة: تم اكتشاف نمط خطأ متكرر: ${errorKey}`);
                    this.handleRecurringError(errorKey);
                }
            }
        }

        async handleRecurringError(errorKey) {
            // معالجة الأخطاء المتكررة
            await this.assistant.speak('يبدو أن هناك مشكلة متكررة. سأحاول إصلاحها...');
            
            // إعادة تهيئة النظام
            setTimeout(() => {
                this.errorCount.clear();
                this.assistant.initializeSpeechRecognition();
            }, 2000);
        }
    }

    class VoiceAssistant {
        constructor() {
            this.initializeElements();
            this.initializeSpeechSynthesis();
            this.isListening = false;
            this.setupGroqClient();
            this.setupEventListeners();
            this.shouldRestart = false;
            
            // إنشاء نظام المراقبة
            this.errorMonitor = new ErrorMonitor(this);
            
            setTimeout(() => {
                this.initializeSpeechRecognition();
            }, 1000);
        }

        initializeElements() {
            this.orb = document.querySelector('.orb');
            if (!this.orb) {
                console.error('Orb element not found!');
                return;
            }
            console.log('Orb initialized');
        }

        setupGroqClient() {
            if (typeof fetch === 'undefined') {
                console.error('Fetch API not supported!');
                return;
            }
            console.log('Groq client initialized');
        }

        initializeSpeechRecognition() {
            try {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    console.error('Speech recognition not supported');
                    return;
                }

                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;

                this.recognition.onstart = () => {
                    console.log('Speech recognition started');
                    this.isListening = true;
                    this.orb.classList.add('active');
                };

                this.recognition.onend = () => {
                    console.log('Speech recognition ended');
                    this.isListening = false;
                    this.orb.classList.remove('active');
                    
                    // Automatically restart if no speech was detected
                    if (this.shouldRestart) {
                        this.shouldRestart = false;
                        console.log('Restarting speech recognition...');
                        setTimeout(() => this.startListening(), 100);
                    }
                };

                this.recognition.onresult = (event) => {
                    if (event.results.length > 0) {
                        const transcript = event.results[0][0].transcript;
                        console.log('Recognized speech:', transcript);
                        this.processUserInput(transcript);
                    } else {
                        console.error('No speech detected');
                        this.shouldRestart = true;
                    }
                };

                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    this.isListening = false;
                    this.orb.classList.remove('active');
                    
                    switch (event.error) {
                        case 'no-speech':
                            console.log('No speech detected, restarting...');
                            this.shouldRestart = true;
                            break;
                        case 'aborted':
                            console.log('Speech recognition aborted, restarting...');
                            setTimeout(() => this.startListening(), 100);
                            break;
                        case 'network':
                            console.log('Network error, retrying in 3 seconds...');
                            setTimeout(() => this.startListening(), 3000);
                            break;
                        case 'not-allowed':
                        case 'service-not-allowed':
                            console.log('Permission denied, please enable microphone access');
                            // Show a user-friendly message
                            this.speak('Please enable microphone access to use voice recognition.');
                            break;
                        default:
                            console.log('Attempting to reinitialize speech recognition...');
                            setTimeout(() => this.initializeSpeechRecognition(), 1000);
                    }
                    
                    // Monitor error
                    this.errorMonitor.monitorError(event.error, 'speech recognition');
                };

                console.log('Speech recognition initialized');
                this.startListening();
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
                this.speak('Sorry, there was an error initializing speech recognition. Please try refreshing the page.');
                
                // Monitor error
                this.errorMonitor.monitorError(error, 'speech recognition initialization');
            }
        }

        initializeSpeechSynthesis() {
            if (typeof window.speechSynthesis === 'undefined') {
                console.error('Speech synthesis not supported!');
                return;
            }
            
            this.synthesis = window.speechSynthesis;
            
            // Get the list of voices when they are loaded
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = this.onvoiceschanged.bind(this);
            }
            
            // Try to get voices immediately as well
            this.onvoiceschanged();
        }

        onvoiceschanged() {
            const voices = this.synthesis.getVoices();
            console.log('Available voices:', voices);
            
            // Store available voices for later use
            this.availableVoices = voices;
        }

        setupEventListeners() {
            if (!this.orb) return;
            
            this.orb.addEventListener('click', () => {
                console.log('Orb clicked, listening state:', this.isListening);
                if (!this.isListening) {
                    if (!this.recognition) {
                        console.log('Reinitializing speech recognition...');
                        this.initializeSpeechRecognition();
                        setTimeout(() => this.startListening(), 500);
                    } else {
                        this.startListening();
                    }
                } else {
                    this.stopListening();
                }
            });
        }

        startListening() {
            if (!this.recognition) {
                console.log('Recognition not initialized, attempting to initialize...');
                this.initializeSpeechRecognition();
                return;
            }

            try {
                if (!this.isListening) {
                    this.recognition.start();
                }
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                this.isListening = false;
                this.orb.classList.remove('active');
                setTimeout(() => this.initializeSpeechRecognition(), 1000);
                
                // Monitor error
                this.errorMonitor.monitorError(error, 'speech recognition start');
            }
        }

        stopListening() {
            try {
                if (!this.recognition) {
                    console.error('Speech recognition not initialized');
                    return;
                }
                this.recognition.stop();
                console.log('Stopped listening');
            } catch (error) {
                console.error('Error stopping recognition:', error);
                
                // Monitor error
                this.errorMonitor.monitorError(error, 'speech recognition stop');
            }
        }

        async processUserInput(transcript) {
            console.log('Processing user input:', transcript);
            
            try {
                this.orb.classList.remove('active', 'speaking');
                this.orb.classList.add('processing');
                
                const response = await this.getResponse(transcript);
                console.log('AI response:', response);
                
                this.orb.classList.remove('processing');
                this.orb.classList.add('thinking');
                
                await this.speak(response);
                
                this.orb.classList.remove('thinking');
                this.orb.classList.add('speaking');
                
                setTimeout(() => {
                    this.orb.classList.remove('speaking');
                }, 2000);
            } catch (error) {
                console.error('Error processing input:', error);
                this.orb.classList.remove('processing', 'speaking', 'thinking');
                this.speak('Sorry, an error occurred while processing your request');
                
                // Monitor error
                this.errorMonitor.monitorError(error, 'input processing');
            }
        }

        async getResponse(input) {
            try {
                this.startSpeaking();
                const response = await this.getGroqResponse(input);
                return response;
            } finally {
                this.stopSpeaking();
            }
        }

        startSpeaking() {
            this.orb.classList.add('speaking');
        }

        stopSpeaking() {
            this.orb.classList.remove('speaking');
        }

        async getGroqResponse(input) {
            try {
                console.log('Sending request to local server...');
                
                const response = await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: 'user',
                                content: input
                            }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Server error: ${errorData.error || response.statusText}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;
            } catch (error) {
                console.error('Detailed error:', error);
                if (error.message.includes('Failed to fetch')) {
                    throw new Error('Unable to connect to the server. Please ensure the server is running (node server.js)');
                }
                throw error;
            }
        }

        async speak(text) {
            try {
                if (!this.synthesis) {
                    console.error('Speech synthesis not initialized');
                    return;
                }

                // Cancel any ongoing speech
                this.synthesis.cancel();
                
                // Clear any existing speaking timeouts
                if (this.speakingTimeout) {
                    clearTimeout(this.speakingTimeout);
                }

                return new Promise((resolve, reject) => {
                    // Split long text into smaller chunks
                    const chunks = this.splitTextIntoChunks(text);
                    let currentChunk = 0;

                    const speakNextChunk = () => {
                        if (currentChunk < chunks.length) {
                            const utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
                            
                            // Get voices again in case they weren't loaded initially
                            const voices = this.availableVoices || this.synthesis.getVoices();
                            
                            // Try to find a male English voice
                            const maleVoice = voices.find(voice => 
                                (voice.lang.includes('en-US') || voice.name.toLowerCase().includes('english')) &&
                                (voice.name.toLowerCase().includes('male') || 
                                 voice.name.toLowerCase().includes('david') || 
                                 voice.name.toLowerCase().includes('james') ||
                                 voice.name.toLowerCase().includes('john'))
                            );

                            if (maleVoice) {
                                utterance.voice = maleVoice;
                            }

                            utterance.rate = 1.0;
                            utterance.pitch = 1.0;
                            utterance.volume = 1.0;

                            utterance.onend = () => {
                                currentChunk++;
                                if (currentChunk < chunks.length) {
                                    this.speakingTimeout = setTimeout(speakNextChunk, 250);
                                } else {
                                    resolve();
                                }
                            };

                            utterance.onerror = (event) => {
                                console.error('Speech synthesis error:', event);
                                reject(event);
                            };

                            this.synthesis.speak(utterance);
                        }
                    };

                    speakNextChunk();
                });
            } catch (error) {
                console.error('Error in speak function:', error);
                throw error;
            }
        }

        splitTextIntoChunks(text) {
            // Split text at sentence boundaries
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            const chunks = [];
            let currentChunk = '';

            for (const sentence of sentences) {
                if (currentChunk.length + sentence.length < 200) {
                    currentChunk += sentence;
                } else {
                    if (currentChunk) chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                }
            }
            if (currentChunk) chunks.push(currentChunk.trim());
            return chunks;
        }

        async handleApiError(error) {
            if (error.message.includes('rate limit exceeded')) {
                return "عذراً، تم تجاوز حد الاستخدام للنموذج. يرجى المحاولة مرة أخرى بعد ساعة تقريباً.";
            }
            return "عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.";
        }
    }

    const assistant = new VoiceAssistant();
});
