/**
 * Alert System for Performance Monitoring
 * Provides threshold-based performance warnings with visual and audio notifications
 */

export class AlertSystem {
    constructor(options = {}) {
        this.options = {
            // Default alert thresholds
            thresholds: {
                frameRate: {
                    critical: { min: 15, max: Infinity, message: 'Critical frame rate drop detected' },
                    warning: { min: 30, max: Infinity, message: 'Frame rate below optimal level' },
                    info: { min: 45, max: Infinity, message: 'Frame rate could be improved' }
                },
                memory: {
                    critical: { min: 0, max: 90, message: 'Critical memory usage detected' },
                    warning: { min: 0, max: 75, message: 'High memory usage detected' },
                    info: { min: 0, max: 60, message: 'Memory usage elevated' }
                },
                cpu: {
                    critical: { min: 0, max: 90, message: 'Critical CPU usage detected' },
                    warning: { min: 0, max: 75, message: 'High CPU usage detected' },
                    info: { min: 0, max: 60, message: 'CPU usage elevated' }
                },
                agents: {
                    critical: { min: 0, max: 1000, message: 'Too many agents active' },
                    warning: { min: 0, max: 500, message: 'High agent count detected' },
                    info: { min: 0, max: 250, message: 'Agent count elevated' }
                }
            },
            
            // Alert configuration
            alertConfig: {
                cooldownPeriod: 30000, // 30 seconds between same alerts
                maxAlertsPerMinute: 10,
                enableVisualAlerts: true,
                enableAudioAlerts: true,
                enableConsoleAlerts: true,
                persistAlerts: true
            },
            
            // Audio settings
            audioConfig: {
                criticalSound: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
                warningSound: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
                infoSound: null // No sound for info alerts
            },
            
            ...options
        };
        
        // Alert state
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.alertCounts = new Map(); // Track alerts per minute
        this.callbacks = [];
        this.isEnabled = true;
        
        // UI elements
        this.alertContainer = null;
        this.alertQueue = [];
        this.maxVisibleAlerts = 5;
        
        // Audio context for sound alerts
        this.audioContext = null;
        this.audioBuffers = new Map();
        
        this.initialize();
    }

    /**
     * Initialize the alert system
     */
    initialize() {
        this.createAlertContainer();
        this.setupAudioContext();
        this.loadAudioBuffers();
        this.setupKeyboardShortcuts();
        
        // Clean up old alert counts every minute
        setInterval(() => {
            this.cleanupAlertCounts();
        }, 60000);
    }

    /**
     * Create the visual alert container
     */
    createAlertContainer() {
        if (!this.options.alertConfig.enableVisualAlerts) {
            return;
        }
        
        // Check if container already exists
        let container = document.getElementById('performance-alerts-container');
        if (container) {
            this.alertContainer = container;
            return;
        }
        
        // Create new container
        container = document.createElement('div');
        container.id = 'performance-alerts-container';
        container.className = 'performance-alerts-container';
        
        // Add styles
        this.addAlertStyles();
        
        // Append to body
        document.body.appendChild(container);
        this.alertContainer = container;
    }

    /**
     * Add CSS styles for alerts
     */
    addAlertStyles() {
        const styleId = 'performance-alert-styles';
        if (document.getElementById(styleId)) {
            return; // Styles already added
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .performance-alerts-container {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 10001;
                pointer-events: none;
                max-width: 400px;
            }
            
            .performance-alert {
                background: rgba(0, 0, 0, 0.9);
                border-left: 4px solid;
                border-radius: 4px;
                padding: 12px 16px;
                margin-bottom: 8px;
                color: white;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                animation: alertSlideIn 0.3s ease-out;
                pointer-events: auto;
                cursor: pointer;
                transition: opacity 0.3s ease;
            }
            
            .performance-alert:hover {
                opacity: 0.8;
            }
            
            .performance-alert.critical {
                border-left-color: #ff4444;
                background: rgba(255, 68, 68, 0.1);
            }
            
            .performance-alert.warning {
                border-left-color: #ffaa00;
                background: rgba(255, 170, 0, 0.1);
            }
            
            .performance-alert.info {
                border-left-color: #00aaff;
                background: rgba(0, 170, 255, 0.1);
            }
            
            .alert-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }
            
            .alert-severity {
                font-weight: bold;
                text-transform: uppercase;
                font-size: 10px;
            }
            
            .alert-time {
                font-size: 10px;
                opacity: 0.7;
            }
            
            .alert-message {
                margin-bottom: 4px;
            }
            
            .alert-details {
                font-size: 10px;
                opacity: 0.8;
            }
            
            .alert-close {
                position: absolute;
                top: 4px;
                right: 8px;
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            
            .alert-close:hover {
                opacity: 1;
            }
            
            @keyframes alertSlideIn {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes alertFadeOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-100%);
                    opacity: 0;
                }
            }
            
            .performance-alert.removing {
                animation: alertFadeOut 0.3s ease-in forwards;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Setup audio context for sound alerts
     */
    setupAudioContext() {
        if (!this.options.alertConfig.enableAudioAlerts) {
            return;
        }
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio alerts not supported:', error.message);
            this.options.alertConfig.enableAudioAlerts = false;
        }
    }

    /**
     * Load audio buffers for alert sounds
     */
    async loadAudioBuffers() {
        if (!this.audioContext || !this.options.alertConfig.enableAudioAlerts) {
            return;
        }
        
        const audioConfig = this.options.audioConfig;
        
        try {
            // Load critical sound
            if (audioConfig.criticalSound) {
                const criticalBuffer = await this.loadAudioBuffer(audioConfig.criticalSound);
                this.audioBuffers.set('critical', criticalBuffer);
            }
            
            // Load warning sound
            if (audioConfig.warningSound) {
                const warningBuffer = await this.loadAudioBuffer(audioConfig.warningSound);
                this.audioBuffers.set('warning', warningBuffer);
            }
            
            // Load info sound
            if (audioConfig.infoSound) {
                const infoBuffer = await this.loadAudioBuffer(audioConfig.infoSound);
                this.audioBuffers.set('info', infoBuffer);
            }
        } catch (error) {
            console.warn('Failed to load alert sounds:', error.message);
        }
    }

    /**
     * Load audio buffer from data URL
     */
    async loadAudioBuffer(dataUrl) {
        const response = await fetch(dataUrl);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    /**
     * Setup keyboard shortcuts for alert management
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+A to toggle alerts
            if (event.ctrlKey && event.shiftKey && event.key === 'A') {
                event.preventDefault();
                this.toggle();
            }
            
            // Escape to dismiss all alerts
            if (event.key === 'Escape') {
                this.dismissAllAlerts();
            }
        });
    }

    /**
     * Check metrics against thresholds and generate alerts
     */
    checkMetrics(metrics) {
        if (!this.isEnabled || !metrics) {
            return [];
        }
        
        const alerts = [];
        const timestamp = Date.now();
        
        // Check each metric type
        Object.keys(this.options.thresholds).forEach(metricType => {
            const metricValue = this.extractMetricValue(metrics, metricType);
            if (metricValue === null || metricValue === undefined) {
                return;
            }
            
            const thresholds = this.options.thresholds[metricType];
            const alert = this.evaluateThreshold(metricType, metricValue, thresholds, timestamp);
            
            if (alert) {
                alerts.push(alert);
            }
        });
        
        // Process alerts
        alerts.forEach(alert => {
            this.processAlert(alert);
        });
        
        return alerts;
    }

    /**
     * Extract metric value from metrics object
     */
    extractMetricValue(metrics, metricType) {
        switch (metricType) {
            case 'frameRate':
                return metrics.frameRate?.current;
            case 'memory':
                return metrics.memory?.used;
            case 'cpu':
                return metrics.cpu?.utilization;
            case 'agents':
                return metrics.agents?.count;
            default:
                return null;
        }
    }

    /**
     * Evaluate threshold for a metric
     */
    evaluateThreshold(metricType, value, thresholds, timestamp) {
        // Check thresholds in order of severity
        const severityLevels = ['critical', 'warning', 'info'];
        
        for (const severity of severityLevels) {
            const threshold = thresholds[severity];
            if (!threshold) continue;
            
            const isViolated = this.isThresholdViolated(value, threshold, metricType);
            
            if (isViolated) {
                const alertId = `${metricType}-${severity}`;
                
                // Check cooldown
                if (this.isInCooldown(alertId)) {
                    return null;
                }
                
                // Check rate limiting
                if (this.isRateLimited()) {
                    return null;
                }
                
                return {
                    id: alertId,
                    metricType,
                    severity,
                    value,
                    threshold,
                    message: threshold.message || `${metricType} ${severity} threshold exceeded`,
                    timestamp,
                    details: this.generateAlertDetails(metricType, value, threshold)
                };
            }
        }
        
        return null;
    }

    /**
     * Check if threshold is violated
     */
    isThresholdViolated(value, threshold, metricType) {
        if (metricType === 'frameRate') {
            // For frame rate, lower values are worse
            return value < threshold.min;
        } else {
            // For memory, CPU, agents, higher values are worse
            return value > threshold.max;
        }
    }

    /**
     * Check if alert is in cooldown period
     */
    isInCooldown(alertId) {
        const lastAlert = this.activeAlerts.get(alertId);
        if (!lastAlert) {
            return false;
        }
        
        const timeSinceLastAlert = Date.now() - lastAlert.timestamp;
        return timeSinceLastAlert < this.options.alertConfig.cooldownPeriod;
    }

    /**
     * Check if rate limited
     */
    isRateLimited() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Count alerts in the last minute
        let alertCount = 0;
        for (const [timestamp, count] of this.alertCounts.entries()) {
            if (timestamp > oneMinuteAgo) {
                alertCount += count;
            }
        }
        
        return alertCount >= this.options.alertConfig.maxAlertsPerMinute;
    }

    /**
     * Generate detailed alert information
     */
    generateAlertDetails(metricType, value, threshold) {
        const details = {
            currentValue: value,
            threshold: threshold,
            metricType: metricType
        };
        
        switch (metricType) {
            case 'frameRate':
                details.unit = 'FPS';
                details.recommendation = value < 15 ? 
                    'Consider reducing scene complexity or agent count' :
                    'Optimize rendering performance';
                break;
            case 'memory':
                details.unit = '%';
                details.recommendation = 'Check for memory leaks and optimize memory usage';
                break;
            case 'cpu':
                details.unit = '%';
                details.recommendation = 'Optimize update loops and reduce computational load';
                break;
            case 'agents':
                details.unit = 'count';
                details.recommendation = 'Consider reducing agent count or optimizing agent behaviors';
                break;
        }
        
        return details;
    }

    /**
     * Process and display an alert
     */
    processAlert(alert) {
        // Update active alerts
        this.activeAlerts.set(alert.id, alert);
        
        // Add to history
        if (this.options.alertConfig.persistAlerts) {
            this.alertHistory.push({ ...alert });
            
            // Limit history size
            if (this.alertHistory.length > 1000) {
                this.alertHistory.shift();
            }
        }
        
        // Update alert counts for rate limiting
        const minute = Math.floor(Date.now() / 60000) * 60000;
        this.alertCounts.set(minute, (this.alertCounts.get(minute) || 0) + 1);
        
        // Display alert
        this.displayAlert(alert);
        
        // Play sound
        this.playAlertSound(alert.severity);
        
        // Console log
        if (this.options.alertConfig.enableConsoleAlerts) {
            this.logAlert(alert);
        }
        
        // Notify callbacks
        this.notifyCallbacks(alert);
    }

    /**
     * Display visual alert
     */
    displayAlert(alert) {
        if (!this.options.alertConfig.enableVisualAlerts || !this.alertContainer) {
            return;
        }
        
        // Create alert element
        const alertElement = this.createAlertElement(alert);
        
        // Add to container
        this.alertContainer.appendChild(alertElement);
        
        // Manage visible alerts count
        this.manageVisibleAlerts();
        
        // Auto-dismiss after timeout
        const timeout = this.getAlertTimeout(alert.severity);
        if (timeout > 0) {
            setTimeout(() => {
                this.dismissAlert(alertElement);
            }, timeout);
        }
    }

    /**
     * Create alert DOM element
     */
    createAlertElement(alert) {
        const element = document.createElement('div');
        element.className = `performance-alert ${alert.severity}`;
        element.dataset.alertId = alert.id;
        
        const timeString = new Date(alert.timestamp).toLocaleTimeString();
        
        element.innerHTML = `
            <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
            <div class="alert-header">
                <span class="alert-severity">${alert.severity}</span>
                <span class="alert-time">${timeString}</span>
            </div>
            <div class="alert-message">${alert.message}</div>
            <div class="alert-details">
                ${alert.metricType}: ${alert.details.currentValue}${alert.details.unit}
                ${alert.details.recommendation ? `<br>💡 ${alert.details.recommendation}` : ''}
            </div>
        `;
        
        // Add click to dismiss
        element.addEventListener('click', () => {
            this.dismissAlert(element);
        });
        
        return element;
    }

    /**
     * Manage number of visible alerts
     */
    manageVisibleAlerts() {
        const alerts = this.alertContainer.querySelectorAll('.performance-alert');
        
        if (alerts.length > this.maxVisibleAlerts) {
            // Remove oldest alerts
            const alertsToRemove = alerts.length - this.maxVisibleAlerts;
            for (let i = 0; i < alertsToRemove; i++) {
                this.dismissAlert(alerts[i]);
            }
        }
    }

    /**
     * Get alert timeout based on severity
     */
    getAlertTimeout(severity) {
        switch (severity) {
            case 'critical':
                return 0; // Never auto-dismiss critical alerts
            case 'warning':
                return 10000; // 10 seconds
            case 'info':
                return 5000; // 5 seconds
            default:
                return 5000;
        }
    }

    /**
     * Dismiss an alert element
     */
    dismissAlert(element) {
        if (!element || !element.parentNode) {
            return;
        }
        
        element.classList.add('removing');
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300); // Match animation duration
    }

    /**
     * Dismiss all visible alerts
     */
    dismissAllAlerts() {
        if (!this.alertContainer) {
            return;
        }
        
        const alerts = this.alertContainer.querySelectorAll('.performance-alert');
        alerts.forEach(alert => {
            this.dismissAlert(alert);
        });
    }

    /**
     * Play alert sound
     */
    playAlertSound(severity) {
        if (!this.options.alertConfig.enableAudioAlerts || !this.audioContext) {
            return;
        }
        
        const buffer = this.audioBuffers.get(severity);
        if (!buffer) {
            return;
        }
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start();
        } catch (error) {
            console.warn('Failed to play alert sound:', error.message);
        }
    }

    /**
     * Log alert to console
     */
    logAlert(alert) {
        const prefix = `🚨 [${alert.severity.toUpperCase()}]`;
        const message = `${prefix} ${alert.message} (${alert.metricType}: ${alert.details.currentValue}${alert.details.unit})`;
        
        switch (alert.severity) {
            case 'critical':
                console.error(message);
                break;
            case 'warning':
                console.warn(message);
                break;
            case 'info':
                console.info(message);
                break;
            default:
                console.log(message);
        }
    }

    /**
     * Set alert thresholds
     */
    setThresholds(metricType, thresholds) {
        if (!this.options.thresholds[metricType]) {
            this.options.thresholds[metricType] = {};
        }
        
        Object.assign(this.options.thresholds[metricType], thresholds);
    }

    /**
     * Get current thresholds
     */
    getThresholds(metricType = null) {
        if (metricType) {
            return this.options.thresholds[metricType] || {};
        }
        return { ...this.options.thresholds };
    }

    /**
     * Register alert callback
     */
    onAlert(callback, options = {}) {
        const callbackId = `callback_${Date.now()}_${Math.random()}`;
        this.callbacks.push({
            id: callbackId,
            callback,
            options
        });
        return callbackId;
    }

    /**
     * Remove alert callback
     */
    removeCallback(callbackId) {
        const index = this.callbacks.findIndex(cb => cb.id === callbackId);
        if (index > -1) {
            this.callbacks.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Notify all callbacks
     */
    notifyCallbacks(alert) {
        this.callbacks.forEach(({ callback, options }) => {
            try {
                // Filter by severity if specified
                if (options.severity && options.severity !== alert.severity) {
                    return;
                }
                
                // Filter by metric type if specified
                if (options.metricType && options.metricType !== alert.metricType) {
                    return;
                }
                
                callback(alert);
            } catch (error) {
                console.error('Error in alert callback:', error);
            }
        });
    }

    /**
     * Get alert history
     */
    getAlertHistory(options = {}) {
        let history = [...this.alertHistory];
        
        // Filter by time range
        if (options.startTime) {
            history = history.filter(alert => alert.timestamp >= options.startTime);
        }
        
        if (options.endTime) {
            history = history.filter(alert => alert.timestamp <= options.endTime);
        }
        
        // Filter by severity
        if (options.severity) {
            history = history.filter(alert => alert.severity === options.severity);
        }
        
        // Filter by metric type
        if (options.metricType) {
            history = history.filter(alert => alert.metricType === options.metricType);
        }
        
        // Limit results
        if (options.limit) {
            history = history.slice(-options.limit);
        }
        
        return history;
    }

    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }

    /**
     * Clear alert history
     */
    clearHistory() {
        this.alertHistory = [];
        this.activeAlerts.clear();
    }

    /**
     * Enable/disable alert system
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        
        if (!this.isEnabled) {
            this.dismissAllAlerts();
        }
        
        console.log(`Alert system ${this.isEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable alert system
     */
    enable() {
        this.isEnabled = true;
    }

    /**
     * Disable alert system
     */
    disable() {
        this.isEnabled = false;
        this.dismissAllAlerts();
    }

    /**
     * Clean up old alert counts for rate limiting
     */
    cleanupAlertCounts() {
        const oneHourAgo = Date.now() - 3600000; // 1 hour
        
        for (const [timestamp] of this.alertCounts.entries()) {
            if (timestamp < oneHourAgo) {
                this.alertCounts.delete(timestamp);
            }
        }
    }

    /**
     * Get alert statistics
     */
    getStatistics() {
        const now = Date.now();
        const oneHour = 3600000;
        const oneDay = 86400000;
        
        const hourAgo = now - oneHour;
        const dayAgo = now - oneDay;
        
        const recentAlerts = this.alertHistory.filter(alert => alert.timestamp >= hourAgo);
        const dailyAlerts = this.alertHistory.filter(alert => alert.timestamp >= dayAgo);
        
        const stats = {
            total: this.alertHistory.length,
            lastHour: recentAlerts.length,
            lastDay: dailyAlerts.length,
            active: this.activeAlerts.size,
            bySeverity: {
                critical: 0,
                warning: 0,
                info: 0
            },
            byMetricType: {
                frameRate: 0,
                memory: 0,
                cpu: 0,
                agents: 0
            }
        };
        
        // Count by severity and metric type
        this.alertHistory.forEach(alert => {
            if (stats.bySeverity[alert.severity] !== undefined) {
                stats.bySeverity[alert.severity]++;
            }
            
            if (stats.byMetricType[alert.metricType] !== undefined) {
                stats.byMetricType[alert.metricType]++;
            }
        });
        
        return stats;
    }

    /**
     * Export alert data
     */
    exportAlerts(format = 'json') {
        const data = {
            alerts: this.alertHistory,
            statistics: this.getStatistics(),
            thresholds: this.options.thresholds,
            exportTime: new Date().toISOString()
        };
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.exportAlertsAsCSV(data.alerts);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export alerts as CSV
     */
    exportAlertsAsCSV(alerts) {
        const headers = ['Timestamp', 'Severity', 'Metric Type', 'Value', 'Message'];
        const rows = [headers.join(',')];
        
        alerts.forEach(alert => {
            const row = [
                new Date(alert.timestamp).toISOString(),
                alert.severity,
                alert.metricType,
                alert.details.currentValue + alert.details.unit,
                `"${alert.message}"`
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }

    /**
     * Dispose of the alert system
     */
    dispose() {
        // Clear intervals and timeouts
        this.dismissAllAlerts();
        
        // Remove DOM elements
        if (this.alertContainer && this.alertContainer.parentNode) {
            this.alertContainer.parentNode.removeChild(this.alertContainer);
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Clear data
        this.activeAlerts.clear();
        this.alertHistory = [];
        this.alertCounts.clear();
        this.callbacks = [];
        this.audioBuffers.clear();
    }
}