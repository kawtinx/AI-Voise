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
            this.orb = document.querySelector('.ai-orb');
            if (!this.orb) {
                console.error('AI Orb element not found!');
                return;
            }
            console.log('AI Orb initialized');
        }

        setupGroqClient() {
            if (typeof axios === 'undefined') {
                console.error('Axios not loaded!');
                return;
            }
            this.groqApiKey = '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';
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
                    this.orb.classList.add('listening');
                };

                this.recognition.onend = () => {
                    console.log('Speech recognition ended');
                    this.isListening = false;
                    this.orb.classList.remove('listening');
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
                    this.orb.classList.remove('listening');
                    
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
            this.synthesis = window.speechSynthesis;
            
            if (this.synthesis.onvoiceschanged !== undefined) {
                this.synthesis.onvoiceschanged = () => {
                    const voices = this.synthesis.getVoices();
                    console.log('Speech synthesis voices loaded:', voices);
                    
                    const englishVoice = voices.find(voice => 
                        voice.lang.includes('en-US') || 
                        voice.name.toLowerCase().includes('english')
                    );
                    
                    if (englishVoice) {
                        console.log('Found English voice:', englishVoice.name);
                        this.defaultVoice = englishVoice;
                    } else {
                        console.log('No English voice found, will use default voice');
                    }
                };
            }
            
            this.synthesis.getVoices();
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
                this.orb.classList.remove('listening', 'speaking');
                this.orb.classList.add('processing');
                
                const response = await this.getGroqResponse(transcript);
                console.log('AI response:', response);
                
                this.orb.classList.remove('processing');
                this.orb.classList.add('speaking');
                
                await this.speak(response);
                
                this.orb.classList.remove('speaking');
            } catch (error) {
                console.error('Error processing input:', error);
                this.orb.classList.remove('processing', 'speaking');
                this.speak('Sorry, an error occurred while processing your request');
            }
        }

        async getGroqResponse(input) {
            try {
                console.log('Sending request to local server...');
                
                const response = await axios.post('http://localhost:3000/api/chat', {
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
                });

                if (!response.data || !response.data.choices || !response.data.choices[0]) {
                    console.error('Invalid response format:', response.data);
                    throw new Error('Invalid server response');
                }

                console.log('Server Response:', response.data);
                return response.data.choices[0].message.content;
            } catch (error) {
                console.error('Server Error:', error.response ? error.response.data : error);
                if (error.response && error.response.data && error.response.data.details) {
                    throw new Error(`Connection failed: ${error.response.data.details}`);
                }
                throw new Error('Failed to connect to AI service');
            }
        }

        async speak(text) {
            try {
                if (!this.synthesis) {
                    console.error('Speech synthesis not initialized');
                    return;
                }

                return new Promise((resolve, reject) => {
                    const utterance = new SpeechSynthesisUtterance(text);
                    
                    // Get available voices
                    const voices = this.synthesis.getVoices();
                    console.log('Available voices:', voices);

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
                    utterance.rate = 0.9; // Slightly slower rate for male voice
                    utterance.pitch = 0.9; // Slightly lower pitch for male voice

                    utterance.onend = () => {
                        console.log('Speech finished, starting listening...');
                        this.orb.classList.remove('speaking');
                        // Start listening automatically after speaking
                        setTimeout(() => {
                            this.startListening();
                        }, 500); // Short delay before starting to listen
                        resolve();
                    };

                    utterance.onerror = (event) => {
                        console.error('Speech synthesis error:', event);
                        this.orb.classList.remove('speaking');
                        reject(event);
                    };

                    this.orb.classList.add('speaking');
                    this.synthesis.speak(utterance);
                });
            } catch (error) {
                console.error('Error in speak function:', error);
                this.orb.classList.remove('speaking');
                throw error;
            }
        }
    }

    const assistant = new VoiceAssistant();
});
