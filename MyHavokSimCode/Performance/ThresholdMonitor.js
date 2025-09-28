/**
 * Performance threshold monitoring and alerting system
 * Monitors performance metrics against configurable thresholds and generates alerts
 */

export class ThresholdMonitor {
    constructor(options = {}) {
        // Configuration
        this.isMonitoring = false;
        this.alertHistory = [];
        this.maxAlertHistory = options.maxAlertHistory || 1000;
        
        // Threshold definitions
        this.thresholds = {
            frameRate: {
                critical: { min: 15, max: Infinity },
                warning: { min: 30, max: Infinity },
                info: { min: 45, max: Infinity }
            },
            memory: {
                critical: { min: 0, max: 90 },
                warning: { min: 0, max: 75 },
                info: { min: 0, max: 60 }
            },
            cpu: {
                critical: { min: 0, max: 95 },
                warning: { min: 0, max: 80 },
                info: { min: 0, max: 65 }
            },
            agents: {
                critical: { min: 0, max: 1000 },
                warning: { min: 0, max: 500 },
                info: { min: 0, max: 200 }
            },
            ...options.thresholds
        };

        // Alert configuration
        this.alertConfig = {
            cooldownPeriod: 30000, // 30 seconds between similar alerts
            escalationTime: 300000, // 5 minutes before escalating
            maxAlertsPerMinute: 10,
            enabledSeverities: ['critical', 'warning', 'info'],
            ...options.alertConfig
        };

        // Alert callbacks
        this.alertCallbacks = new Map();
        
        // Alert state tracking
        this.activeAlerts = new Map();
        this.alertCooldowns = new Map();
        this.recentAlerts = [];
        
        // Statistics
        this.stats = {
            totalAlerts: 0,
            alertsBySeverity: { critical: 0, warning: 0, info: 0 },
            alertsByType: {},
            lastAlert: null,
            monitoringStartTime: null
        };
    }

    /**
     * Start threshold monitoring
     */
    start() {
        if (this.isMonitoring) {
            console.warn('Threshold monitoring is already active');
            return;
        }

        console.log('Starting threshold monitoring...');
        this.isMonitoring = true;
        this.stats.monitoringStartTime = Date.now();
        
        // Clear previous state
        this.activeAlerts.clear();
        this.alertCooldowns.clear();
        this.recentAlerts = [];
    }

    /**
     * Stop threshold monitoring
     */
    stop() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('Stopping threshold monitoring...');
        this.isMonitoring = false;
        
        // Clear active alerts
        this.activeAlerts.clear();
        this.alertCooldowns.clear();
    }

    /**
     * Check metrics against thresholds
     */
    checkMetrics(metrics) {
        if (!this.isMonitoring) {
            return [];
        }

        const alerts = [];
        const timestamp = metrics.timestamp || Date.now();

        // Check each metric type
        for (const [metricType, thresholds] of Object.entries(this.thresholds)) {
            const value = this.extractMetricValue(metrics, metricType);
            
            if (value !== null && value !== undefined) {
                const alert = this.checkThreshold(metricType, value, thresholds, timestamp);
                if (alert) {
                    alerts.push(alert);
                }
            }
        }

        // Process alerts
        alerts.forEach(alert => this.processAlert(alert));

        // Clean up old cooldowns and recent alerts
        this.cleanupAlertState(timestamp);

        return alerts;
    }

    /**
     * Check a single metric against its thresholds
     */
    checkThreshold(metricType, value, thresholds, timestamp) {
        // Determine severity level
        let severity = null;
        let thresholdInfo = null;

        // Check in order of severity (critical -> warning -> info)
        const severityLevels = ['critical', 'warning', 'info'];
        
        for (const level of severityLevels) {
            if (!this.alertConfig.enabledSeverities.includes(level)) {
                continue;
            }

            const threshold = thresholds[level];
            if (!threshold) {
                continue;
            }

            const { min, max } = threshold;
            
            if (value < min || value > max) {
                severity = level;
                thresholdInfo = threshold;
                break;
            }
        }

        if (!severity) {
            // Value is within all thresholds - check if we need to clear an active alert
            this.clearActiveAlert(metricType);
            return null;
        }

        // Check cooldown
        const alertKey = `${metricType}_${severity}`;
        if (this.isInCooldown(alertKey, timestamp)) {
            return null;
        }

        // Check rate limiting
        if (this.isRateLimited(timestamp)) {
            return null;
        }

        // Create alert
        const alert = {
            id: this.generateAlertId(),
            timestamp,
            metricType,
            severity,
            value,
            threshold: thresholdInfo,
            message: this.generateAlertMessage(metricType, severity, value, thresholdInfo),
            isNew: !this.activeAlerts.has(metricType) || 
                   this.activeAlerts.get(metricType).severity !== severity
        };

        return alert;
    }

    /**
     * Process an alert (store, escalate, notify)
     */
    processAlert(alert) {
        // Add to history
        this.alertHistory.push(alert);
        
        // Maintain history size
        if (this.alertHistory.length > this.maxAlertHistory) {
            this.alertHistory.shift();
        }

        // Update statistics
        this.updateAlertStatistics(alert);

        // Set cooldown
        const alertKey = `${alert.metricType}_${alert.severity}`;
        this.alertCooldowns.set(alertKey, alert.timestamp + this.alertConfig.cooldownPeriod);

        // Track active alert
        this.activeAlerts.set(alert.metricType, alert);

        // Add to recent alerts for rate limiting
        this.recentAlerts.push(alert.timestamp);

        // Check for escalation
        this.checkEscalation(alert);

        // Notify callbacks
        this.notifyCallbacks(alert);

        console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
    }

    /**
     * Clear an active alert
     */
    clearActiveAlert(metricType) {
        if (this.activeAlerts.has(metricType)) {
            const clearedAlert = this.activeAlerts.get(metricType);
            this.activeAlerts.delete(metricType);
            
            // Create resolution alert
            const resolutionAlert = {
                id: this.generateAlertId(),
                timestamp: Date.now(),
                metricType,
                severity: 'info',
                type: 'resolution',
                message: `${metricType} threshold violation resolved`,
                resolvedAlert: clearedAlert
            };

            this.notifyCallbacks(resolutionAlert);
            console.log(`✅ RESOLVED: ${resolutionAlert.message}`);
        }
    }

    /**
     * Check if alert should be escalated
     */
    checkEscalation(alert) {
        const existingAlert = this.activeAlerts.get(alert.metricType);
        
        if (existingAlert && 
            existingAlert.severity === alert.severity &&
            alert.timestamp - existingAlert.timestamp > this.alertConfig.escalationTime) {
            
            // Escalate alert
            const escalatedAlert = {
                ...alert,
                id: this.generateAlertId(),
                type: 'escalation',
                originalAlert: existingAlert,
                message: `ESCALATED: ${alert.message} (ongoing for ${Math.round((alert.timestamp - existingAlert.timestamp) / 1000)}s)`
            };

            this.notifyCallbacks(escalatedAlert);
            console.log(`🔥 ESCALATED: ${escalatedAlert.message}`);
        }
    }

    /**
     * Extract metric value from metrics object
     */
    extractMetricValue(metrics, metricType) {
        switch (metricType) {
            case 'frameRate':
                return metrics.frameRate?.current;
            case 'memory':
                return metrics.memory?.usagePercentage;
            case 'cpu':
                return metrics.cpu?.utilization;
            case 'agents':
                return metrics.scene?.meshCount;
            default:
                // Support nested paths
                return this.getNestedValue(metrics, metricType);
        }
    }

    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Generate alert message
     */
    generateAlertMessage(metricType, severity, value, threshold) {
        const { min, max } = threshold;
        let condition = '';
        
        if (value < min) {
            condition = `below minimum threshold (${value} < ${min})`;
        } else if (value > max) {
            condition = `above maximum threshold (${value} > ${max})`;
        }

        return `${metricType} ${condition}`;
    }

    /**
     * Check if alert is in cooldown period
     */
    isInCooldown(alertKey, timestamp) {
        const cooldownEnd = this.alertCooldowns.get(alertKey);
        return cooldownEnd && timestamp < cooldownEnd;
    }

    /**
     * Check if rate limited
     */
    isRateLimited(timestamp) {
        // Clean old alerts from recent list
        const oneMinuteAgo = timestamp - 60000;
        this.recentAlerts = this.recentAlerts.filter(time => time > oneMinuteAgo);
        
        return this.recentAlerts.length >= this.alertConfig.maxAlertsPerMinute;
    }

    /**
     * Clean up old alert state
     */
    cleanupAlertState(timestamp) {
        // Clean cooldowns
        for (const [key, cooldownEnd] of this.alertCooldowns) {
            if (timestamp >= cooldownEnd) {
                this.alertCooldowns.delete(key);
            }
        }

        // Clean recent alerts (older than 1 minute)
        const oneMinuteAgo = timestamp - 60000;
        this.recentAlerts = this.recentAlerts.filter(time => time > oneMinuteAgo);
    }

    /**
     * Update alert statistics
     */
    updateAlertStatistics(alert) {
        this.stats.totalAlerts++;
        this.stats.alertsBySeverity[alert.severity]++;
        
        if (!this.stats.alertsByType[alert.metricType]) {
            this.stats.alertsByType[alert.metricType] = 0;
        }
        this.stats.alertsByType[alert.metricType]++;
        
        this.stats.lastAlert = alert;
    }

    /**
     * Register alert callback
     */
    onAlert(callback, options = {}) {
        const {
            severities = ['critical', 'warning', 'info'],
            metricTypes = null
        } = options;

        const callbackId = this.generateCallbackId();
        
        this.alertCallbacks.set(callbackId, {
            callback,
            severities,
            metricTypes
        });

        return callbackId;
    }

    /**
     * Remove alert callback
     */
    removeAlertCallback(callbackId) {
        return this.alertCallbacks.delete(callbackId);
    }

    /**
     * Notify all registered callbacks
     */
    notifyCallbacks(alert) {
        for (const [id, config] of this.alertCallbacks) {
            const { callback, severities, metricTypes } = config;
            
            // Check severity filter
            if (!severities.includes(alert.severity)) {
                continue;
            }
            
            // Check metric type filter
            if (metricTypes && !metricTypes.includes(alert.metricType)) {
                continue;
            }
            
            try {
                callback(alert);
            } catch (error) {
                console.error(`Error in alert callback ${id}:`, error);
            }
        }
    }

    /**
     * Set thresholds for a metric type
     */
    setThresholds(metricType, thresholds) {
        this.thresholds[metricType] = { ...this.thresholds[metricType], ...thresholds };
    }

    /**
     * Get current thresholds
     */
    getThresholds(metricType = null) {
        if (metricType) {
            return this.thresholds[metricType] || null;
        }
        return { ...this.thresholds };
    }

    /**
     * Get alert history
     */
    getAlertHistory(options = {}) {
        const {
            startTime = null,
            endTime = null,
            severity = null,
            metricType = null,
            limit = null
        } = options;

        let alerts = [...this.alertHistory];

        // Apply filters
        if (startTime) {
            alerts = alerts.filter(alert => alert.timestamp >= startTime);
        }
        
        if (endTime) {
            alerts = alerts.filter(alert => alert.timestamp <= endTime);
        }
        
        if (severity) {
            alerts = alerts.filter(alert => alert.severity === severity);
        }
        
        if (metricType) {
            alerts = alerts.filter(alert => alert.metricType === metricType);
        }

        // Apply limit
        if (limit && limit > 0) {
            alerts = alerts.slice(-limit);
        }

        return alerts;
    }

    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }

    /**
     * Get alert statistics
     */
    getStatistics() {
        const uptime = this.stats.monitoringStartTime ? 
            Date.now() - this.stats.monitoringStartTime : 0;

        return {
            ...this.stats,
            uptime,
            alertRate: uptime > 0 ? (this.stats.totalAlerts / (uptime / 60000)) : 0, // alerts per minute
            activeAlertCount: this.activeAlerts.size,
            cooldownCount: this.alertCooldowns.size
        };
    }

    /**
     * Generate alert report
     */
    generateReport(timeRange = 3600000) { // Default 1 hour
        const endTime = Date.now();
        const startTime = endTime - timeRange;
        
        const alerts = this.getAlertHistory({ startTime, endTime });
        const activeAlerts = this.getActiveAlerts();
        
        // Group alerts by type and severity
        const alertsByType = {};
        const alertsBySeverity = { critical: 0, warning: 0, info: 0 };
        
        alerts.forEach(alert => {
            if (!alertsByType[alert.metricType]) {
                alertsByType[alert.metricType] = { critical: 0, warning: 0, info: 0 };
            }
            alertsByType[alert.metricType][alert.severity]++;
            alertsBySeverity[alert.severity]++;
        });

        return {
            timeRange: { start: startTime, end: endTime, duration: timeRange },
            summary: {
                totalAlerts: alerts.length,
                activeAlerts: activeAlerts.length,
                alertsByType,
                alertsBySeverity
            },
            activeAlerts,
            recentAlerts: alerts.slice(-10), // Last 10 alerts
            recommendations: this.generateRecommendations(alerts, activeAlerts)
        };
    }

    /**
     * Generate recommendations based on alert patterns
     */
    generateRecommendations(alerts, activeAlerts) {
        const recommendations = [];
        
        // Check for frequent alerts
        const alertCounts = {};
        alerts.forEach(alert => {
            alertCounts[alert.metricType] = (alertCounts[alert.metricType] || 0) + 1;
        });
        
        for (const [metricType, count] of Object.entries(alertCounts)) {
            if (count > 10) {
                recommendations.push(`High alert frequency for ${metricType} (${count} alerts). Consider adjusting thresholds or investigating root cause.`);
            }
        }
        
        // Check for persistent active alerts
        activeAlerts.forEach(alert => {
            const duration = Date.now() - alert.timestamp;
            if (duration > 600000) { // 10 minutes
                recommendations.push(`Persistent ${alert.severity} alert for ${alert.metricType} (active for ${Math.round(duration / 60000)} minutes).`);
            }
        });
        
        // Check for critical alerts
        const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
        if (criticalAlerts.length > 0) {
            recommendations.push(`${criticalAlerts.length} critical alerts detected. Immediate attention required.`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('No significant alert patterns detected. System performance appears stable.');
        }
        
        return recommendations;
    }

    /**
     * Generate unique alert ID
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique callback ID
     */
    generateCallbackId() {
        return `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all alert history
     */
    clearHistory() {
        this.alertHistory = [];
        this.stats = {
            totalAlerts: 0,
            alertsBySeverity: { critical: 0, warning: 0, info: 0 },
            alertsByType: {},
            lastAlert: null,
            monitoringStartTime: this.stats.monitoringStartTime
        };
    }

    /**
     * Dispose of the threshold monitor
     */
    dispose() {
        this.stop();
        this.alertCallbacks.clear();
        this.clearHistory();
        this.activeAlerts.clear();
        this.alertCooldowns.clear();
    }
}