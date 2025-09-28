/**
 * Data aggregation utilities for performance analysis
 * Provides functions for analyzing and summarizing performance data
 */

export class DataAggregationUtils {
    /**
     * Aggregate performance data by time windows
     */
    static aggregateByTimeWindow(data, windowSizeMs, aggregationFunctions = {}) {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        // Default aggregation functions
        const defaultFunctions = {
            frameRate: ['mean', 'min', 'max', 'p95'],
            memory: ['mean', 'min', 'max'],
            cpu: ['mean', 'max'],
            agents: ['mean', 'max']
        };

        const functions = { ...defaultFunctions, ...aggregationFunctions };
        
        // Group data by time windows
        const windows = new Map();
        
        data.forEach(item => {
            const windowStart = Math.floor(item.timestamp / windowSizeMs) * windowSizeMs;
            
            if (!windows.has(windowStart)) {
                windows.set(windowStart, {
                    timestamp: windowStart,
                    windowEnd: windowStart + windowSizeMs,
                    count: 0,
                    data: []
                });
            }
            
            windows.get(windowStart).data.push(item);
            windows.get(windowStart).count++;
        });

        // Aggregate each window
        const results = [];
        for (const [timestamp, window] of windows) {
            const aggregated = {
                timestamp,
                windowEnd: window.windowEnd,
                count: window.count,
                duration: windowSizeMs
            };

            // Aggregate each metric type
            for (const [metricType, aggFunctions] of Object.entries(functions)) {
                aggregated[metricType] = this.aggregateMetric(window.data, metricType, aggFunctions);
            }

            results.push(aggregated);
        }

        return results.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Aggregate a specific metric across data points
     */
    static aggregateMetric(data, metricPath, aggregationFunctions) {
        const values = this.extractMetricValues(data, metricPath);
        
        if (values.length === 0) {
            return this.createEmptyAggregation(aggregationFunctions);
        }

        const result = {};
        
        aggregationFunctions.forEach(func => {
            switch (func) {
                case 'mean':
                case 'average':
                    result.mean = this.calculateMean(values);
                    break;
                case 'median':
                    result.median = this.calculateMedian(values);
                    break;
                case 'min':
                    result.min = Math.min(...values);
                    break;
                case 'max':
                    result.max = Math.max(...values);
                    break;
                case 'sum':
                    result.sum = values.reduce((a, b) => a + b, 0);
                    break;
                case 'count':
                    result.count = values.length;
                    break;
                case 'std':
                case 'standardDeviation':
                    result.standardDeviation = this.calculateStandardDeviation(values);
                    break;
                case 'variance':
                    result.variance = this.calculateVariance(values);
                    break;
                case 'p25':
                    result.p25 = this.calculatePercentile(values, 25);
                    break;
                case 'p50':
                    result.p50 = this.calculatePercentile(values, 50);
                    break;
                case 'p75':
                    result.p75 = this.calculatePercentile(values, 75);
                    break;
                case 'p90':
                    result.p90 = this.calculatePercentile(values, 90);
                    break;
                case 'p95':
                    result.p95 = this.calculatePercentile(values, 95);
                    break;
                case 'p99':
                    result.p99 = this.calculatePercentile(values, 99);
                    break;
                case 'range':
                    result.range = Math.max(...values) - Math.min(...values);
                    break;
                case 'first':
                    result.first = values[0];
                    break;
                case 'last':
                    result.last = values[values.length - 1];
                    break;
            }
        });

        return result;
    }

    /**
     * Extract metric values from data using a path
     */
    static extractMetricValues(data, metricPath) {
        const values = [];
        
        data.forEach(item => {
            const value = this.getNestedValue(item, metricPath);
            if (typeof value === 'number' && !isNaN(value)) {
                values.push(value);
            }
        });
        
        return values;
    }

    /**
     * Get nested value from object using dot notation
     */
    static getNestedValue(obj, path) {
        if (typeof path === 'string') {
            // Handle common metric paths
            switch (path) {
                case 'frameRate':
                    return obj.frameRate?.current;
                case 'memory':
                    return obj.memory?.usagePercentage;
                case 'cpu':
                    return obj.cpu?.utilization;
                case 'agents':
                    return obj.scene?.meshCount;
                default:
                    return path.split('.').reduce((current, key) => current?.[key], obj);
            }
        }
        
        return obj[path];
    }

    /**
     * Create empty aggregation result
     */
    static createEmptyAggregation(functions) {
        const result = {};
        functions.forEach(func => {
            result[func] = null;
        });
        return result;
    }

    /**
     * Calculate rolling averages
     */
    static calculateRollingAverage(data, metricPath, windowSize) {
        const values = this.extractMetricValues(data, metricPath);
        const rollingAverages = [];
        
        for (let i = 0; i < values.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = values.slice(start, i + 1);
            const average = this.calculateMean(window);
            
            rollingAverages.push({
                index: i,
                timestamp: data[i]?.timestamp,
                value: values[i],
                rollingAverage: average,
                windowSize: window.length
            });
        }
        
        return rollingAverages;
    }

    /**
     * Detect anomalies in performance data
     */
    static detectAnomalies(data, metricPath, options = {}) {
        const {
            method = 'zscore',
            threshold = 2.5,
            windowSize = 50
        } = options;

        const values = this.extractMetricValues(data, metricPath);
        const anomalies = [];

        switch (method) {
            case 'zscore':
                anomalies.push(...this.detectZScoreAnomalies(data, values, threshold));
                break;
            case 'iqr':
                anomalies.push(...this.detectIQRAnomalies(data, values));
                break;
            case 'rolling':
                anomalies.push(...this.detectRollingAnomalies(data, values, windowSize, threshold));
                break;
        }

        return anomalies;
    }

    /**
     * Detect anomalies using Z-score method
     */
    static detectZScoreAnomalies(data, values, threshold) {
        const mean = this.calculateMean(values);
        const stdDev = this.calculateStandardDeviation(values);
        const anomalies = [];

        values.forEach((value, index) => {
            const zScore = Math.abs((value - mean) / stdDev);
            if (zScore > threshold) {
                anomalies.push({
                    index,
                    timestamp: data[index]?.timestamp,
                    value,
                    zScore,
                    severity: zScore > threshold * 1.5 ? 'high' : 'medium',
                    method: 'zscore'
                });
            }
        });

        return anomalies;
    }

    /**
     * Detect anomalies using Interquartile Range (IQR) method
     */
    static detectIQRAnomalies(data, values) {
        const q1 = this.calculatePercentile(values, 25);
        const q3 = this.calculatePercentile(values, 75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        const anomalies = [];

        values.forEach((value, index) => {
            if (value < lowerBound || value > upperBound) {
                const distance = Math.min(Math.abs(value - lowerBound), Math.abs(value - upperBound));
                anomalies.push({
                    index,
                    timestamp: data[index]?.timestamp,
                    value,
                    distance,
                    bounds: { lower: lowerBound, upper: upperBound },
                    severity: distance > iqr ? 'high' : 'medium',
                    method: 'iqr'
                });
            }
        });

        return anomalies;
    }

    /**
     * Detect anomalies using rolling window method
     */
    static detectRollingAnomalies(data, values, windowSize, threshold) {
        const anomalies = [];

        for (let i = windowSize; i < values.length; i++) {
            const window = values.slice(i - windowSize, i);
            const windowMean = this.calculateMean(window);
            const windowStdDev = this.calculateStandardDeviation(window);
            
            const currentValue = values[i];
            const zScore = Math.abs((currentValue - windowMean) / windowStdDev);
            
            if (zScore > threshold) {
                anomalies.push({
                    index: i,
                    timestamp: data[i]?.timestamp,
                    value: currentValue,
                    windowMean,
                    zScore,
                    severity: zScore > threshold * 1.5 ? 'high' : 'medium',
                    method: 'rolling'
                });
            }
        }

        return anomalies;
    }

    /**
     * Calculate correlation between two metrics
     */
    static calculateCorrelation(data, metricPath1, metricPath2) {
        const values1 = this.extractMetricValues(data, metricPath1);
        const values2 = this.extractMetricValues(data, metricPath2);
        
        const minLength = Math.min(values1.length, values2.length);
        if (minLength < 2) {
            return null;
        }

        const x = values1.slice(0, minLength);
        const y = values2.slice(0, minLength);
        
        const meanX = this.calculateMean(x);
        const meanY = this.calculateMean(y);
        
        let numerator = 0;
        let sumXSquared = 0;
        let sumYSquared = 0;
        
        for (let i = 0; i < minLength; i++) {
            const deltaX = x[i] - meanX;
            const deltaY = y[i] - meanY;
            
            numerator += deltaX * deltaY;
            sumXSquared += deltaX * deltaX;
            sumYSquared += deltaY * deltaY;
        }
        
        const denominator = Math.sqrt(sumXSquared * sumYSquared);
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Generate performance summary report
     */
    static generateSummaryReport(data, timeRange = null) {
        if (!Array.isArray(data) || data.length === 0) {
            return {
                error: 'No data available',
                timeRange,
                metrics: {}
            };
        }

        const report = {
            timeRange: timeRange || {
                start: data[0].timestamp,
                end: data[data.length - 1].timestamp,
                duration: data[data.length - 1].timestamp - data[0].timestamp
            },
            dataPoints: data.length,
            metrics: {}
        };

        // Analyze each metric type
        const metricTypes = ['frameRate', 'memory', 'cpu', 'agents'];
        
        metricTypes.forEach(metricType => {
            const values = this.extractMetricValues(data, metricType);
            
            if (values.length > 0) {
                report.metrics[metricType] = {
                    statistics: this.aggregateMetric(data, metricType, ['mean', 'min', 'max', 'p95', 'std']),
                    trend: this.calculateTrend(values),
                    stability: this.assessStability(values),
                    anomalies: this.detectAnomalies(data, metricType, { threshold: 2 }).length
                };
            }
        });

        // Calculate correlations
        report.correlations = {};
        for (let i = 0; i < metricTypes.length; i++) {
            for (let j = i + 1; j < metricTypes.length; j++) {
                const metric1 = metricTypes[i];
                const metric2 = metricTypes[j];
                const correlation = this.calculateCorrelation(data, metric1, metric2);
                
                if (correlation !== null) {
                    report.correlations[`${metric1}_${metric2}`] = {
                        value: Math.round(correlation * 1000) / 1000,
                        strength: this.interpretCorrelation(correlation)
                    };
                }
            }
        }

        return report;
    }

    /**
     * Calculate trend direction
     */
    static calculateTrend(values) {
        if (values.length < 5) {
            return 'insufficient_data';
        }

        const midpoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midpoint);
        const secondHalf = values.slice(midpoint);
        
        const firstMean = this.calculateMean(firstHalf);
        const secondMean = this.calculateMean(secondHalf);
        
        const difference = secondMean - firstMean;
        const threshold = Math.abs(firstMean) * 0.05; // 5% threshold
        
        if (Math.abs(difference) < threshold) {
            return 'stable';
        } else if (difference > 0) {
            return 'increasing';
        } else {
            return 'decreasing';
        }
    }

    /**
     * Assess data stability
     */
    static assessStability(values) {
        if (values.length < 3) {
            return 'unknown';
        }

        const mean = this.calculateMean(values);
        const stdDev = this.calculateStandardDeviation(values);
        const coefficientOfVariation = stdDev / Math.abs(mean);

        if (coefficientOfVariation < 0.1) {
            return 'very_stable';
        } else if (coefficientOfVariation < 0.2) {
            return 'stable';
        } else if (coefficientOfVariation < 0.5) {
            return 'moderate';
        } else {
            return 'unstable';
        }
    }

    /**
     * Interpret correlation strength
     */
    static interpretCorrelation(correlation) {
        const abs = Math.abs(correlation);
        
        if (abs >= 0.8) {
            return 'very_strong';
        } else if (abs >= 0.6) {
            return 'strong';
        } else if (abs >= 0.4) {
            return 'moderate';
        } else if (abs >= 0.2) {
            return 'weak';
        } else {
            return 'very_weak';
        }
    }

    // Statistical calculation methods
    static calculateMean(values) {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    static calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? 
            (sorted[mid - 1] + sorted[mid]) / 2 : 
            sorted[mid];
    }

    static calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = this.calculateMean(values);
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    static calculateStandardDeviation(values) {
        return Math.sqrt(this.calculateVariance(values));
    }

    static calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        
        if (Number.isInteger(index)) {
            return sorted[index];
        } else {
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index - lower;
            return sorted[lower] * (1 - weight) + sorted[upper] * weight;
        }
    }
}