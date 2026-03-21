/**
 * Agent Communication System
 * Handles message passing, proximity-based communication, and group coordination
 */

export class AgentCommunicationSystem {
    constructor(scene) {
        this.scene = scene;

        // Message management
        this.messageQueue = [];
        this.messageHistory = [];
        this.maxHistorySize = 1000;
        this.messageIdCounter = 0;

        // Subscription system
        this.subscriptions = new Map(); // messageType -> Set of agents
        this.agentSubscriptions = new Map(); // agentId -> Set of messageTypes

        // Proximity groups for efficient communication
        this.proximityGroups = new Map(); // groupId -> Set of agents
        this.agentGroups = new Map(); // agentId -> Set of groupIds
        this.groupRadius = 50; // Default communication radius

        // Performance optimization
        this.spatialGrid = new SpatialGrid(100); // 100 unit grid cells
        this.updateInterval = 100; // Update spatial grid every 100ms
        this.lastSpatialUpdate = 0;

        // Message types registry
        this.messageTypes = new Set([
            'threat_spotted',
            'help_needed',
            'all_clear',
            'target_acquired',
            'group_formation',
            'retreat_order',
            'attack_coordinate',
            'resource_found',
            'danger_warning',
            'status_update'
        ]);

        // Statistics
        this.stats = {
            messagesSent: 0,
            messagesReceived: 0,
            messagesDropped: 0,
            averageDeliveryTime: 0
        };
    }

    /**
     * Initialize the communication system
     */
    initialize() {
        // Set up update loop for message processing
        if (this.scene) {
            this.scene.onBeforeRenderObservable.add(() => {
                const deltaTime = this.scene.getEngine().getDeltaTime();
                this.update(deltaTime * 0.001);
            });
        }

        console.log('Agent Communication System initialized');
    }

    /**
     * Update the communication system
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        const now = performance.now();

        // Update spatial grid periodically
        if (now - this.lastSpatialUpdate > this.updateInterval) {
            this.updateSpatialGrid();
            this.lastSpatialUpdate = now;
        }

        // Process message queue
        this.processMessageQueue(deltaTime);

        // Clean up old messages
        this.cleanupOldMessages();
    }

    /**
     * Register an agent for communication
     * @param {Object} agent - Agent to register
     * @returns {string} - Agent ID for communication
     */
    registerAgent(agent) {
        if (!agent.communicationId) {
            agent.communicationId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Initialize agent communication data
        if (!this.agentSubscriptions.has(agent.communicationId)) {
            this.agentSubscriptions.set(agent.communicationId, new Set());
        }

        if (!this.agentGroups.has(agent.communicationId)) {
            this.agentGroups.set(agent.communicationId, new Set());
        }

        // Add to spatial grid
        this.spatialGrid.addAgent(agent);

        return agent.communicationId;
    }

    /**
     * Unregister an agent from communication
     * @param {Object} agent - Agent to unregister
     */
    unregisterAgent(agent) {
        if (!agent.communicationId) return;

        // Remove from all subscriptions
        for (const [messageType, subscribers] of this.subscriptions) {
            subscribers.delete(agent);
        }

        // Remove from all groups
        for (const groupId of this.agentGroups.get(agent.communicationId) || []) {
            this.leaveGroup(agent, groupId);
        }

        // Clean up maps
        this.agentSubscriptions.delete(agent.communicationId);
        this.agentGroups.delete(agent.communicationId);

        // Remove from spatial grid
        this.spatialGrid.removeAgent(agent);
    }

    /**
     * Send a message from one agent
     * @param {Object} sender - Sending agent
     * @param {string} messageType - Type of message
     * @param {Object} content - Message content
     * @param {Object} options - Delivery options
     * @returns {string} - Message ID
     */
    sendMessage(sender, messageType, content, options = {}) {
        if (!sender.communicationId) {
            console.warn('Agent not registered for communication');
            return null;
        }

        const message = new AgentMessage(
            sender,
            messageType,
            content,
            options.priority || 0,
            options.range || this.groupRadius,
            options.targetAgent || null,
            options.targetGroup || null
        );

        // Add to queue for processing
        this.messageQueue.push(message);
        this.stats.messagesSent++;

        return message.id;
    }

    /**
     * Subscribe an agent to a message type
     * @param {Object} agent - Agent to subscribe
     * @param {string} messageType - Message type to subscribe to
     */
    subscribe(agent, messageType) {
        if (!agent.communicationId) {
            this.registerAgent(agent);
        }

        if (!this.subscriptions.has(messageType)) {
            this.subscriptions.set(messageType, new Set());
        }

        this.subscriptions.get(messageType).add(agent);
        this.agentSubscriptions.get(agent.communicationId).add(messageType);
    }

    /**
     * Unsubscribe an agent from a message type
     * @param {Object} agent - Agent to unsubscribe
     * @param {string} messageType - Message type to unsubscribe from
     */
    unsubscribe(agent, messageType) {
        if (!agent.communicationId) return;

        if (this.subscriptions.has(messageType)) {
            this.subscriptions.get(messageType).delete(agent);
        }

        if (this.agentSubscriptions.has(agent.communicationId)) {
            this.agentSubscriptions.get(agent.communicationId).delete(messageType);
        }
    }

    /**
     * Create or join a communication group
     * @param {Object} agent - Agent joining the group
     * @param {string} groupId - Group identifier
     * @param {Object} groupOptions - Group configuration
     */
    joinGroup(agent, groupId, groupOptions = {}) {
        if (!agent.communicationId) {
            this.registerAgent(agent);
        }

        if (!this.proximityGroups.has(groupId)) {
            this.proximityGroups.set(groupId, new Set());
        }

        this.proximityGroups.get(groupId).add(agent);
        this.agentGroups.get(agent.communicationId).add(groupId);

        // Send group join notification
        this.sendMessage(agent, 'group_formation', {
            action: 'joined',
            groupId,
            memberCount: this.proximityGroups.get(groupId).size
        }, { targetGroup: groupId });
    }

    /**
     * Leave a communication group
     * @param {Object} agent - Agent leaving the group
     * @param {string} groupId - Group identifier
     */
    leaveGroup(agent, groupId) {
        if (!agent.communicationId) return;

        if (this.proximityGroups.has(groupId)) {
            this.proximityGroups.get(groupId).delete(agent);

            // Remove empty groups
            if (this.proximityGroups.get(groupId).size === 0) {
                this.proximityGroups.delete(groupId);
            } else {
                // Notify remaining members
                this.sendMessage(agent, 'group_formation', {
                    action: 'left',
                    groupId,
                    memberCount: this.proximityGroups.get(groupId).size
                }, { targetGroup: groupId });
            }
        }

        if (this.agentGroups.has(agent.communicationId)) {
            this.agentGroups.get(agent.communicationId).delete(groupId);
        }
    }

    /**
     * Broadcast a message to all agents within range
     * @param {Object} sender - Sending agent
     * @param {string} messageType - Type of message
     * @param {Object} content - Message content
     * @param {number} range - Broadcast range
     */
    broadcast(sender, messageType, content, range = this.groupRadius) {
        const nearbyAgents = this.spatialGrid.getAgentsInRange(sender, range);

        for (const agent of nearbyAgents) {
            if (agent !== sender && this.isSubscribed(agent, messageType)) {
                this.deliverMessage(new AgentMessage(sender, messageType, content), agent);
            }
        }
    }

    /**
     * Send a message to a specific group
     * @param {Object} sender - Sending agent
     * @param {string} groupId - Target group ID
     * @param {string} messageType - Type of message
     * @param {Object} content - Message content
     */
    sendToGroup(sender, groupId, messageType, content) {
        if (!this.proximityGroups.has(groupId)) return;

        const groupMembers = this.proximityGroups.get(groupId);
        for (const agent of groupMembers) {
            if (agent !== sender && this.isSubscribed(agent, messageType)) {
                this.deliverMessage(new AgentMessage(sender, messageType, content), agent);
            }
        }
    }

    /**
     * Process the message queue
     * @param {number} deltaTime - Time since last update
     */
    processMessageQueue(deltaTime) {
        // Sort messages by priority (higher priority first)
        this.messageQueue.sort((a, b) => b.priority - a.priority);

        const processedMessages = [];
        const maxMessagesPerFrame = 50; // Limit processing to prevent frame drops

        for (let i = 0; i < Math.min(this.messageQueue.length, maxMessagesPerFrame); i++) {
            const message = this.messageQueue[i];

            // Check if message has expired
            if (performance.now() - message.timestamp > message.ttl) {
                this.stats.messagesDropped++;
                continue;
            }

            // Deliver message
            this.deliverMessage(message);
            processedMessages.push(i);
        }

        // Remove processed messages
        for (let i = processedMessages.length - 1; i >= 0; i--) {
            this.messageQueue.splice(processedMessages[i], 1);
        }
    }

    /**
     * Deliver a message to its recipients
     * @param {AgentMessage} message - Message to deliver
     * @param {Object} specificAgent - Specific agent to deliver to (optional)
     */
    deliverMessage(message, specificAgent = null) {
        const deliveryTime = performance.now() - message.timestamp;

        if (specificAgent) {
            // Deliver to specific agent
            this.deliverToAgent(message, specificAgent, deliveryTime);
        } else if (message.targetAgent) {
            // Deliver to specific target
            this.deliverToAgent(message, message.targetAgent, deliveryTime);
        } else if (message.targetGroup) {
            // Deliver to group
            this.sendToGroup(message.sender, message.targetGroup, message.type, message.content);
        } else {
            // Deliver based on proximity and subscriptions
            const nearbyAgents = this.spatialGrid.getAgentsInRange(message.sender, message.range);

            for (const agent of nearbyAgents) {
                if (agent !== message.sender && this.isSubscribed(agent, message.type)) {
                    this.deliverToAgent(message, agent, deliveryTime);
                }
            }
        }

        // Add to history
        this.addToHistory(message, deliveryTime);
    }

    /**
     * Deliver message to a specific agent
     * @param {AgentMessage} message - Message to deliver
     * @param {Object} agent - Target agent
     * @param {number} deliveryTime - Time taken to deliver
     */
    deliverToAgent(message, agent, deliveryTime) {
        if (!agent.onMessageReceived) {
            // Create default message handler if none exists
            agent.onMessageReceived = msg => {
                if (!agent.receivedMessages) {
                    agent.receivedMessages = [];
                }
                agent.receivedMessages.push(msg);

                // Limit message history per agent
                if (agent.receivedMessages.length > 20) {
                    agent.receivedMessages.shift();
                }
            };
        }

        try {
            agent.onMessageReceived(message);
            this.stats.messagesReceived++;

            // Update average delivery time
            this.stats.averageDeliveryTime
                = (this.stats.averageDeliveryTime + deliveryTime) / 2;
        } catch (error) {
            console.error('Error delivering message to agent:', error);
        }
    }

    /**
     * Check if an agent is subscribed to a message type
     * @param {Object} agent - Agent to check
     * @param {string} messageType - Message type to check
     * @returns {boolean} - Whether agent is subscribed
     */
    isSubscribed(agent, messageType) {
        if (!agent.communicationId) return false;

        const subscriptions = this.agentSubscriptions.get(agent.communicationId);
        return subscriptions && subscriptions.has(messageType);
    }

    /**
     * Update spatial grid with current agent positions
     */
    updateSpatialGrid() {
        this.spatialGrid.update();
    }

    /**
     * Add message to history
     * @param {AgentMessage} message - Message to add
     * @param {number} deliveryTime - Time taken to deliver
     */
    addToHistory(message, deliveryTime) {
        this.messageHistory.push({
            ...message,
            deliveryTime,
            deliveredAt: performance.now()
        });

        // Maintain history size limit
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
    }

    /**
     * Clean up old messages and expired data
     */
    cleanupOldMessages() {
        const now = performance.now();
        const maxAge = 60000; // 1 minute

        // Clean up message history
        this.messageHistory = this.messageHistory.filter(
            msg => now - msg.deliveredAt < maxAge
        );

        // Clean up expired messages in queue
        this.messageQueue = this.messageQueue.filter(
            msg => now - msg.timestamp < msg.ttl
        );
    }

    /**
     * Get communication statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            ...this.stats,
            activeAgents: this.agentSubscriptions.size,
            activeGroups: this.proximityGroups.size,
            queuedMessages: this.messageQueue.length,
            messageHistory: this.messageHistory.length
        };
    }

    /**
     * Get agents in a specific group
     * @param {string} groupId - Group identifier
     * @returns {Set} - Set of agents in the group
     */
    getGroupMembers(groupId) {
        return this.proximityGroups.get(groupId) || new Set();
    }

    /**
     * Get all groups an agent belongs to
     * @param {Object} agent - Agent to check
     * @returns {Set} - Set of group IDs
     */
    getAgentGroups(agent) {
        if (!agent.communicationId) return new Set();
        return this.agentGroups.get(agent.communicationId) || new Set();
    }

    /**
     * Dispose of the communication system
     */
    dispose() {
        this.messageQueue = [];
        this.messageHistory = [];
        this.subscriptions.clear();
        this.agentSubscriptions.clear();
        this.proximityGroups.clear();
        this.agentGroups.clear();

        if (this.spatialGrid) {
            this.spatialGrid.dispose();
        }

        if (this.scene) {
            this.scene.onBeforeRenderObservable.clear();
        }
    }
}

/**
 * Agent Message class
 */
export class AgentMessage {
    constructor(sender, type, content, priority = 0, range = 50, targetAgent = null, targetGroup = null) {
        this.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.sender = sender;
        this.type = type;
        this.content = content;
        this.priority = priority;
        this.range = range;
        this.targetAgent = targetAgent;
        this.targetGroup = targetGroup;
        this.timestamp = performance.now();
        this.ttl = 5000; // Time to live: 5 seconds
    }
}

/**
 * Spatial Grid for efficient proximity queries
 */
class SpatialGrid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.agentCells = new Map(); // Track which cell each agent is in
    }

    /**
     * Add an agent to the spatial grid
     * @param {Object} agent - Agent to add
     */
    addAgent(agent) {
        if (!agent.mesh || !agent.mesh.position) return;

        const cellKey = this.getCellKey(agent.mesh.position);

        if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, new Set());
        }

        this.grid.get(cellKey).add(agent);
        this.agentCells.set(agent, cellKey);
    }

    /**
     * Remove an agent from the spatial grid
     * @param {Object} agent - Agent to remove
     */
    removeAgent(agent) {
        const cellKey = this.agentCells.get(agent);
        if (cellKey && this.grid.has(cellKey)) {
            this.grid.get(cellKey).delete(agent);

            // Clean up empty cells
            if (this.grid.get(cellKey).size === 0) {
                this.grid.delete(cellKey);
            }
        }

        this.agentCells.delete(agent);
    }

    /**
     * Update agent positions in the grid
     */
    update() {
        // Re-add all agents to update their positions
        const agents = Array.from(this.agentCells.keys());

        for (const agent of agents) {
            this.removeAgent(agent);
            this.addAgent(agent);
        }
    }

    /**
     * Get agents within range of a position
     * @param {Object} centerAgent - Center agent or position
     * @param {number} range - Search range
     * @returns {Set} - Set of nearby agents
     */
    getAgentsInRange(centerAgent, range) {
        const nearbyAgents = new Set();
        const centerPos = centerAgent.mesh ? centerAgent.mesh.position : centerAgent;

        // Calculate which cells to check
        const cellsToCheck = this.getCellsInRange(centerPos, range);

        for (const cellKey of cellsToCheck) {
            if (this.grid.has(cellKey)) {
                for (const agent of this.grid.get(cellKey)) {
                    if (agent !== centerAgent && agent.mesh && agent.mesh.position) {
                        const distance = BABYLON.Vector3.Distance(centerPos, agent.mesh.position);
                        if (distance <= range) {
                            nearbyAgents.add(agent);
                        }
                    }
                }
            }
        }

        return nearbyAgents;
    }

    /**
     * Get cell key for a position
     * @param {BABYLON.Vector3} position - World position
     * @returns {string} - Cell key
     */
    getCellKey(position) {
        const x = Math.floor(position.x / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${z}`;
    }

    /**
     * Get all cells within range of a position
     * @param {BABYLON.Vector3} position - Center position
     * @param {number} range - Search range
     * @returns {Array} - Array of cell keys
     */
    getCellsInRange(position, range) {
        const cells = [];
        const cellRange = Math.ceil(range / this.cellSize);
        const centerX = Math.floor(position.x / this.cellSize);
        const centerZ = Math.floor(position.z / this.cellSize);

        for (let x = centerX - cellRange; x <= centerX + cellRange; x++) {
            for (let z = centerZ - cellRange; z <= centerZ + cellRange; z++) {
                cells.push(`${x},${z}`);
            }
        }

        return cells;
    }

    /**
     * Dispose of the spatial grid
     */
    dispose() {
        this.grid.clear();
        this.agentCells.clear();
    }
}
