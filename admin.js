class AdminDashboard {
    constructor() {
        this.adminCode = 'admin123'; // يمكنك تغيير كود المشرف هنا
        this.isLoggedIn = false;
        this.initializeElements();
        this.setupEventListeners();
        this.startSystemMonitoring();
    }

    initializeElements() {
        // أقسام الصفحة
        this.loginSection = document.getElementById('login-section');
        this.dashboardSection = document.getElementById('dashboard-section');
        
        // نموذج تسجيل الدخول
        this.loginForm = document.getElementById('admin-login-form');
        this.adminCodeInput = document.getElementById('admin-code');
        
        // عناصر لوحة التحكم
        this.logoutBtn = document.getElementById('logout-btn');
        this.systemStatus = document.getElementById('system-status');
        this.requestCount = document.getElementById('request-count');
        this.errorCount = document.getElementById('error-count');
        this.successRate = document.getElementById('success-rate');
        this.errorLogBody = document.getElementById('error-log-body');
        this.logEntries = document.getElementById('log-entries');
        this.conversationsLog = document.getElementById('conversationsLog');
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    async verifyAdminCode(code) {
        try {
            const response = await fetch('/api/verify-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });
            const data = await response.json();
            return data.isValid;
        } catch (error) {
            console.error('Error verifying admin code:', error);
            return false;
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        const code = this.adminCodeInput.value;
        
        const isValid = await this.verifyAdminCode(code);
        
        if (isValid) {
            this.isLoggedIn = true;
            this.loginSection.classList.add('hidden');
            this.dashboardSection.classList.remove('hidden');
            this.adminCodeInput.value = '';
            this.startDataRefresh();
        } else {
            alert('كود المشرف غير صحيح');
        }
    }

    handleLogout() {
        this.isLoggedIn = false;
        this.dashboardSection.classList.add('hidden');
        this.loginSection.classList.remove('hidden');
        this.stopDataRefresh();
    }

    startSystemMonitoring() {
        // تحديث البيانات كل 5 ثواني
        this.monitoringInterval = setInterval(() => {
            if (this.isLoggedIn) {
                this.updateSystemStatus();
                this.updateErrorLog();
                this.updateSystemLog();
                this.updateConversations();
            }
        }, 5000);
    }

    async updateSystemStatus() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            this.updateStatusIndicator(data.isHealthy);
            this.updateStats(data);
        } catch (error) {
            console.error('خطأ في تحديث حالة النظام:', error);
        }
    }

    updateStatusIndicator(isHealthy) {
        const statusLight = this.systemStatus.querySelector('.status-light');
        const statusText = this.systemStatus.querySelector('.status-text');
        
        statusLight.className = 'status-light';
        statusLight.classList.add(isHealthy ? 'status-healthy' : 'status-error');
        statusText.textContent = isHealthy ? 'النظام يعمل بشكل جيد' : 'يوجد مشاكل في النظام';
    }

    updateStats(data) {
        this.requestCount.textContent = data.totalRequests || 0;
        this.errorCount.textContent = data.recentErrorCount || 0;
        this.successRate.textContent = `${data.successRate || 0}%`;
    }

    async updateErrorLog() {
        try {
            const response = await fetch('/api/errors');
            const errors = await response.json();
            
            this.errorLogBody.innerHTML = errors.map(error => `
                <tr>
                    <td>${new Date(error.timestamp).toLocaleString('ar-SA')}</td>
                    <td>${error.type}</td>
                    <td>${error.message}</td>
                    <td>${error.status}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('خطأ في تحديث سجل الأخطاء:', error);
        }
    }

    async updateSystemLog() {
        try {
            const response = await fetch('/api/logs');
            const logs = await response.json();
            
            this.logEntries.innerHTML = logs.map(log => `
                <div class="log-entry ${log.type}-entry">
                    <span class="log-time">${new Date(log.timestamp).toLocaleString('ar-SA')}</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('خطأ في تحديث سجل النظام:', error);
        }
    }

    async updateConversations() {
        try {
            const response = await fetch('/api/conversations');
            const conversations = await response.json();
            
            this.conversationsLog.innerHTML = '';
            
            conversations.forEach(conv => {
                const convElement = document.createElement('div');
                convElement.className = `conversation-item ${conv.status}`;
                
                const timestamp = new Date(conv.timestamp).toLocaleString();
                
                convElement.innerHTML = `
                    <div class="conversation-time">${timestamp}</div>
                    <div class="conversation-user">User: ${conv.userInput}</div>
                    <div class="conversation-ai">AI: ${conv.aiResponse}</div>
                `;
                
                this.conversationsLog.appendChild(convElement);
            });
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    }

    startDataRefresh() {
        this.updateSystemStatus();
        this.updateErrorLog();
        this.updateSystemLog();
        this.updateConversations();
    }

    stopDataRefresh() {
        clearInterval(this.monitoringInterval);
    }
}

// تهيئة لوحة التحكم
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new AdminDashboard();
});
