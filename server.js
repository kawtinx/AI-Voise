const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Function to detect if text contains Arabic
function containsArabic(text) {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text);
}

// نظام مراقبة حالة الخادم
class ServerMonitor {
    constructor() {
        this.errors = [];
        this.lastCheck = Date.now();
        this.isHealthy = true;
        this.totalRequests = 0;
        this.successfulRequests = 0;
    }

    logRequest(success = true) {
        this.totalRequests++;
        if (success) {
            this.successfulRequests++;
        }
    }

    logError(error, context) {
        const errorEntry = {
            timestamp: Date.now(),
            error,
            context,
            status: 'new'
        };

        this.errors.unshift(errorEntry);
        this.cleanOldErrors();
        this.analyzeServerHealth();
        
        // تسجيل الخطأ في سجل النظام
        systemLogger.log(`خطأ: ${error.message}`, 'error');
    }

    getErrors(limit = 50) {
        return this.errors.slice(0, limit).map(error => ({
            timestamp: error.timestamp,
            type: error.error.name || 'Unknown',
            message: error.error.message,
            status: error.status
        }));
    }

    getHealthStatus() {
        const successRate = this.totalRequests === 0 ? 0 : 
            Math.round((this.successfulRequests / this.totalRequests) * 100);

        return {
            isHealthy: this.isHealthy,
            recentErrorCount: this.errors.length,
            lastCheck: this.lastCheck,
            totalRequests: this.totalRequests,
            successfulRequests: this.successfulRequests,
            successRate
        };
    }

    cleanOldErrors() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.errors = this.errors.filter(error => error.timestamp > oneHourAgo);
    }

    analyzeServerHealth() {
        const recentErrors = this.errors.filter(error => 
            error.timestamp > (Date.now() - (5 * 60 * 1000)) // آخر 5 دقائق
        );

        this.isHealthy = recentErrors.length < 5;
        console.log(`حالة الخادم: ${this.isHealthy ? 'صحية' : 'غير صحية'}`);
    }
}

const serverMonitor = new ServerMonitor();

// نظام تسجيل الأحداث
class SystemLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // الحد الأقصى لعدد السجلات
    }

    log(message, type = 'info') {
        this.logs.unshift({
            timestamp: Date.now(),
            message,
            type
        });

        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
    }

    getLogs(limit = 100) {
        return this.logs.slice(0, limit);
    }
}

const systemLogger = new SystemLogger();

// نظام تخزين المحادثات
class ConversationManager {
    constructor() {
        this.conversations = [];
        this.maxConversations = 100;
    }

    addConversation(userInput, aiResponse, status = 'success') {
        const conversation = {
            timestamp: Date.now(),
            userInput,
            aiResponse,
            status
        };

        this.conversations.unshift(conversation);

        if (this.conversations.length > this.maxConversations) {
            this.conversations.pop();
        }

        return conversation;
    }

    getConversations(limit = 50) {
        return this.conversations.slice(0, limit);
    }
}

const conversationManager = new ConversationManager();

app.post('/api/chat', async (req, res) => {
    try {
        systemLogger.log('تم استلام طلب جديد');
        const userInput = req.body.messages[req.body.messages.length - 1].content;
        
        const serverHealth = serverMonitor.getHealthStatus();
        if (!serverHealth.isHealthy) {
            systemLogger.log('تحذير: النظام في حالة غير مستقرة', 'warning');
        }

        // Always set system message to respond in English
        const systemMessage = {
            role: 'system',
            content: "You are a helpful AI assistant. Keep your answers concise and informative. Always respond in English, even if the input is in another language. If you receive input in Arabic or another language, first understand it, then respond in English."
        };

        const messages = [
            systemMessage,
            ...req.body.messages
        ];

        // إضافة محاولات إعادة المحاولة للاتصال بـ API
        let retries = 3;
        let response;
        
        while (retries > 0) {
            try {
                response = await axios.post('https://api.groq.com/openai/v1/chat/completions', 
                    {
                        messages,
                        model: "mixtral-8x7b-32768",
                        temperature: 0.7,
                        max_tokens: 150
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${GROQ_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000 // 10 ثواني للتايم اوت
                    }
                );
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                console.log(`فشل الاتصال، محاولة إعادة الاتصال... (${retries} محاولات متبقية)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('استجابة API:', response.data);
        const aiResponse = response.data.choices[0].message.content;
        
        // تخزين المحادثة
        conversationManager.addConversation(userInput, aiResponse, 'success');
        
        serverMonitor.logRequest(true);
        systemLogger.log('تم معالجة الطلب بنجاح');
        res.json(response.data);
    } catch (error) {
        serverMonitor.logRequest(false);
        serverMonitor.logError(error, 'api_request');
        systemLogger.log(`فشل معالجة الطلب: ${error.message}`, 'error');
        
        // تخزين المحادثة الفاشلة
        if (req.body.messages && req.body.messages.length > 0) {
            const userInput = req.body.messages[req.body.messages.length - 1].content;
            conversationManager.addConversation(userInput, 'Failed to process request', 'error');
        }
        
        res.status(500).json({ 
            error: 'Failed to connect to AI service',
            details: error.response ? error.response.data : error.message,
            serverHealth: serverMonitor.getHealthStatus()
        });
    }
});

// إضافة نقطة نهاية جديدة للمحادثات
app.get('/api/conversations', (req, res) => {
    res.json(conversationManager.getConversations());
});

// إضافة نقطة نهاية لفحص حالة الخادم
app.get('/api/health', (req, res) => {
    res.json(serverMonitor.getHealthStatus());
});

app.get('/api/errors', (req, res) => {
    res.json(serverMonitor.getErrors());
});

app.get('/api/logs', (req, res) => {
    res.json(systemLogger.getLogs());
});

// التحقق من كود المشرف
app.post('/api/verify-admin', (req, res) => {
    const { code } = req.body;
    const isValid = code === process.env.ADMIN_CODE;
    res.json({ isValid });
});

app.listen(port, () => {
    console.log(`الخادم يعمل على المنفذ ${port}`);
});
