/**
 * InstanceManager - Mesh instancing optimization system
 *
 * This class provides:
 * - Automatic instancing for similar meshes (trees, rocks, buildings)
 * - Instance buffer management and updates
 * - Instancing fallback for unsupported hardware
 * - Integration with LOD and culling systems
 */

export class InstanceManager {
    constructor(scene, qualitySettings = null) {
        this.scene = scene;
        this.qualitySettings = qualitySettings;

        // Core state
        this.initialized = false;
        this.enabled = true;

        // Instancing configuration
        this.config = {
            // General instancing settings
            enableInstancing: true,
            instanceBatchSize: 100,
            minInstanceCount: 3, // Minimum instances needed to create instanced mesh
            maxInstanceCount: 1000, // Maximum instances per batch

            // Hardware compatibility
            enableFallback: true,
            fallbackToClones: true,

            // Performance settings
            updateFrequency: 5, // Update instance buffers every N frames
            maxUpdatesPerFrame: 10, // Limit buffer updates per frame
            enableDynamicBatching: true,

            // Instance grouping criteria
            groupingCriteria: {
                geometryTolerance: 0.01, // Tolerance for geometry comparison
                materialTolerance: 0.1, // Tolerance for material comparison
                sizeTolerance: 0.05, // Tolerance for size comparison
                enableNameGrouping: true, // Group by name patterns
                enableMetadataGrouping: true // Group by metadata tags
            }
        };

        // Instance groups management
        this.instanceGroups = new Map(); // groupId -> InstanceGroupData
        this.meshToGroup = new Map(); // meshId -> groupId
        this.candidateMeshes = new Map(); // meshId -> MeshCandidateData

        // Hardware capabilities
        this.hardwareSupport = {
            supportsInstancing: false,
            maxInstancedAttributes: 0,
            maxInstanceBufferSize: 0,
            supportsInstancedArrays: false
        };

        // Performance tracking
        this.statistics = {
            totalMeshes: 0,
            instancedMeshes: 0,
            instanceGroups: 0,
            totalInstances: 0,
            drawCallsSaved: 0,
            memoryUsed: 0,
            lastUpdateTime: 0,
            updateDuration: 0,
            bufferUpdates: 0
        };

        // Update control
        this.frameCounter = 0;
        this.updateQueue = [];
        this.pendingUpdates = new Set();

        console.log('InstanceManager initialized');
    }

    /**
     * Initialize the instance manager
     */
    async initialize() {
        if (this.initialized) {
            console.warn('InstanceManager already initialized');
            return;
        }

        try {
            console.log('Initializing InstanceManager...');

            // Detect hardware capabilities
            this.detectHardwareCapabilities();

            // Apply quality settings if available
            if (this.qualitySettings) {
                this.applyQualitySettings();
            }

            // Register existing meshes
            this.registerExistingMeshes();

            // Set up scene observation
            this.setupSceneObservation();

            // Perform initial instancing analysis
            await this.analyzeInstanceCandidates();

            this.initialized = true;
            console.log('InstanceManager initialization complete');
        } catch (error) {
            console.error('Failed to initialize InstanceManager:', error);
            throw error;
        }
    }

    /**
     * Detect hardware capabilities for instancing
     */
    detectHardwareCapabilities() {
        const engine = this.scene.getEngine();
        const gl = engine._gl;

        if (!gl) {
            console.warn('WebGL context not available for hardware detection');
            return;
        }

        // Check for instancing support
        this.hardwareSupport.supportsInstancing = engine.getCaps().instancedArrays;
        this.hardwareSupport.supportsInstancedArrays = Boolean(gl.drawArraysInstanced);

        // Get maximum instanced attributes
        if (this.hardwareSupport.supportsInstancing) {
            this.hardwareSupport.maxInstancedAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) || 16;

            // Use a conservative estimate for max instance buffer size
            // WebGL doesn't expose MAX_ARRAY_BUFFER_SIZE, so we use a safe default
            this.hardwareSupport.maxInstanceBufferSize = 256 * 1024; // 256MB in KB
        }

        console.log('Hardware instancing capabilities:', this.hardwareSupport);

        // Disable instancing if not supported
        if (!this.hardwareSupport.supportsInstancing) {
            console.warn('Hardware instancing not supported, using fallback methods');
            this.config.enableInstancing = false;
        }
    }

    /**
     * Apply quality settings to instancing configuration
     */
    applyQualitySettings() {
        if (!this.qualitySettings) return;

        const settings = this.qualitySettings.getCurrentSettings();
        if (!settings) return;

        const renderingSettings = settings.rendering;

        // Apply instancing settings
        this.config.enableInstancing = renderingSettings.enableInstancing && this.hardwareSupport.supportsInstancing;
        this.config.instanceBatchSize = renderingSettings.instanceBatchSize || 100;
        this.config.enableDynamicBatching = renderingSettings.enableDynamicBatching;

        // Adjust performance settings based on quality level
        const { qualityLevel } = settings.general;

        if (qualityLevel < 50) {
            // Low quality - reduce instancing overhead
            this.config.updateFrequency = 10;
            this.config.maxUpdatesPerFrame = 5;
            this.config.maxInstanceCount = 500;
        } else if (qualityLevel > 80) {
            // High quality - more aggressive instancing
            this.config.updateFrequency = 3;
            this.config.maxUpdatesPerFrame = 20;
            this.config.maxInstanceCount = 2000;
        }

        console.log(`Instancing settings applied for quality level: ${qualityLevel}`);
    }

    /**
     * Register existing meshes for instancing analysis
     */
    registerExistingMeshes() {
        for (const mesh of this.scene.meshes) {
            if (this.shouldConsiderForInstancing(mesh)) {
                this.registerMeshCandidate(mesh);
            }
        }
    }

    /**
     * Set up scene observation for automatic mesh registration
     */
    setupSceneObservation() {
        // Listen for new meshes being added
        this.scene.onNewMeshAddedObservable.add(mesh => {
            if (this.shouldConsiderForInstancing(mesh)) {
                this.registerMeshCandidate(mesh);

                // Trigger re-analysis after a short delay to allow for batch additions
                setTimeout(() => {
                    this.analyzeInstanceCandidates();
                }, 100);
            }
        });

        // Listen for meshes being removed
        this.scene.onMeshRemovedObservable.add(mesh => {
            this.unregisterMeshCandidate(mesh);
        });
    }

    /**
     * Determine if a mesh should be considered for instancing
     */
    shouldConsiderForInstancing(mesh) {
        // Skip if mesh is already disposed
        if (mesh.isDisposed()) return false;

        // Skip system meshes
        if (mesh.name.startsWith('__')) return false;

        // Skip if mesh has instancing disabled in metadata
        if (mesh.metadata && mesh.metadata.disableInstancing) return false;

        // Skip if mesh is already an instance
        if (mesh.sourceMesh) return false;

        // Skip very large meshes (likely unique objects)
        const boundingInfo = mesh.getBoundingInfo();
        if (boundingInfo) {
            const size = boundingInfo.boundingBox.extendSize;
            const maxSize = Math.max(size.x, size.y, size.z);
            if (maxSize > 50) return false; // Skip very large objects
        }

        // Skip animated meshes (they need special handling)
        if (mesh.animations && mesh.animations.length > 0) return false;

        // Skip transparent meshes (they might need special rendering order)
        if (mesh.material && mesh.material.alpha < 1.0) return false;

        return true;
    }

    /**
     * Register a mesh as a candidate for instancing
     */
    registerMeshCandidate(mesh) {
        if (!mesh || mesh.isDisposed()) return false;

        const meshId = mesh.uniqueId;

        // Skip if already registered
        if (this.candidateMeshes.has(meshId)) {
            return false;
        }

        // Create candidate data
        const candidateData = {
            mesh,
            meshId,
            geometryHash: this.calculateGeometryHash(mesh),
            materialHash: this.calculateMaterialHash(mesh),
            sizeHash: this.calculateSizeHash(mesh),
            namePattern: this.extractNamePattern(mesh.name),
            metadataGroup: this.extractMetadataGroup(mesh),
            isInstanced: false,
            instanceGroupId: null,
            registrationTime: performance.now()
        };

        this.candidateMeshes.set(meshId, candidateData);
        this.statistics.totalMeshes++;

        console.log(`Registered mesh candidate for instancing: ${mesh.name}`);
        return true;
    }

    /**
     * Calculate geometry hash for mesh comparison
     */
    calculateGeometryHash(mesh) {
        if (!mesh.geometry) return 'no-geometry';

        const vertices = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const indices = mesh.getIndices();

        if (!vertices) return 'no-vertices';

        // Create a simple hash based on vertex count and some vertex positions
        let hash = vertices.length.toString();

        if (indices) {
            hash += `-${indices.length.toString()}`;
        }

        // Sample some vertices for more detailed comparison
        const sampleCount = Math.min(12, vertices.length / 3); // Sample up to 4 vertices
        for (let i = 0; i < sampleCount; i += 3) {
            const x = Math.round(vertices[i] * 100) / 100;
            const y = Math.round(vertices[i + 1] * 100) / 100;
            const z = Math.round(vertices[i + 2] * 100) / 100;
            hash += `-${x},${y},${z}`;
        }

        return hash;
    }

    /**
     * Calculate material hash for mesh comparison
     */
    calculateMaterialHash(mesh) {
        if (!mesh.material) return 'no-material';

        const { material } = mesh;
        let hash = material.getClassName();

        // Add key material properties
        if (material.diffuseColor) {
            hash += `-${material.diffuseColor.r.toFixed(2)},${material.diffuseColor.g.toFixed(2)},${material.diffuseColor.b.toFixed(2)}`;
        }

        if (material.diffuseTexture) {
            hash += `-tex:${material.diffuseTexture.name || 'unnamed'}`;
        }

        if (material.alpha !== undefined) {
            hash += `-alpha:${material.alpha.toFixed(2)}`;
        }

        return hash;
    }

    /**
     * Calculate size hash for mesh comparison
     */
    calculateSizeHash(mesh) {
        const boundingInfo = mesh.getBoundingInfo();
        if (!boundingInfo) return 'no-bounds';

        const size = boundingInfo.boundingBox.extendSize;
        const x = Math.round(size.x * 10) / 10;
        const y = Math.round(size.y * 10) / 10;
        const z = Math.round(size.z * 10) / 10;

        return `${x},${y},${z}`;
    }

    /**
     * Extract name pattern for grouping
     */
    extractNamePattern(name) {
        if (!this.config.groupingCriteria.enableNameGrouping) return null;

        // Remove numbers and common suffixes to find base pattern
        const pattern = name
            .replace(/\d+/g, '#') // Replace numbers with #
            .replace(/_(copy|clone|instance).*$/i, '') // Remove copy/clone suffixes
            .replace(/_\d+$/, '') // Remove trailing numbers
            .toLowerCase();

        return pattern;
    }

    /**
     * Extract metadata group for grouping
     */
    extractMetadataGroup(mesh) {
        if (!this.config.groupingCriteria.enableMetadataGrouping) return null;

        const { metadata } = mesh;
        if (!metadata) return null;

        // Look for instancing group in metadata
        if (metadata.instanceGroup) {
            return metadata.instanceGroup;
        }

        // Look for type or category
        if (metadata.type) {
            return metadata.type;
        }

        if (metadata.category) {
            return metadata.category;
        }

        return null;
    }

    /**
     * Unregister a mesh candidate
     */
    unregisterMeshCandidate(mesh) {
        if (!mesh) return false;

        const meshId = mesh.uniqueId;
        const candidateData = this.candidateMeshes.get(meshId);

        if (!candidateData) return false;

        // Remove from instance group if instanced
        if (candidateData.isInstanced && candidateData.instanceGroupId) {
            this.removeFromInstanceGroup(candidateData);
        }

        // Remove from candidates
        this.candidateMeshes.delete(meshId);
        this.statistics.totalMeshes--;

        console.log(`Unregistered mesh candidate: ${mesh.name}`);
        return true;
    }

    /**
     * Analyze candidates and create instance groups
     */
    async analyzeInstanceCandidates() {
        if (!this.config.enableInstancing) return;

        console.log('Analyzing instance candidates...');

        const startTime = performance.now();

        // Group candidates by similarity
        const groups = this.groupSimilarMeshes();

        // Create instance groups for viable candidates
        for (const [groupKey, candidates] of groups) {
            if (candidates.length >= this.config.minInstanceCount) {
                await this.createInstanceGroup(groupKey, candidates);
            }
        }

        // Clean up empty groups
        this.cleanupEmptyGroups();

        const duration = performance.now() - startTime;
        console.log(`Instance analysis completed in ${duration.toFixed(2)}ms, created ${this.instanceGroups.size} groups`);
    }

    /**
     * Group similar meshes for instancing
     */
    groupSimilarMeshes() {
        const groups = new Map();

        for (const candidateData of this.candidateMeshes.values()) {
            if (candidateData.isInstanced) continue; // Skip already instanced meshes

            // Create group key based on similarity criteria
            const groupKey = this.createGroupKey(candidateData);

            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }

            groups.get(groupKey).push(candidateData);
        }

        return groups;
    }

    /**
     * Create group key for mesh similarity
     */
    createGroupKey(candidateData) {
        const parts = [];

        // Geometry similarity
        parts.push(`geo:${candidateData.geometryHash}`);

        // Material similarity
        parts.push(`mat:${candidateData.materialHash}`);

        // Size similarity (optional, with tolerance)
        if (this.config.groupingCriteria.sizeTolerance > 0) {
            parts.push(`size:${candidateData.sizeHash}`);
        }

        // Name pattern similarity
        if (candidateData.namePattern) {
            parts.push(`name:${candidateData.namePattern}`);
        }

        // Metadata group similarity
        if (candidateData.metadataGroup) {
            parts.push(`meta:${candidateData.metadataGroup}`);
        }

        return parts.join('|');
    }

    /**
     * Create an instance group from similar meshes
     */
    async createInstanceGroup(groupKey, candidates) {
        if (candidates.length < this.config.minInstanceCount) return null;

        // Use the first mesh as the source mesh
        const sourceMesh = candidates[0].mesh;
        const groupId = `instance_group_${this.instanceGroups.size}`;

        console.log(`Creating instance group: ${groupId} with ${candidates.length} instances`);

        try {
            // Create instance group data
            const instanceGroup = {
                groupId,
                groupKey,
                sourceMesh,
                instances: new Map(), // instanceId -> InstanceData
                instancedMesh: null,
                instanceBuffer: null,
                matrixBuffer: null,
                colorBuffer: null,
                needsUpdate: false,
                lastUpdateTime: 0,
                isActive: true
            };

            // Create instanced mesh if hardware supports it
            if (this.hardwareSupport.supportsInstancing) {
                instanceGroup.instancedMesh = await this.createInstancedMesh(sourceMesh, candidates.length);

                if (instanceGroup.instancedMesh) {
                    // Create instance buffers
                    this.createInstanceBuffers(instanceGroup, candidates);

                    // Hide original meshes
                    for (const candidate of candidates) {
                        candidate.mesh.setEnabled(false);
                        candidate.isInstanced = true;
                        candidate.instanceGroupId = groupId;
                        this.meshToGroup.set(candidate.meshId, groupId);
                    }

                    this.statistics.instancedMeshes += candidates.length;
                    this.statistics.drawCallsSaved += candidates.length - 1;
                }
            } else if (this.config.enableFallback && this.config.fallbackToClones) {
                // Fallback to cloning optimization
                instanceGroup.instancedMesh = sourceMesh;

                // Mark candidates as instanced (even though using fallback)
                for (const candidate of candidates) {
                    candidate.isInstanced = true;
                    candidate.instanceGroupId = groupId;
                    this.meshToGroup.set(candidate.meshId, groupId);
                }
            }

            // Register the instance group
            this.instanceGroups.set(groupId, instanceGroup);
            this.statistics.instanceGroups++;
            this.statistics.totalInstances += candidates.length;

            console.log(`Instance group created successfully: ${groupId}`);
            return instanceGroup;
        } catch (error) {
            console.error(`Failed to create instance group: ${groupId}`, error);
            return null;
        }
    }

    /**
     * Create instanced mesh from source mesh
     */
    async createInstancedMesh(sourceMesh, instanceCount) {
        try {
            // Clone the source mesh for instancing
            const instancedMesh = sourceMesh.clone(`${sourceMesh.name}_instanced`);

            if (!instancedMesh) {
                throw new Error('Failed to clone source mesh');
            }

            // Set up instancing
            instancedMesh.thinInstanceCount = instanceCount;

            // Ensure the mesh is visible
            instancedMesh.setEnabled(true);

            return instancedMesh;
        } catch (error) {
            console.error('Failed to create instanced mesh:', error);
            return null;
        }
    }

    /**
     * Create instance buffers for the group
     */
    createInstanceBuffers(instanceGroup, candidates) {
        const instanceCount = candidates.length;

        // Create matrix buffer (16 floats per instance for transformation matrix)
        const matrixData = new Float32Array(instanceCount * 16);

        // Create color buffer (4 floats per instance for color variation)
        const colorData = new Float32Array(instanceCount * 4);

        // Fill buffers with data from candidate meshes
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const { mesh } = candidate;

            // Get transformation matrix
            const matrix = mesh.getWorldMatrix();
            const matrixArray = matrix.asArray();

            // Copy matrix data
            for (let j = 0; j < 16; j++) {
                matrixData[i * 16 + j] = matrixArray[j];
            }

            // Set color (default to white, can be customized)
            colorData[i * 4 + 0] = 1.0; // R
            colorData[i * 4 + 1] = 1.0; // G
            colorData[i * 4 + 2] = 1.0; // B
            colorData[i * 4 + 3] = 1.0; // A

            // Create instance data
            const instanceData = {
                instanceId: i,
                candidateData: candidate,
                position: mesh.position.clone(),
                rotation: mesh.rotation.clone(),
                scaling: mesh.scaling.clone(),
                color: new BABYLON.Color4(1, 1, 1, 1),
                isVisible: true,
                needsUpdate: false
            };

            instanceGroup.instances.set(i, instanceData);
        }

        // Create Babylon.js buffers
        try {
            const engine = this.scene.getEngine();

            // Create matrix buffer
            instanceGroup.matrixBuffer = new BABYLON.Buffer(engine, matrixData, false, 16);
            instanceGroup.instancedMesh.thinInstanceSetBuffer('matrix', instanceGroup.matrixBuffer, 16);

            // Create color buffer
            instanceGroup.colorBuffer = new BABYLON.Buffer(engine, colorData, false, 4);
            instanceGroup.instancedMesh.thinInstanceSetBuffer('color', instanceGroup.colorBuffer, 4);

            console.log(`Instance buffers created for group: ${instanceGroup.groupId}`);
        } catch (error) {
            console.error('Failed to create instance buffers:', error);
        }
    }

    /**
     * Update instance manager
     */
    updateInstances(deltaTime) {
        if (!this.initialized || !this.enabled) return;

        this.frameCounter++;

        // Check if it's time for update
        if (this.frameCounter % this.config.updateFrequency !== 0) {
            return;
        }

        const startTime = performance.now();

        // Process pending updates
        this.processPendingUpdates();

        // Update instance buffers that need updating
        this.updateInstanceBuffers();

        // Update statistics
        this.statistics.lastUpdateTime = performance.now();
        this.statistics.updateDuration = this.statistics.lastUpdateTime - startTime;
    }

    /**
     * Process pending updates
     */
    processPendingUpdates() {
        let updatesProcessed = 0;

        for (const groupId of this.pendingUpdates) {
            if (updatesProcessed >= this.config.maxUpdatesPerFrame) {
                break;
            }

            const instanceGroup = this.instanceGroups.get(groupId);
            if (instanceGroup && instanceGroup.needsUpdate) {
                this.updateInstanceGroup(instanceGroup);
                updatesProcessed++;
            }

            this.pendingUpdates.delete(groupId);
        }
    }

    /**
     * Update instance buffers for groups that need it
     */
    updateInstanceBuffers() {
        for (const instanceGroup of this.instanceGroups.values()) {
            if (instanceGroup.needsUpdate) {
                this.updateInstanceGroup(instanceGroup);
            }
        }
    }

    /**
     * Update a specific instance group
     */
    updateInstanceGroup(instanceGroup) {
        if (!instanceGroup.instancedMesh || !instanceGroup.matrixBuffer) {
            return;
        }

        try {
            const instances = Array.from(instanceGroup.instances.values());
            const matrixData = new Float32Array(instances.length * 16);
            const colorData = new Float32Array(instances.length * 4);

            // Update buffer data
            for (let i = 0; i < instances.length; i++) {
                const instance = instances[i];

                if (!instance.needsUpdate) continue;

                // Create transformation matrix
                const matrix = BABYLON.Matrix.Compose(
                    instance.scaling,
                    BABYLON.Quaternion.FromEulerAngles(instance.rotation.x, instance.rotation.y, instance.rotation.z),
                    instance.position
                );

                const matrixArray = matrix.asArray();

                // Update matrix data
                for (let j = 0; j < 16; j++) {
                    matrixData[i * 16 + j] = matrixArray[j];
                }

                // Update color data
                colorData[i * 4 + 0] = instance.color.r;
                colorData[i * 4 + 1] = instance.color.g;
                colorData[i * 4 + 2] = instance.color.b;
                colorData[i * 4 + 3] = instance.color.a;

                instance.needsUpdate = false;
            }

            // Update buffers
            instanceGroup.matrixBuffer.update(matrixData);
            instanceGroup.colorBuffer.update(colorData);

            instanceGroup.needsUpdate = false;
            instanceGroup.lastUpdateTime = performance.now();

            this.statistics.bufferUpdates++;
        } catch (error) {
            console.error(`Failed to update instance group: ${instanceGroup.groupId}`, error);
        }
    }

    /**
     * Remove mesh from instance group
     */
    removeFromInstanceGroup(candidateData) {
        const groupId = candidateData.instanceGroupId;
        if (!groupId) return;

        const instanceGroup = this.instanceGroups.get(groupId);
        if (!instanceGroup) return;

        // Find and remove the instance
        for (const [instanceId, instanceData] of instanceGroup.instances) {
            if (instanceData.candidateData === candidateData) {
                instanceGroup.instances.delete(instanceId);
                break;
            }
        }

        // Mark group for update
        instanceGroup.needsUpdate = true;
        this.pendingUpdates.add(groupId);

        // Clean up candidate data
        candidateData.isInstanced = false;
        candidateData.instanceGroupId = null;
        this.meshToGroup.delete(candidateData.meshId);

        // Re-enable original mesh
        if (!candidateData.mesh.isDisposed()) {
            candidateData.mesh.setEnabled(true);
        }

        this.statistics.instancedMeshes--;
        this.statistics.totalInstances--;
    }

    /**
     * Clean up empty instance groups
     */
    cleanupEmptyGroups() {
        const groupsToRemove = [];

        for (const [groupId, instanceGroup] of this.instanceGroups) {
            if (instanceGroup.instances.size === 0) {
                groupsToRemove.push(groupId);
            } else if (instanceGroup.instances.size < this.config.minInstanceCount) {
                // Convert back to individual meshes if below minimum
                this.convertGroupBackToIndividual(instanceGroup);
                groupsToRemove.push(groupId);
            }
        }

        // Remove empty groups
        for (const groupId of groupsToRemove) {
            this.removeInstanceGroup(groupId);
        }
    }

    /**
     * Convert instance group back to individual meshes
     */
    convertGroupBackToIndividual(instanceGroup) {
        console.log(`Converting instance group back to individual meshes: ${instanceGroup.groupId}`);

        // Re-enable original meshes
        for (const instanceData of instanceGroup.instances.values()) {
            const { candidateData } = instanceData;

            if (!candidateData.mesh.isDisposed()) {
                candidateData.mesh.setEnabled(true);
            }

            candidateData.isInstanced = false;
            candidateData.instanceGroupId = null;
            this.meshToGroup.delete(candidateData.meshId);
        }

        this.statistics.instancedMeshes -= instanceGroup.instances.size;
        this.statistics.totalInstances -= instanceGroup.instances.size;
    }

    /**
     * Remove an instance group
     */
    removeInstanceGroup(groupId) {
        const instanceGroup = this.instanceGroups.get(groupId);
        if (!instanceGroup) return;

        // Dispose instanced mesh
        if (instanceGroup.instancedMesh && instanceGroup.instancedMesh !== instanceGroup.sourceMesh) {
            instanceGroup.instancedMesh.dispose();
        }

        // Dispose buffers
        if (instanceGroup.matrixBuffer) {
            instanceGroup.matrixBuffer.dispose();
        }

        if (instanceGroup.colorBuffer) {
            instanceGroup.colorBuffer.dispose();
        }

        // Remove from tracking
        this.instanceGroups.delete(groupId);
        this.pendingUpdates.delete(groupId);

        this.statistics.instanceGroups--;

        console.log(`Removed instance group: ${groupId}`);
    }

    /**
     * Get instancing statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            candidateMeshes: this.candidateMeshes.size,
            activeGroups: this.instanceGroups.size,
            pendingUpdates: this.pendingUpdates.size,
            enabled: this.enabled,
            hardwareSupport: this.hardwareSupport
        };
    }

    /**
     * Enable or disable instancing system
     */
    setEnabled(enabled) {
        this.enabled = enabled;

        if (!enabled) {
            // Convert all instance groups back to individual meshes
            for (const instanceGroup of this.instanceGroups.values()) {
                this.convertGroupBackToIndividual(instanceGroup);
            }

            // Clear all groups
            for (const groupId of this.instanceGroups.keys()) {
                this.removeInstanceGroup(groupId);
            }
        } else if (this.initialized) {
            // Re-analyze candidates when re-enabled
            setTimeout(() => {
                this.analyzeInstanceCandidates();
            }, 100);
        }

        console.log(`Instancing system ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Force re-analysis of instance candidates
     */
    forceReanalysis() {
        console.log('Forcing instancing re-analysis...');

        // Reset all candidate states
        for (const candidateData of this.candidateMeshes.values()) {
            if (candidateData.isInstanced) {
                this.removeFromInstanceGroup(candidateData);
            }
        }

        // Clear all groups
        for (const groupId of this.instanceGroups.keys()) {
            this.removeInstanceGroup(groupId);
        }

        // Re-analyze
        this.analyzeInstanceCandidates();
    }

    /**
     * Get instance group for a mesh
     */
    getInstanceGroup(mesh) {
        const groupId = this.meshToGroup.get(mesh.uniqueId);
        return groupId ? this.instanceGroups.get(groupId) : null;
    }

    /**
     * Dispose of the instance manager
     */
    dispose() {
        console.log('Disposing InstanceManager...');

        // Convert all groups back to individual meshes
        for (const instanceGroup of this.instanceGroups.values()) {
            this.convertGroupBackToIndividual(instanceGroup);
        }

        // Remove all groups
        for (const groupId of this.instanceGroups.keys()) {
            this.removeInstanceGroup(groupId);
        }

        // Clear all data
        this.instanceGroups.clear();
        this.meshToGroup.clear();
        this.candidateMeshes.clear();
        this.updateQueue = [];
        this.pendingUpdates.clear();

        this.initialized = false;

        console.log('InstanceManager disposed');
    }
}
