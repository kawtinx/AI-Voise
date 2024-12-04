document.addEventListener('DOMContentLoaded', () => {
    class VoiceAssistant {
        constructor() {
            this.initializeElements();
            this.initializeSpeechSynthesis();
            this.isListening = false;
            this.setupGroqClient();
            this.setupEventListeners();
            
            // Initialize speech recognition after a short delay
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
                if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
                    console.error('Speech recognition not supported in this browser');
                    return;
                }

                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                
                if (!this.recognition) {
                    console.error('Failed to create speech recognition instance');
                    return;
                }

                this.recognition.lang = 'en-US';
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
                };

                this.recognition.onresult = (event) => {
                    if (event.results && event.results[0]) {
                        const transcript = event.results[0][0].transcript;
                        console.log('Recognized speech:', transcript);
                        this.processUserInput(transcript);
                    } else {
                        console.error('No speech detected');
                    }
                };

                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    this.isListening = false;
                    this.orb.classList.remove('active');
                    
                    // Attempt to reinitialize on error
                    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                        console.log('Attempting to reinitialize speech recognition...');
                        setTimeout(() => this.initializeSpeechRecognition(), 1000);
                    }
                };

                console.log('Speech recognition initialized successfully');
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
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
            try {
                if (!this.recognition) {
                    console.error('Speech recognition not initialized');
                    return;
                }
                this.recognition.start();
                console.log('Started listening');
            } catch (error) {
                console.error('Error starting recognition:', error);
                // Attempt to reinitialize on error
                this.initializeSpeechRecognition();
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
            }
        }

        async getResponse(input) {
            try {
                this.startSpeaking();
                const response = await this.getGroqResponse(input);
                await this.speak(response);
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
                                role: "system",
                                content: "You are a helpful AI assistant. Keep your answers concise and informative."
                            },
                            {
                                role: "user",
                                content: input
                            }
                        ],
                        model: "mixtral-8x7b-32768",
                        temperature: 0.7,
                        max_tokens: 150
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (!data || !data.choices || !data.choices[0]) {
                    console.error('Invalid response format:', data);
                    throw new Error('Invalid server response');
                }

                console.log('Server Response:', data);
                return data.choices[0].message.content;
            } catch (error) {
                console.error('Server Error:', error);
                return this.handleApiError(error);
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

                return new Promise((resolve, reject) => {
                    // Split long text into smaller chunks
                    const chunks = this.splitTextIntoChunks(text);
                    let currentChunk = 0;

                    const speakNextChunk = () => {
                        if (currentChunk < chunks.length) {
                            const utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
                            
                            // Get voices again in case they weren't loaded initially
                            const voices = this.availableVoices || this.synthesis.getVoices();
                            console.log('Current voices:', voices);

                            // Try to find a male English voice
                            const maleVoice = voices.find(voice => 
                                (voice.lang.includes('en-US') || voice.name.toLowerCase().includes('english')) &&
                                (voice.name.toLowerCase().includes('male') || 
                                 voice.name.toLowerCase().includes('david') || 
                                 voice.name.toLowerCase().includes('james') ||
                                 voice.name.toLowerCase().includes('john'))
                            );

                            if (maleVoice) {
                                console.log('Using male voice:', maleVoice.name);
                                utterance.voice = maleVoice;
                            } else {
                                // Fallback to any English voice if male voice not found
                                const englishVoice = voices.find(voice => 
                                    voice.lang.includes('en-US') || 
                                    voice.name.toLowerCase().includes('english')
                                );
                                if (englishVoice) {
                                    console.log('Fallback to English voice:', englishVoice.name);
                                    utterance.voice = englishVoice;
                                }
                            }

                            utterance.lang = 'en-US';
                            utterance.rate = 0.9; // Slightly slower rate
                            utterance.pitch = 0.9; // Slightly lower pitch for male voice
                            utterance.volume = 1.0; // Maximum volume

                            utterance.onend = () => {
                                currentChunk++;
                                if (currentChunk < chunks.length) {
                                    speakNextChunk();
                                } else {
                                    console.log('Speech finished, starting listening...');
                                    this.orb.classList.remove('speaking');
                                    // Start listening automatically after speaking
                                    setTimeout(() => {
                                        this.startListening();
                                    }, 500);
                                    resolve();
                                }
                            };

                            utterance.onerror = (event) => {
                                console.error('Speech synthesis error:', event);
                                this.orb.classList.remove('speaking');
                                reject(event);
                            };

                            // Keep the speech synthesis active
                            const keepAlive = setInterval(() => {
                                if (this.synthesis.speaking) {
                                    this.synthesis.pause();
                                    this.synthesis.resume();
                                } else {
                                    clearInterval(keepAlive);
                                }
                            }, 5000); // Check every 5 seconds

                            this.orb.classList.add('speaking');
                            this.synthesis.speak(utterance);
                        }
                    };

                    speakNextChunk();
                });
            } catch (error) {
                console.error('Error in speak function:', error);
                this.orb.classList.remove('speaking');
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
