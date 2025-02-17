import { BowlCreator } from '../BowlCreator.js';

// Import both required navigation components
const recastUrl = 'https://cdn.babylonjs.com/recast.js';
const recastWasmUrl = 'https://cdn.babylonjs.com/recast.wasm';

export class NavigationMesh {
    constructor(scene) {
        this.scene = scene;
        this.pathNodes = [];
        this.navigationMesh = null;
        this.navigationPlugin = null;
        this.debugVisualization = false;
        this.recastInstance = null;
    }

    async loadRecast() {
        try {
            // Load Recast script
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.babylonjs.com/recast.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            // Initialize Recast
            this.recastInstance = await Recast();
            console.log('Recast loaded and initialized successfully');
        } catch (error) {
            console.error('Failed to load or initialize Recast:', error);
            throw error;
        }
    }

    async waitForRecast() {
        return new Promise((resolve) => {
            const checkRecast = () => {
                if (typeof Recast !== 'undefined' && Recast.RECAST_WASM_URL) {
                    resolve();
                } else {
                    setTimeout(checkRecast, 100);
                }
            };
            checkRecast();
        });
    }

    async initialize(options = {}) {
        const {
            gridSize = 20,
            spacing = 10,
            debug = false
        } = options;

        // Load and initialize Recast if not already done
        if (!this.recastInstance) {
            await this.loadRecast();
        }

        this.debugVisualization = debug;
        this.createNavigationMesh(gridSize, spacing);
        await this.setupNavigationPlugin();
    }

    createNavigationMesh(gridSize, spacing) {
        // Create path nodes across the landscape
        for (let x = -gridSize; x <= gridSize; x += spacing) {
            for (let z = -gridSize; z <= gridSize; z += spacing) {
                const node = new BABYLON.TransformNode(`pathNode_${x}_${z}`, this.scene);
                node.position = new BABYLON.Vector3(x * 5, this.getHeightAtPoint(x, z), z * 5);
                this.pathNodes.push(node);
                
                // Visualize nodes in debug mode
                if (this.debugVisualization) {
                    const sphere = BABYLON.MeshBuilder.CreateSphere(`nodeVis_${x}_${z}`, {
                        diameter: 1
                    }, this.scene);
                    sphere.position = node.position;
                    sphere.visibility = 0.3;
                }
            }
        }

        // Create navigation mesh geometry
        const navigationMeshData = this.createNavigationMeshGeometry();
        this.navigationMesh = new BABYLON.Mesh("navigationMesh", this.scene);
        this.navigationMesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, navigationMeshData.positions);
        this.navigationMesh.setIndices(navigationMeshData.indices);

        // Make navigation mesh invisible but keep it for pathfinding
        this.navigationMesh.isVisible = this.debugVisualization;
        if (this.debugVisualization) {
            const debugMaterial = new BABYLON.StandardMaterial("navMeshMat", this.scene);
            debugMaterial.wireframe = true;
            debugMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0);
            this.navigationMesh.material = debugMaterial;
        }
    }

    createNavigationMeshGeometry() {
        // Create a triangulated mesh that represents the walkable areas
        const positions = [];
        const indices = [];
        let vertexIndex = 0;

        // Create triangles between path nodes
        for (let i = 0; i < this.pathNodes.length - 1; i++) {
            for (let j = i + 1; j < this.pathNodes.length; j++) {
                const node1 = this.pathNodes[i];
                const node2 = this.pathNodes[j];
                
                // Check if nodes are neighbors (within reasonable distance)
                const distance = BABYLON.Vector3.Distance(node1.position, node2.position);
                if (distance <= 15) { // Adjust this threshold as needed
                    // Create two triangles to form a quad between nodes
                    const midPoint = BABYLON.Vector3.Lerp(node1.position, node2.position, 0.5);
                    const perpendicular = new BABYLON.Vector3(
                        -(node2.position.z - node1.position.z),
                        0,
                        node2.position.x - node1.position.x
                    ).normalize().scale(2);

                    positions.push(
                        node1.position.x, node1.position.y, node1.position.z,
                        node2.position.x, node2.position.y, node2.position.z,
                        midPoint.x + perpendicular.x, midPoint.y, midPoint.z + perpendicular.z,
                        midPoint.x - perpendicular.x, midPoint.y, midPoint.z - perpendicular.z
                    );

                    // First triangle
                    indices.push(
                        vertexIndex,
                        vertexIndex + 1,
                        vertexIndex + 2
                    );

                    // Second triangle
                    indices.push(
                        vertexIndex,
                        vertexIndex + 2,
                        vertexIndex + 3
                    );

                    vertexIndex += 4;
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            indices: indices
        };
    }

    async setupNavigationPlugin() {
        try {
            // Create and configure the navigation plugin with the Recast instance
            this.navigationPlugin = new BABYLON.RecastJSPlugin(this.recastInstance);
            await this.navigationPlugin.createNavMesh(
                [this.navigationMesh],
                {
                    cs: 0.2,
                    ch: 0.2,
                    walkableSlopeAngle: 35,
                    walkableHeight: 1,
                    walkableRadius: 1,
                    walkableClimb: 1,
                    minRegionArea: 2,
                    mergeRegionArea: 20,
                    maxEdgeLen: 12,
                    maxSimplificationError: 1.3,
                    detailSampleDist: 6,
                    detailSampleMaxError: 1
                }
            );
            console.log('Navigation mesh created successfully');
        } catch (error) {
            console.error('Failed to create navigation mesh:', error);
            throw error;
        }
    }

    findPath(start, end) {
        if (!this.navigationPlugin) return null;

        const path = this.navigationPlugin.computePath(start, end);
        if (path && path.length > 0) {
            return path;
        }
        return null;
    }

    getRandomNavigablePoint() {
        if (!this.navigationPlugin) return null;

        // Get a random node position as a starting point
        const randomNode = this.pathNodes[Math.floor(Math.random() * this.pathNodes.length)];
        return this.navigationPlugin.getRandomPointAround(randomNode.position, 10);
    }

    getHeightAtPoint(x, z) {
        return BowlCreator.getTerrainHeight(x, z);
    }

    isPointNavigable(point) {
        if (!this.navigationPlugin) return false;
        return this.navigationPlugin.isInNavMesh(point);
    }

    getNearestNavigablePoint(point) {
        if (!this.navigationPlugin) return null;
        return this.navigationPlugin.getClosestPoint(point);
    }

    dispose() {
        if (this.navigationMesh) {
            this.navigationMesh.dispose();
        }
        this.pathNodes.forEach(node => {
            if (node && node.dispose) {
                node.dispose();
            }
        });
        this.pathNodes = [];
        if (this.navigationPlugin) {
            this.navigationPlugin.dispose();
        }
    }
} 