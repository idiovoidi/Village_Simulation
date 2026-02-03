/**
 * HMR-like Client for ES Modules
 * Provides hot module replacement without a bundler
 */

class HMRClient {
    constructor() {
        this.modules = new Map();
        this.eventSource = null;
        this.isReloading = false;
    }

    /**
     * Connect to the HMR server
     */
    connect() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return; // Only enable on localhost
        }

        this.eventSource = new EventSource('/hot-reload');
        
        this.eventSource.onopen = () => {
            console.log('🔥 HMR connected');
        };
        
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'reload') {
                this.handleReload(data.file);
            } else if (data.type === 'connected') {
                console.log('🔥 HMR ready');
            }
        };
        
        this.eventSource.onerror = () => {
            console.log('🔌 HMR disconnected, reconnecting...');
            this.eventSource.close();
            setTimeout(() => this.connect(), 1000);
        };
    }

    /**
     * Handle file reload with smart detection
     */
    handleReload(changedFile) {
        if (this.isReloading) return;
        
        console.log(`📝 File changed: ${changedFile || 'unknown'}`);
        
        // Determine reload strategy based on file type
        if (this.shouldFullReload(changedFile)) {
            console.log('🔄 Full page reload required');
            window.location.reload();
        } else {
            console.log('⚡ Attempting hot module reload');
            this.hotReloadModule(changedFile);
        }
    }

    /**
     * Determine if full reload is needed
     */
    shouldFullReload(file) {
        if (!file) return true;
        
        // Full reload for these files
        const fullReloadPatterns = [
            'index.html',
            'Havokimport.js',
            'NewVillageEngine.js',
            'SimulationSetup.js',
            'BowlCreator.js',
            'WaterSimulation.js'
        ];
        
        return fullReloadPatterns.some(pattern => file.includes(pattern));
    }

    /**
     * Attempt to hot reload a module
     */
    async hotReloadModule(file) {
        try {
            // For now, we'll do a smart full reload
            // True HMR would require module registry and state preservation
            
            // Add cache busting
            const timestamp = Date.now();
            console.log(`⚡ Reloading with cache bust: ${timestamp}`);
            
            // Preserve some state before reload
            this.preserveState();
            
            // Reload
            window.location.reload();
            
        } catch (error) {
            console.error('❌ Hot reload failed:', error);
            console.log('🔄 Falling back to full reload');
            window.location.reload();
        }
    }

    /**
     * Preserve state before reload (for future enhancement)
     */
    preserveState() {
        try {
            // Store camera position, selected entities, etc.
            const state = {
                timestamp: Date.now(),
                // Add state preservation here
            };
            sessionStorage.setItem('hmr_state', JSON.stringify(state));
        } catch (error) {
            console.warn('Could not preserve state:', error);
        }
    }

    /**
     * Restore state after reload (for future enhancement)
     */
    restoreState() {
        try {
            const stateStr = sessionStorage.getItem('hmr_state');
            if (stateStr) {
                const state = JSON.parse(stateStr);
                console.log('🔄 Restoring state from:', new Date(state.timestamp));
                // Restore state here
                sessionStorage.removeItem('hmr_state');
            }
        } catch (error) {
            console.warn('Could not restore state:', error);
        }
    }
}

// Export singleton
export const hmrClient = new HMRClient();

// Auto-connect
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hmrClient.connect());
} else {
    hmrClient.connect();
}
