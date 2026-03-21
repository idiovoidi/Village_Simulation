/**
 * Entity class for the entity-component system
 * Entities are containers for components that provide functionality
 */

import { EntityError } from './ErrorHandling.js';

export class Entity {
    constructor(id, name = 'Entity') {
        this.id = id;
        this.name = name;
        this.components = new Map();
        this.tags = new Set();
        this.active = true;
        this.parent = null;
        this.children = new Set();
    }

    /**
   * Add a component to the entity
   * @param {Component} component - The component to add
   * @returns {Component} The added component
   */
    addComponent(component) {
        try {
            if (!component) {
                throw new EntityError('Cannot add null component');
            }

            // Store component by its type
            this.components.set(component.type, component);
            return component;
        } catch (error) {
            if (error instanceof EntityError) {
                throw error;
            }
            throw new EntityError(`Error adding component: ${error.message}`);
        }
    }

    /**
   * Remove a component from the entity
   * @param {string} componentType - The type of component to remove
   * @returns {boolean} Whether the component was removed
   */
    removeComponent(componentType) {
        try {
            const component = this.components.get(componentType);

            if (component) {
                // Call dispose on the component if it exists
                if (typeof component.dispose === 'function') {
                    component.dispose();
                }

                // Remove the component
                this.components.delete(componentType);
                return true;
            }

            return false;
        } catch (error) {
            throw new EntityError(`Error removing component: ${error.message}`);
        }
    }

    /**
   * Get a component by type
   * @param {string} componentType - The type of component to get
   * @returns {Component|null} The component, or null if not found
   */
    getComponent(componentType) {
        try {
            return this.components.get(componentType) || null;
        } catch (error) {
            throw new EntityError(`Error getting component: ${error.message}`);
        }
    }

    /**
   * Check if the entity has a component
   * @param {string} componentType - The type of component to check for
   * @returns {boolean} Whether the entity has the component
   */
    hasComponent(componentType) {
        try {
            return this.components.has(componentType);
        } catch (error) {
            throw new EntityError(`Error checking component: ${error.message}`);
        }
    }

    /**
   * Add a tag to the entity
   * @param {string} tag - The tag to add
   */
    addTag(tag) {
        try {
            this.tags.add(tag);
        } catch (error) {
            throw new EntityError(`Error adding tag: ${error.message}`);
        }
    }

    /**
   * Remove a tag from the entity
   * @param {string} tag - The tag to remove
   * @returns {boolean} Whether the tag was removed
   */
    removeTag(tag) {
        try {
            return this.tags.delete(tag);
        } catch (error) {
            throw new EntityError(`Error removing tag: ${error.message}`);
        }
    }

    /**
   * Check if the entity has a tag
   * @param {string} tag - The tag to check for
   * @returns {boolean} Whether the entity has the tag
   */
    hasTag(tag) {
        try {
            return this.tags.has(tag);
        } catch (error) {
            throw new EntityError(`Error checking tag: ${error.message}`);
        }
    }

    /**
   * Set the parent of this entity
   * @param {Entity|null} parent - The parent entity
   */
    setParent(parent) {
        try {
            // Remove from current parent if exists
            if (this.parent) {
                this.parent.children.delete(this);
            }

            this.parent = parent;

            // Add to new parent if exists
            if (parent) {
                parent.children.add(this);
            }
        } catch (error) {
            throw new EntityError(`Error setting parent: ${error.message}`);
        }
    }

    /**
   * Add a child entity
   * @param {Entity} child - The child entity
   */
    addChild(child) {
        try {
            if (!child) {
                throw new EntityError('Cannot add null child');
            }

            child.setParent(this);
        } catch (error) {
            if (error instanceof EntityError) {
                throw error;
            }
            throw new EntityError(`Error adding child: ${error.message}`);
        }
    }

    /**
   * Remove a child entity
   * @param {Entity} child - The child entity
   * @returns {boolean} Whether the child was removed
   */
    removeChild(child) {
        try {
            if (this.children.has(child)) {
                child.setParent(null);
                return true;
            }

            return false;
        } catch (error) {
            throw new EntityError(`Error removing child: ${error.message}`);
        }
    }

    /**
   * Set the active state of the entity
   * @param {boolean} active - Whether the entity is active
   */
    setActive(active) {
        try {
            this.active = active;

            // Update all children as well
            for (const child of this.children) {
                child.setActive(active);
            }
        } catch (error) {
            throw new EntityError(`Error setting active state: ${error.message}`);
        }
    }

    /**
   * Update all components of the entity
   * @param {number} deltaTime - Time since last update
   */
    update(deltaTime) {
        try {
            if (!this.active) return;

            // Update all components
            for (const component of this.components.values()) {
                if (typeof component.update === 'function') {
                    component.update(deltaTime);
                }
            }

            // Update all children
            for (const child of this.children) {
                child.update(deltaTime);
            }
        } catch (error) {
            throw new EntityError(`Error updating entity: ${error.message}`);
        }
    }

    /**
   * Dispose of the entity and all its components
   */
    dispose() {
        try {
            // Remove all children
            for (const child of [...this.children]) {
                this.removeChild(child);
            }

            // Dispose all components
            for (const component of this.components.values()) {
                if (typeof component.dispose === 'function') {
                    component.dispose();
                }
            }

            // Clear components and tags
            this.components.clear();
            this.tags.clear();

            // Remove from parent
            if (this.parent) {
                this.parent.children.delete(this);
            }

            this.active = false;
        } catch (error) {
            throw new EntityError(`Error disposing entity: ${error.message}`);
        }
    }
}
