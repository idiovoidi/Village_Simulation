/**
 * HardwareDetector - Detects GPU and system capabilities for performance optimization
 *
 * This class provides comprehensive hardware detection including:
 * - WebGL capability detection (version, extensions, limits)
 * - Memory detection and estimation
 * - Performance tier classification (low/medium/high)
 */
class HardwareDetector {
    constructor() {
        this.capabilities = null;
        this.performanceTier = null;
        this.webglContext = null;
        this.detectionComplete = false;
    }

    /**
     * Detect all hardware capabilities
     * @returns {Promise<Object>} Hardware capabilities object
     */
    async detectCapabilities() {
        if (this.detectionComplete && this.capabilities) {
            return this.capabilities;
        }

        try {
            const webglCapabilities = this.detectWebGLCapabilities();
            const memoryInfo = this.detectMemoryCapabilities();
            const performanceInfo = this.estimatePerformanceCapabilities();

            this.capabilities = {
                webgl: webglCapabilities,
                memory: memoryInfo,
                performance: performanceInfo,
                timestamp: Date.now()
            };

            this.performanceTier = this.classifyPerformanceTier(this.capabilities);
            this.detectionComplete = true;

            return this.capabilities;
        } catch (error) {
            console.error('Hardware detection failed:', error);
            return this.getFallbackCapabilities();
        }
    }

    /**
     * Detect WebGL capabilities including version, extensions, and limits
     * @returns {Object} WebGL capabilities
     */
    detectWebGLCapabilities() {
        const canvas = document.createElement('canvas');
        let gl = null;
        let webglVersion = 'none';

        // Try WebGL2 first
        try {
            gl = canvas.getContext('webgl2');
            if (gl) {
                webglVersion = 'webgl2';
                this.webglContext = gl;
            }
        } catch (e) {
            // WebGL2 not supported
        }

        // Fall back to WebGL1
        if (!gl) {
            try {
                gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    webglVersion = 'webgl1';
                    this.webglContext = gl;
                }
            } catch (e) {
                // WebGL not supported
            }
        }

        if (!gl) {
            return {
                supported: false,
                version: 'none',
                vendor: 'unknown',
                renderer: 'unknown',
                extensions: [],
                limits: {}
            };
        }

        // Get basic info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

        // Get extensions
        const extensions = gl.getSupportedExtensions() || [];

        // Get limits
        const limits = this.getWebGLLimits(gl);

        return {
            supported: true,
            version: webglVersion,
            vendor,
            renderer,
            extensions,
            limits
        };
    }

    /**
     * Get WebGL limits and capabilities
     * @param {WebGLRenderingContext} gl WebGL context
     * @returns {Object} WebGL limits
     */
    getWebGLLimits(gl) {
        const limits = {};

        try {
            // Basic limits
            limits.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            limits.maxCubeMapTextureSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
            limits.maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
            limits.maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
            limits.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
            limits.maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
            limits.maxFragmentUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
            limits.maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);
            limits.maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            limits.maxVertexTextureImageUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
            limits.maxCombinedTextureImageUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);

            // Additional WebGL2 limits
            if (gl instanceof WebGL2RenderingContext) {
                limits.maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS);
                limits.maxColorAttachments = gl.getParameter(gl.MAX_COLOR_ATTACHMENTS);
                limits.maxSamples = gl.getParameter(gl.MAX_SAMPLES);
                limits.max3DTextureSize = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
                limits.maxArrayTextureLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
            }

            // Check for important extensions
            limits.hasFloatTextures = gl.getExtension('OES_texture_float') !== null;
            limits.hasHalfFloatTextures = gl.getExtension('OES_texture_half_float') !== null;
            limits.hasDepthTextures = gl.getExtension('WEBGL_depth_texture') !== null;
            limits.hasInstancedArrays = gl.getExtension('ANGLE_instanced_arrays') !== null;
            limits.hasVertexArrayObjects = gl.getExtension('OES_vertex_array_object') !== null;
        } catch (error) {
            console.warn('Error getting WebGL limits:', error);
        }

        return limits;
    }

    /**
     * Detect memory capabilities and estimate available memory
     * @returns {Object} Memory information
     */
    detectMemoryCapabilities() {
        const memoryInfo = {
            deviceMemory: null,
            jsHeapSizeLimit: null,
            estimatedGPUMemory: null,
            estimatedAvailableMemory: null
        };

        try {
            // Device memory (if supported)
            if ('deviceMemory' in navigator) {
                memoryInfo.deviceMemory = navigator.deviceMemory * 1024 * 1024 * 1024; // Convert GB to bytes
            }

            // JavaScript heap size
            if (performance.memory) {
                memoryInfo.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
                memoryInfo.usedJSHeapSize = performance.memory.usedJSHeapSize;
                memoryInfo.totalJSHeapSize = performance.memory.totalJSHeapSize;
            }

            // Estimate GPU memory based on WebGL capabilities
            if (this.webglContext) {
                memoryInfo.estimatedGPUMemory = this.estimateGPUMemory();
            }

            // Estimate available memory for our application
            memoryInfo.estimatedAvailableMemory = this.estimateAvailableMemory(memoryInfo);
        } catch (error) {
            console.warn('Error detecting memory capabilities:', error);
        }

        return memoryInfo;
    }

    /**
     * Estimate GPU memory based on WebGL capabilities
     * @returns {number} Estimated GPU memory in bytes
     */
    estimateGPUMemory() {
        if (!this.webglContext) return null;

        const gl = this.webglContext;

        try {
            // Try to get memory info extension
            const memoryInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (memoryInfo) {
                const renderer = gl.getParameter(memoryInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

                // Rough estimates based on common GPU patterns
                if (renderer.includes('nvidia') || renderer.includes('geforce')) {
                    if (renderer.includes('rtx') || renderer.includes('gtx 1')) {
                        return 8 * 1024 * 1024 * 1024; // 8GB for modern cards
                    } else if (renderer.includes('gtx')) {
                        return 4 * 1024 * 1024 * 1024; // 4GB for older cards
                    }
                } else if (renderer.includes('amd') || renderer.includes('radeon')) {
                    if (renderer.includes('rx')) {
                        return 8 * 1024 * 1024 * 1024; // 8GB for modern AMD
                    } else {
                        return 4 * 1024 * 1024 * 1024; // 4GB for older AMD
                    }
                } else if (renderer.includes('intel')) {
                    return 1 * 1024 * 1024 * 1024; // 1GB for integrated graphics
                }
            }

            // Fallback estimation based on max texture size
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            if (maxTextureSize >= 16384) {
                return 4 * 1024 * 1024 * 1024; // 4GB
            } else if (maxTextureSize >= 8192) {
                return 2 * 1024 * 1024 * 1024; // 2GB
            } else {
                return 1 * 1024 * 1024 * 1024; // 1GB
            }
        } catch (error) {
            console.warn('Error estimating GPU memory:', error);
            return 2 * 1024 * 1024 * 1024; // Default 2GB
        }
    }

    /**
     * Estimate available memory for the application
     * @param {Object} memoryInfo Memory information object
     * @returns {number} Estimated available memory in bytes
     */
    estimateAvailableMemory(memoryInfo) {
        let availableMemory = 512 * 1024 * 1024; // Default 512MB

        if (memoryInfo.deviceMemory) {
            // Use 25% of device memory as a conservative estimate
            availableMemory = Math.max(availableMemory, memoryInfo.deviceMemory * 0.25);
        } else if (memoryInfo.jsHeapSizeLimit) {
            // Use 50% of JS heap limit
            availableMemory = Math.max(availableMemory, memoryInfo.jsHeapSizeLimit * 0.5);
        }

        return Math.floor(availableMemory);
    }

    /**
     * Estimate performance capabilities based on hardware
     * @returns {Object} Performance information
     */
    estimatePerformanceCapabilities() {
        const performance = {
            estimatedFPS: 30,
            recommendedQuality: 'medium',
            canHandleComplexShaders: false,
            canHandleHighPolyCount: false,
            canHandleInstancing: false
        };

        if (!this.webglContext) {
            performance.estimatedFPS = 15;
            performance.recommendedQuality = 'low';
            return performance;
        }

        const gl = this.webglContext;
        const limits = this.capabilities?.webgl?.limits || {};

        // Estimate based on WebGL capabilities
        let score = 0;

        // WebGL2 support
        if (gl instanceof WebGL2RenderingContext) {
            score += 20;
            performance.canHandleComplexShaders = true;
        }

        // Texture capabilities
        if (limits.maxTextureSize >= 4096) score += 10;
        if (limits.maxTextureSize >= 8192) score += 10;
        if (limits.maxTextureImageUnits >= 16) score += 10;

        // Extension support
        if (limits.hasFloatTextures) score += 5;
        if (limits.hasInstancedArrays) {
            score += 10;
            performance.canHandleInstancing = true;
        }
        if (limits.hasVertexArrayObjects) score += 5;

        // GPU vendor detection
        const renderer = this.capabilities?.webgl?.renderer?.toLowerCase() || '';
        if (renderer.includes('nvidia') || renderer.includes('amd')) {
            score += 15;
        } else if (renderer.includes('intel')) {
            score += 5;
        }

        // Estimate FPS and quality based on score
        if (score >= 60) {
            performance.estimatedFPS = 60;
            performance.recommendedQuality = 'high';
            performance.canHandleHighPolyCount = true;
        } else if (score >= 40) {
            performance.estimatedFPS = 45;
            performance.recommendedQuality = 'medium';
        } else if (score >= 20) {
            performance.estimatedFPS = 30;
            performance.recommendedQuality = 'low';
        } else {
            performance.estimatedFPS = 20;
            performance.recommendedQuality = 'low';
        }

        return performance;
    }

    /**
     * Classify performance tier based on capabilities
     * @param {Object} capabilities Hardware capabilities
     * @returns {string} Performance tier: 'low', 'medium', or 'high'
     */
    classifyPerformanceTier(capabilities) {
        let score = 0;

        // WebGL support
        if (capabilities.webgl.supported) {
            score += capabilities.webgl.version === 'webgl2' ? 30 : 15;
        }

        // Memory
        if (capabilities.memory.deviceMemory) {
            const memoryGB = capabilities.memory.deviceMemory / (1024 * 1024 * 1024);
            if (memoryGB >= 8) score += 20;
            else if (memoryGB >= 4) score += 10;
            else if (memoryGB >= 2) score += 5;
        }

        // GPU memory
        if (capabilities.memory.estimatedGPUMemory) {
            const gpuMemoryGB = capabilities.memory.estimatedGPUMemory / (1024 * 1024 * 1024);
            if (gpuMemoryGB >= 4) score += 20;
            else if (gpuMemoryGB >= 2) score += 10;
            else if (gpuMemoryGB >= 1) score += 5;
        }

        // WebGL capabilities
        const { limits } = capabilities.webgl;
        if (limits.maxTextureSize >= 8192) score += 10;
        if (limits.hasInstancedArrays) score += 10;
        if (limits.hasFloatTextures) score += 5;

        // Performance estimation
        if (capabilities.performance.estimatedFPS >= 60) score += 15;
        else if (capabilities.performance.estimatedFPS >= 45) score += 10;
        else if (capabilities.performance.estimatedFPS >= 30) score += 5;

        // Classify tier
        if (score >= 70) return 'high';
        else if (score >= 40) return 'medium';
        else return 'low';
    }

    /**
     * Get fallback capabilities when detection fails
     * @returns {Object} Fallback capabilities
     */
    getFallbackCapabilities() {
        return {
            webgl: {
                supported: false,
                version: 'none',
                vendor: 'unknown',
                renderer: 'unknown',
                extensions: [],
                limits: {}
            },
            memory: {
                deviceMemory: null,
                jsHeapSizeLimit: null,
                estimatedGPUMemory: 512 * 1024 * 1024, // 512MB fallback
                estimatedAvailableMemory: 256 * 1024 * 1024 // 256MB fallback
            },
            performance: {
                estimatedFPS: 15,
                recommendedQuality: 'low',
                canHandleComplexShaders: false,
                canHandleHighPolyCount: false,
                canHandleInstancing: false
            },
            timestamp: Date.now()
        };
    }

    /**
     * Get the detected performance tier
     * @returns {string} Performance tier
     */
    getPerformanceTier() {
        return this.performanceTier || 'low';
    }

    /**
     * Get the detected capabilities
     * @returns {Object} Hardware capabilities
     */
    getCapabilities() {
        return this.capabilities;
    }

    /**
     * Check if detection is complete
     * @returns {boolean} True if detection is complete
     */
    isDetectionComplete() {
        return this.detectionComplete;
    }

    /**
     * Reset detection state (useful for re-detection)
     */
    reset() {
        this.capabilities = null;
        this.performanceTier = null;
        this.webglContext = null;
        this.detectionComplete = false;
    }
}

export { HardwareDetector };
