/**
 * HardwareCapabilities - Data models and interfaces for hardware capability management
 *
 * This module provides:
 * - HardwareCapabilities data structure definitions
 * - Capability scoring and tier assignment
 * - Capability caching for faster subsequent startups
 */

/**
 * Hardware capabilities data structure
 */
class HardwareCapabilities {
    constructor() {
        this.webgl = new WebGLCapabilities();
        this.memory = new MemoryCapabilities();
        this.performance = new PerformanceCapabilities();
        this.timestamp = Date.now();
        this.version = '1.0.0';
    }

    /**
     * Create from raw detection data
     * @param {Object} rawData Raw detection data
     * @returns {HardwareCapabilities} Capabilities instance
     */
    static fromDetectionData(rawData) {
        const capabilities = new HardwareCapabilities();

        if (rawData.webgl) {
            capabilities.webgl = WebGLCapabilities.fromRawData(rawData.webgl);
        }

        if (rawData.memory) {
            capabilities.memory = MemoryCapabilities.fromRawData(rawData.memory);
        }

        if (rawData.performance) {
            capabilities.performance = PerformanceCapabilities.fromRawData(rawData.performance);
        }

        capabilities.timestamp = rawData.timestamp || Date.now();

        return capabilities;
    }

    /**
     * Convert to JSON for serialization
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            webgl: this.webgl.toJSON(),
            memory: this.memory.toJSON(),
            performance: this.performance.toJSON(),
            timestamp: this.timestamp,
            version: this.version
        };
    }

    /**
     * Create from JSON data
     * @param {Object} jsonData JSON data
     * @returns {HardwareCapabilities} Capabilities instance
     */
    static fromJSON(jsonData) {
        const capabilities = new HardwareCapabilities();

        if (jsonData.webgl) {
            capabilities.webgl = WebGLCapabilities.fromJSON(jsonData.webgl);
        }

        if (jsonData.memory) {
            capabilities.memory = MemoryCapabilities.fromJSON(jsonData.memory);
        }

        if (jsonData.performance) {
            capabilities.performance = PerformanceCapabilities.fromJSON(jsonData.performance);
        }

        capabilities.timestamp = jsonData.timestamp || Date.now();
        capabilities.version = jsonData.version || '1.0.0';

        return capabilities;
    }

    /**
     * Check if capabilities are still valid (not too old)
     * @param {number} maxAge Maximum age in milliseconds (default: 24 hours)
     * @returns {boolean} True if still valid
     */
    isValid(maxAge = 24 * 60 * 60 * 1000) {
        return (Date.now() - this.timestamp) < maxAge;
    }
}

/**
 * WebGL capabilities data structure
 */
class WebGLCapabilities {
    constructor() {
        this.supported = false;
        this.version = 'none';
        this.vendor = 'unknown';
        this.renderer = 'unknown';
        this.extensions = [];
        this.limits = new WebGLLimits();
    }

    static fromRawData(rawData) {
        const capabilities = new WebGLCapabilities();
        Object.assign(capabilities, rawData);

        if (rawData.limits) {
            capabilities.limits = WebGLLimits.fromRawData(rawData.limits);
        }

        return capabilities;
    }

    static fromJSON(jsonData) {
        const capabilities = new WebGLCapabilities();
        Object.assign(capabilities, jsonData);

        if (jsonData.limits) {
            capabilities.limits = WebGLLimits.fromJSON(jsonData.limits);
        }

        return capabilities;
    }

    toJSON() {
        return {
            supported: this.supported,
            version: this.version,
            vendor: this.vendor,
            renderer: this.renderer,
            extensions: [...this.extensions],
            limits: this.limits.toJSON()
        };
    }

    /**
     * Calculate WebGL capability score (0-100)
     * @returns {number} Capability score
     */
    getCapabilityScore() {
        if (!this.supported) return 0;

        let score = 0;

        // Base score for WebGL support
        score += this.version === 'webgl2' ? 30 : 15;

        // Extension support
        const importantExtensions = [
            'OES_texture_float',
            'OES_texture_half_float',
            'WEBGL_depth_texture',
            'ANGLE_instanced_arrays',
            'OES_vertex_array_object',
            'EXT_texture_filter_anisotropic'
        ];

        const supportedImportant = importantExtensions.filter(ext =>
            this.extensions.includes(ext)
        ).length;
        score += (supportedImportant / importantExtensions.length) * 20;

        // Limits score
        score += this.limits.getCapabilityScore() * 0.5;

        return Math.min(100, Math.max(0, score));
    }
}

/**
 * WebGL limits data structure
 */
class WebGLLimits {
    constructor() {
        this.maxTextureSize = 0;
        this.maxCubeMapTextureSize = 0;
        this.maxRenderbufferSize = 0;
        this.maxViewportDims = [0, 0];
        this.maxVertexAttribs = 0;
        this.maxVertexUniformVectors = 0;
        this.maxFragmentUniformVectors = 0;
        this.maxVaryingVectors = 0;
        this.maxTextureImageUnits = 0;
        this.maxVertexTextureImageUnits = 0;
        this.maxCombinedTextureImageUnits = 0;

        // WebGL2 specific
        this.maxDrawBuffers = 0;
        this.maxColorAttachments = 0;
        this.maxSamples = 0;
        this.max3DTextureSize = 0;
        this.maxArrayTextureLayers = 0;

        // Extension capabilities
        this.hasFloatTextures = false;
        this.hasHalfFloatTextures = false;
        this.hasDepthTextures = false;
        this.hasInstancedArrays = false;
        this.hasVertexArrayObjects = false;
    }

    static fromRawData(rawData) {
        const limits = new WebGLLimits();
        Object.assign(limits, rawData);
        return limits;
    }

    static fromJSON(jsonData) {
        const limits = new WebGLLimits();
        Object.assign(limits, jsonData);
        return limits;
    }

    toJSON() {
        return { ...this };
    }

    /**
     * Calculate limits capability score (0-100)
     * @returns {number} Capability score
     */
    getCapabilityScore() {
        let score = 0;

        // Texture size scoring
        if (this.maxTextureSize >= 16384) score += 20;
        else if (this.maxTextureSize >= 8192) score += 15;
        else if (this.maxTextureSize >= 4096) score += 10;
        else if (this.maxTextureSize >= 2048) score += 5;

        // Texture units scoring
        if (this.maxTextureImageUnits >= 32) score += 15;
        else if (this.maxTextureImageUnits >= 16) score += 10;
        else if (this.maxTextureImageUnits >= 8) score += 5;

        // Vertex attributes scoring
        if (this.maxVertexAttribs >= 16) score += 10;
        else if (this.maxVertexAttribs >= 8) score += 5;

        // Extension capabilities
        if (this.hasFloatTextures) score += 10;
        if (this.hasInstancedArrays) score += 15;
        if (this.hasVertexArrayObjects) score += 5;
        if (this.hasDepthTextures) score += 5;

        // WebGL2 features
        if (this.maxDrawBuffers > 1) score += 10;
        if (this.max3DTextureSize > 0) score += 10;

        return Math.min(100, Math.max(0, score));
    }
}

/**
 * Memory capabilities data structure
 */
class MemoryCapabilities {
    constructor() {
        this.deviceMemory = null;
        this.jsHeapSizeLimit = null;
        this.usedJSHeapSize = null;
        this.totalJSHeapSize = null;
        this.estimatedGPUMemory = null;
        this.estimatedAvailableMemory = null;
    }

    static fromRawData(rawData) {
        const capabilities = new MemoryCapabilities();
        Object.assign(capabilities, rawData);
        return capabilities;
    }

    static fromJSON(jsonData) {
        const capabilities = new MemoryCapabilities();
        Object.assign(capabilities, jsonData);
        return capabilities;
    }

    toJSON() {
        return { ...this };
    }

    /**
     * Calculate memory capability score (0-100)
     * @returns {number} Capability score
     */
    getCapabilityScore() {
        let score = 0;

        // Device memory scoring
        if (this.deviceMemory) {
            const memoryGB = this.deviceMemory / (1024 * 1024 * 1024);
            if (memoryGB >= 16) score += 30;
            else if (memoryGB >= 8) score += 25;
            else if (memoryGB >= 4) score += 20;
            else if (memoryGB >= 2) score += 10;
            else score += 5;
        }

        // GPU memory scoring
        if (this.estimatedGPUMemory) {
            const gpuMemoryGB = this.estimatedGPUMemory / (1024 * 1024 * 1024);
            if (gpuMemoryGB >= 8) score += 25;
            else if (gpuMemoryGB >= 4) score += 20;
            else if (gpuMemoryGB >= 2) score += 15;
            else if (gpuMemoryGB >= 1) score += 10;
            else score += 5;
        }

        // Available memory scoring
        if (this.estimatedAvailableMemory) {
            const availableGB = this.estimatedAvailableMemory / (1024 * 1024 * 1024);
            if (availableGB >= 2) score += 20;
            else if (availableGB >= 1) score += 15;
            else if (availableGB >= 0.5) score += 10;
            else score += 5;
        }

        // JS heap scoring
        if (this.jsHeapSizeLimit) {
            const heapGB = this.jsHeapSizeLimit / (1024 * 1024 * 1024);
            if (heapGB >= 4) score += 15;
            else if (heapGB >= 2) score += 10;
            else if (heapGB >= 1) score += 5;
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Get memory tier classification
     * @returns {string} Memory tier: 'low', 'medium', 'high'
     */
    getMemoryTier() {
        const score = this.getCapabilityScore();
        if (score >= 70) return 'high';
        else if (score >= 40) return 'medium';
        else return 'low';
    }
}

/**
 * Performance capabilities data structure
 */
class PerformanceCapabilities {
    constructor() {
        this.estimatedFPS = 30;
        this.recommendedQuality = 'medium';
        this.canHandleComplexShaders = false;
        this.canHandleHighPolyCount = false;
        this.canHandleInstancing = false;
        this.canHandlePostProcessing = false;
        this.canHandleParticles = false;
    }

    static fromRawData(rawData) {
        const capabilities = new PerformanceCapabilities();
        Object.assign(capabilities, rawData);
        return capabilities;
    }

    static fromJSON(jsonData) {
        const capabilities = new PerformanceCapabilities();
        Object.assign(capabilities, jsonData);
        return capabilities;
    }

    toJSON() {
        return { ...this };
    }

    /**
     * Calculate performance capability score (0-100)
     * @returns {number} Capability score
     */
    getCapabilityScore() {
        let score = 0;

        // FPS scoring
        if (this.estimatedFPS >= 60) score += 30;
        else if (this.estimatedFPS >= 45) score += 25;
        else if (this.estimatedFPS >= 30) score += 20;
        else if (this.estimatedFPS >= 20) score += 10;
        else score += 5;

        // Feature support scoring
        if (this.canHandleComplexShaders) score += 15;
        if (this.canHandleHighPolyCount) score += 15;
        if (this.canHandleInstancing) score += 15;
        if (this.canHandlePostProcessing) score += 10;
        if (this.canHandleParticles) score += 10;

        // Quality level scoring
        const qualityScores = {
            'low': 5,
            'medium': 15,
            'high': 25,
            'ultra': 35
        };
        score += qualityScores[this.recommendedQuality] || 10;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Get performance tier classification
     * @returns {string} Performance tier: 'low', 'medium', 'high'
     */
    getPerformanceTier() {
        const score = this.getCapabilityScore();
        if (score >= 70) return 'high';
        else if (score >= 40) return 'medium';
        else return 'low';
    }
}

/**
 * Capability scoring and tier assignment utility
 */
class CapabilityScorer {
    /**
     * Calculate overall capability score
     * @param {HardwareCapabilities} capabilities Hardware capabilities
     * @returns {number} Overall score (0-100)
     */
    static calculateOverallScore(capabilities) {
        const webglScore = capabilities.webgl.getCapabilityScore();
        const memoryScore = capabilities.memory.getCapabilityScore();
        const performanceScore = capabilities.performance.getCapabilityScore();

        // Weighted average: WebGL 40%, Memory 30%, Performance 30%
        return Math.round(
            (webglScore * 0.4)
            + (memoryScore * 0.3)
            + (performanceScore * 0.3)
        );
    }

    /**
     * Assign performance tier based on overall capabilities
     * @param {HardwareCapabilities} capabilities Hardware capabilities
     * @returns {string} Performance tier: 'low', 'medium', 'high'
     */
    static assignPerformanceTier(capabilities) {
        const overallScore = this.calculateOverallScore(capabilities);

        if (overallScore >= 70) return 'high';
        else if (overallScore >= 40) return 'medium';
        else return 'low';
    }

    /**
     * Get detailed capability breakdown
     * @param {HardwareCapabilities} capabilities Hardware capabilities
     * @returns {Object} Detailed breakdown
     */
    static getCapabilityBreakdown(capabilities) {
        return {
            overall: this.calculateOverallScore(capabilities),
            tier: this.assignPerformanceTier(capabilities),
            breakdown: {
                webgl: {
                    score: capabilities.webgl.getCapabilityScore(),
                    supported: capabilities.webgl.supported,
                    version: capabilities.webgl.version
                },
                memory: {
                    score: capabilities.memory.getCapabilityScore(),
                    tier: capabilities.memory.getMemoryTier(),
                    availableGB: capabilities.memory.estimatedAvailableMemory
                        ? (capabilities.memory.estimatedAvailableMemory / (1024 * 1024 * 1024)).toFixed(1) : 'unknown'
                },
                performance: {
                    score: capabilities.performance.getCapabilityScore(),
                    tier: capabilities.performance.getPerformanceTier(),
                    estimatedFPS: capabilities.performance.estimatedFPS,
                    recommendedQuality: capabilities.performance.recommendedQuality
                }
            }
        };
    }
}

/**
 * Capability caching utility for faster subsequent startups
 */
class CapabilityCache {
    constructor() {
        this.cacheKey = 'hardware_capabilities_cache';
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Save capabilities to cache
     * @param {HardwareCapabilities} capabilities Capabilities to cache
     */
    saveToCache(capabilities) {
        try {
            const cacheData = {
                capabilities: capabilities.toJSON(),
                timestamp: Date.now()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to save capabilities to cache:', error);
        }
    }

    /**
     * Load capabilities from cache
     * @returns {HardwareCapabilities|null} Cached capabilities or null
     */
    loadFromCache() {
        try {
            const cacheData = localStorage.getItem(this.cacheKey);
            if (!cacheData) return null;

            const parsed = JSON.parse(cacheData);
            const capabilities = HardwareCapabilities.fromJSON(parsed.capabilities);

            // Check if cache is still valid
            if (capabilities.isValid(this.maxAge)) {
                return capabilities;
            } else {
                this.clearCache();
                return null;
            }
        } catch (error) {
            console.warn('Failed to load capabilities from cache:', error);
            this.clearCache();
            return null;
        }
    }

    /**
     * Clear the capabilities cache
     */
    clearCache() {
        try {
            localStorage.removeItem(this.cacheKey);
        } catch (error) {
            console.warn('Failed to clear capabilities cache:', error);
        }
    }

    /**
     * Check if cache exists and is valid
     * @returns {boolean} True if valid cache exists
     */
    hasValidCache() {
        const cached = this.loadFromCache();
        return cached !== null;
    }

    /**
     * Set cache maximum age
     * @param {number} maxAge Maximum age in milliseconds
     */
    setMaxAge(maxAge) {
        this.maxAge = maxAge;
    }
}

export {
    HardwareCapabilities,
    WebGLCapabilities,
    WebGLLimits,
    MemoryCapabilities,
    PerformanceCapabilities,
    CapabilityScorer,
    CapabilityCache
};
