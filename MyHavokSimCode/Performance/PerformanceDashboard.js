/**
 * Real-time performance dashboard UI component
 * Provides visual monitoring interface for performance metrics
 */

export class PerformanceDashboard {
    constructor(containerId, performanceMonitor) {
        this.containerId = containerId;
        this.performanceMonitor = performanceMonitor;
        this.container = null;
        this.widgets = new Map();
        this.charts = new Map();
        this.isVisible = false;
        this.updateInterval = null;
        this.updateFrequency = 30; // Updates per second

        // Chart data storage
        this.chartData = {
            frameRate: [],
            memory: [],
            cpu: [],
            agents: []
        };
        this.maxDataPoints = 100; // Keep last 100 data points for charts

        // Widget configurations
        this.widgetConfigs = {
            frameRate: {
                title: 'Frame Rate',
                unit: 'FPS',
                format: value => Math.round(value),
                thresholds: { critical: 15, warning: 30, good: 45 }
            },
            memory: {
                title: 'Memory Usage',
                unit: '%',
                format: value => Math.round(value),
                thresholds: { critical: 90, warning: 75, good: 60 }
            },
            cpu: {
                title: 'CPU Usage',
                unit: '%',
                format: value => Math.round(value),
                thresholds: { critical: 90, warning: 75, good: 60 }
            },
            agents: {
                title: 'Agent Count',
                unit: '',
                format: value => Math.round(value),
                thresholds: { critical: 1000, warning: 500, good: 100 }
            }
        };

        this.initialize();
    }

    /**
     * Initialize the dashboard
     */
    initialize() {
        this.createDashboardStructure();
        this.createWidgets();
        this.createCharts();
        this.setupEventListeners();

        // Register for performance updates
        if (this.performanceMonitor) {
            this.performanceMonitor.onMetricsUpdate(metrics => {
                this.updateMetrics(metrics);
            });
        }
    }

    /**
     * Create the main dashboard HTML structure
     */
    createDashboardStructure() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Dashboard container '${this.containerId}' not found`);
            return;
        }

        this.container = container;
        this.container.innerHTML = `
            <div class="performance-dashboard" style="display: none;">
                <div class="dashboard-header">
                    <h3>Performance Monitor</h3>
                    <div class="dashboard-controls">
                        <button id="dashboard-toggle" class="btn-toggle">Hide</button>
                        <button id="dashboard-reset" class="btn-reset">Reset</button>
                    </div>
                </div>
                <div class="dashboard-content">
                    <div class="metrics-widgets">
                        <div id="widget-frameRate" class="metric-widget"></div>
                        <div id="widget-memory" class="metric-widget"></div>
                        <div id="widget-cpu" class="metric-widget"></div>
                        <div id="widget-agents" class="metric-widget"></div>
                    </div>
                    <div class="charts-container">
                        <div class="chart-row">
                            <div id="chart-frameRate" class="chart-container">
                                <h4>Frame Rate Over Time</h4>
                                <canvas class="performance-chart"></canvas>
                            </div>
                            <div id="chart-memory" class="chart-container">
                                <h4>Memory Usage Over Time</h4>
                                <canvas class="performance-chart"></canvas>
                            </div>
                        </div>
                        <div class="chart-row">
                            <div id="chart-cpu" class="chart-container">
                                <h4>CPU Usage Over Time</h4>
                                <canvas class="performance-chart"></canvas>
                            </div>
                            <div id="chart-agents" class="chart-container">
                                <h4>Agent Performance</h4>
                                <canvas class="performance-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addDashboardStyles();
    }

    /**
     * Add CSS styles for the dashboard
     */
    addDashboardStyles() {
        const styleId = 'performance-dashboard-styles';
        if (document.getElementById(styleId)) {
            return; // Styles already added
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .performance-dashboard {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 800px;
                max-height: 90vh;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #333;
                border-radius: 8px;
                color: white;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10000;
                overflow-y: auto;
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                border-bottom: 1px solid #333;
                background: rgba(0, 0, 0, 0.8);
            }
            
            .dashboard-header h3 {
                margin: 0;
                color: #00ff00;
            }
            
            .dashboard-controls button {
                margin-left: 5px;
                padding: 4px 8px;
                background: #333;
                color: white;
                border: 1px solid #555;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
            }
            
            .dashboard-controls button:hover {
                background: #555;
            }
            
            .dashboard-content {
                padding: 15px;
            }
            
            .metrics-widgets {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .metric-widget {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #333;
                border-radius: 5px;
                padding: 10px;
                text-align: center;
            }
            
            .widget-title {
                font-size: 10px;
                color: #ccc;
                margin-bottom: 5px;
            }
            
            .widget-value {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 3px;
            }
            
            .widget-unit {
                font-size: 10px;
                color: #999;
            }
            
            .widget-status-good { color: #00ff00; }
            .widget-status-warning { color: #ffaa00; }
            .widget-status-critical { color: #ff0000; }
            
            .charts-container {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .chart-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            
            .chart-container {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid #333;
                border-radius: 5px;
                padding: 10px;
            }
            
            .chart-container h4 {
                margin: 0 0 10px 0;
                font-size: 11px;
                color: #ccc;
                text-align: center;
            }
            
            .performance-chart {
                width: 100%;
                height: 120px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 3px;
            }
            
            @media (max-width: 1024px) {
                .performance-dashboard {
                    width: 95vw;
                    right: 2.5vw;
                }
                
                .metrics-widgets {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .chart-row {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Create metric widgets
     */
    createWidgets() {
        Object.keys(this.widgetConfigs).forEach(metricType => {
            const config = this.widgetConfigs[metricType];
            const widget = new MetricWidget(metricType, config);
            this.widgets.set(metricType, widget);

            const container = document.getElementById(`widget-${metricType}`);
            if (container) {
                container.appendChild(widget.getElement());
            }
        });
    }

    /**
     * Create performance charts
     */
    createCharts() {
        Object.keys(this.widgetConfigs).forEach(metricType => {
            const canvas = document.querySelector(`#chart-${metricType} .performance-chart`);
            if (canvas) {
                const chart = new PerformanceChart(canvas, metricType, this.widgetConfigs[metricType]);
                this.charts.set(metricType, chart);
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const toggleBtn = document.getElementById('dashboard-toggle');
        const resetBtn = document.getElementById('dashboard-reset');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggle();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', event => {
            if (event.ctrlKey && event.key === 'p') {
                event.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * Show the dashboard
     */
    show() {
        if (this.container) {
            const dashboard = this.container.querySelector('.performance-dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                this.isVisible = true;
                this.startUpdating();

                const toggleBtn = document.getElementById('dashboard-toggle');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Hide';
                }
            }
        }
    }

    /**
     * Hide the dashboard
     */
    hide() {
        if (this.container) {
            const dashboard = this.container.querySelector('.performance-dashboard');
            if (dashboard) {
                dashboard.style.display = 'none';
                this.isVisible = false;
                this.stopUpdating();

                const toggleBtn = document.getElementById('dashboard-toggle');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Show';
                }
            }
        }
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Reset dashboard data
     */
    reset() {
        // Clear chart data
        Object.keys(this.chartData).forEach(key => {
            this.chartData[key] = [];
        });

        // Reset charts
        this.charts.forEach(chart => {
            chart.reset();
        });

        // Reset widgets
        this.widgets.forEach(widget => {
            widget.reset();
        });
    }

    /**
     * Start periodic updates
     */
    startUpdating() {
        if (this.updateInterval) {
            return; // Already updating
        }

        const intervalMs = 1000 / this.updateFrequency;
        this.updateInterval = setInterval(() => {
            if (this.performanceMonitor && this.isVisible) {
                const metrics = this.performanceMonitor.getCurrentMetrics();
                if (metrics) {
                    this.updateMetrics(metrics);
                }
            }
        }, intervalMs);
    }

    /**
     * Stop periodic updates
     */
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update dashboard with new metrics
     */
    updateMetrics(metrics) {
        if (!this.isVisible || !metrics) {
            return;
        }

        // Extract values for each metric type
        const values = {
            frameRate: metrics.frameRate?.current || 0,
            memory: metrics.memory?.used || 0,
            cpu: metrics.cpu?.utilization || 0,
            agents: metrics.agents?.count || 0
        };

        // Update widgets
        Object.keys(values).forEach(metricType => {
            const widget = this.widgets.get(metricType);
            if (widget) {
                widget.updateValue(values[metricType]);
            }
        });

        // Update chart data
        const timestamp = metrics.timestamp || performance.now();
        Object.keys(values).forEach(metricType => {
            const data = this.chartData[metricType];
            data.push({ timestamp, value: values[metricType] });

            // Maintain max data points
            if (data.length > this.maxDataPoints) {
                data.shift();
            }
        });

        // Update charts
        Object.keys(values).forEach(metricType => {
            const chart = this.charts.get(metricType);
            if (chart) {
                chart.updateData(this.chartData[metricType]);
            }
        });
    }

    /**
     * Set update frequency
     */
    setUpdateFrequency(frequency) {
        this.updateFrequency = Math.max(1, Math.min(60, frequency));

        if (this.updateInterval) {
            this.stopUpdating();
            this.startUpdating();
        }
    }

    /**
     * Get dashboard visibility state
     */
    isVisible() {
        return this.isVisible;
    }

    /**
     * Dispose of the dashboard
     */
    dispose() {
        this.stopUpdating();

        // Remove event listeners
        const toggleBtn = document.getElementById('dashboard-toggle');
        const resetBtn = document.getElementById('dashboard-reset');

        if (toggleBtn) {
            toggleBtn.removeEventListener('click', this.toggle);
        }

        if (resetBtn) {
            resetBtn.removeEventListener('click', this.reset);
        }

        // Dispose widgets and charts
        this.widgets.forEach(widget => widget.dispose());
        this.charts.forEach(chart => chart.dispose());

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }

        this.widgets.clear();
        this.charts.clear();
    }
}

/**
 * Individual metric widget component
 */
class MetricWidget {
    constructor(metricType, config) {
        this.metricType = metricType;
        this.config = config;
        this.currentValue = 0;
        this.element = null;

        this.createElement();
    }

    /**
     * Create the widget DOM element
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'metric-widget-content';
        this.element.innerHTML = `
            <div class="widget-title">${this.config.title}</div>
            <div class="widget-value">0</div>
            <div class="widget-unit">${this.config.unit}</div>
        `;
    }

    /**
     * Update widget value
     */
    updateValue(value) {
        this.currentValue = value;

        const valueElement = this.element.querySelector('.widget-value');
        if (valueElement) {
            valueElement.textContent = this.config.format(value);

            // Update status color based on thresholds
            const status = this.getStatus(value);
            valueElement.className = `widget-value widget-status-${status}`;
        }
    }

    /**
     * Get status based on thresholds
     */
    getStatus(value) {
        const { thresholds } = this.config;

        if (this.metricType === 'frameRate') {
            // For frame rate, higher is better
            if (value < thresholds.critical) return 'critical';
            if (value < thresholds.warning) return 'warning';
            return 'good';
        } else {
            // For memory, CPU, agents, lower is better
            if (value > thresholds.critical) return 'critical';
            if (value > thresholds.warning) return 'warning';
            return 'good';
        }
    }

    /**
     * Reset widget
     */
    reset() {
        this.updateValue(0);
    }

    /**
     * Get widget element
     */
    getElement() {
        return this.element;
    }

    /**
     * Dispose widget
     */
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}

/**
 * Performance chart component using Canvas
 */
class PerformanceChart {
    constructor(canvas, metricType, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.metricType = metricType;
        this.config = config;
        this.data = [];

        this.setupCanvas();
    }

    /**
     * Setup canvas properties
     */
    setupCanvas() {
        // Set canvas size
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;

        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Set canvas style size
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    /**
     * Update chart data
     */
    updateData(data) {
        this.data = [...data];
        this.render();
    }

    /**
     * Render the chart
     */
    render() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        if (this.data.length < 2) {
            this.renderNoData(width, height);
            return;
        }

        // Calculate data bounds
        const values = this.data.map(d => d.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue || 1;

        // Draw grid
        this.drawGrid(width, height, minValue, maxValue);

        // Draw line
        this.drawLine(width, height, minValue, valueRange);

        // Draw threshold lines
        this.drawThresholds(width, height, minValue, valueRange);
    }

    /**
     * Render no data message
     */
    renderNoData(width, height) {
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('No data available', width / 2, height / 2);
    }

    /**
     * Draw grid lines
     */
    drawGrid(width, height, minValue, maxValue) {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();

            // Value labels
            const value = maxValue - (maxValue - minValue) * (i / 4);
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px Courier New';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(this.config.format(value), 2, y - 2);
        }

        // Vertical grid lines
        for (let i = 0; i <= 4; i++) {
            const x = (width / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
    }

    /**
     * Draw the performance line
     */
    drawLine(width, height, minValue, valueRange) {
        if (this.data.length < 2) return;

        this.ctx.strokeStyle = this.getLineColor();
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        this.data.forEach((point, index) => {
            const x = (index / (this.data.length - 1)) * width;
            const y = height - ((point.value - minValue) / valueRange) * height;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    /**
     * Draw threshold lines
     */
    drawThresholds(width, height, minValue, valueRange) {
        const { thresholds } = this.config;

        Object.keys(thresholds).forEach(level => {
            const value = thresholds[level];
            const y = height - ((value - minValue) / valueRange) * height;

            if (y >= 0 && y <= height) {
                this.ctx.strokeStyle = this.getThresholdColor(level);
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([5, 5]);

                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(width, y);
                this.ctx.stroke();

                this.ctx.setLineDash([]);
            }
        });
    }

    /**
     * Get line color based on current performance
     */
    getLineColor() {
        if (this.data.length === 0) return '#00ff00';

        const lastValue = this.data[this.data.length - 1].value;
        const { thresholds } = this.config;

        if (this.metricType === 'frameRate') {
            if (lastValue < thresholds.critical) return '#ff0000';
            if (lastValue < thresholds.warning) return '#ffaa00';
            return '#00ff00';
        } else {
            if (lastValue > thresholds.critical) return '#ff0000';
            if (lastValue > thresholds.warning) return '#ffaa00';
            return '#00ff00';
        }
    }

    /**
     * Get threshold line color
     */
    getThresholdColor(level) {
        switch (level) {
            case 'critical': return '#ff0000';
            case 'warning': return '#ffaa00';
            case 'good': return '#00ff00';
            default: return '#666';
        }
    }

    /**
     * Reset chart
     */
    reset() {
        this.data = [];
        this.render();
    }

    /**
     * Dispose chart
     */
    dispose() {
        this.data = [];
        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
