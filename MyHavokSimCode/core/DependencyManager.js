/**
 * DependencyManager - Utility class for managing dependency updates with backup and rollback capabilities
 * Handles package.json parsing, version comparison, and automated rollback functionality
 */
class DependencyManager {
    constructor() {
        this.backupDir = '.dependency-backups';
        this.backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.validationResults = [];
    }

    /**
     * Create backup of current package.json and pnpm-lock.yaml
     * @returns {Promise<boolean>} Success status
     */
    async createBackup() {
        try {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');

            // Create backup directory if it doesn't exist
            const backupPath = path.join(this.backupDir, this.backupTimestamp);
            await fs.mkdir(backupPath, { recursive: true });

            // Backup package.json
            try {
                const packageJson = await fs.readFile('package.json', 'utf8');
                await fs.writeFile(
                    path.join(backupPath, 'package.json'),
                    packageJson
                );
                console.log('✓ Backed up package.json');
            } catch (error) {
                console.warn('⚠ Could not backup package.json:', error.message);
            }

            // Backup pnpm-lock.yaml
            try {
                const lockFile = await fs.readFile('pnpm-lock.yaml', 'utf8');
                await fs.writeFile(
                    path.join(backupPath, 'pnpm-lock.yaml'),
                    lockFile
                );
                console.log('✓ Backed up pnpm-lock.yaml');
            } catch (error) {
                console.warn('⚠ Could not backup pnpm-lock.yaml:', error.message);
            }

            // Create backup metadata
            const metadata = {
                timestamp: this.backupTimestamp,
                createdAt: new Date().toISOString(),
                originalVersions: await this.getCurrentVersions()
            };

            await fs.writeFile(
                path.join(backupPath, 'backup-metadata.json'),
                JSON.stringify(metadata, null, 2)
            );

            console.log(`✓ Backup created at: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('✗ Failed to create backup:', error);
            return false;
        }
    }

    /**
     * Parse package.json and extract current dependency versions
     * @returns {Promise<Object>} Current dependency versions
     */
    async getCurrentVersions() {
        try {
            const fs = await import('fs').then(m => m.promises);
            const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));

            return {
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {}
            };
        } catch (error) {
            console.error('✗ Failed to parse package.json:', error);
            return { dependencies: {}, devDependencies: {} };
        }
    }

    /**
     * Compare version strings using semantic versioning
     * @param {string} version1 - First version to compare
     * @param {string} version2 - Second version to compare
     * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
     */
    compareVersions(version1, version2) {
        // Remove version prefixes (^, ~, etc.)
        const cleanVersion1 = version1.replace(/^[\^~>=<]/, '');
        const cleanVersion2 = version2.replace(/^[\^~>=<]/, '');

        const parts1 = cleanVersion1.split('.').map(Number);
        const parts2 = cleanVersion2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;

            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }

        return 0;
    }

    /**
     * Validate dependency compatibility
     * @param {Object} newVersions - New dependency versions to validate
     * @returns {Promise<Object>} Validation results
     */
    async validateDependencies(newVersions) {
        const results = {
            valid: true,
            warnings: [],
            errors: [],
            compatibilityIssues: []
        };

        try {
            const currentVersions = await this.getCurrentVersions();

            // Check for major version changes in Babylon.js packages
            const babylonPackages = [
                '@babylonjs/core',
                '@babylonjs/gui',
                '@babylonjs/inspector',
                '@babylonjs/loaders',
                '@babylonjs/materials'
            ];

            for (const pkg of babylonPackages) {
                const currentVersion = currentVersions.dependencies[pkg];
                const newVersion = newVersions.dependencies?.[pkg];

                if (currentVersion && newVersion) {
                    const comparison = this.compareVersions(currentVersion, newVersion);

                    if (comparison < 0) {
                        // Check for major version changes
                        const currentMajor = parseInt(currentVersion.replace(/^[\^~>=<]/, '').split('.')[0]);
                        const newMajor = parseInt(newVersion.replace(/^[\^~>=<]/, '').split('.')[0]);

                        if (newMajor > currentMajor) {
                            results.warnings.push(
                                `Major version upgrade for ${pkg}: ${currentVersion} → ${newVersion}. `
                                + `This may introduce breaking changes.`
                            );
                        }
                    }
                }
            }

            // Validate peer dependencies
            if (newVersions.dependencies?.['@babylonjs/havok']) {
                const havokVersion = newVersions.dependencies['@babylonjs/havok'];
                results.warnings.push(
                    `Havok physics version: ${havokVersion}. `
                    + `Ensure compatibility with updated Babylon.js core.`
                );
            }

            this.validationResults = results;
            return results;
        } catch (error) {
            results.valid = false;
            results.errors.push(`Validation failed: ${error.message}`);
            return results;
        }
    }

    /**
     * Rollback to previous dependency versions using backup
     * @param {string} backupTimestamp - Timestamp of backup to restore (optional, uses latest if not provided)
     * @returns {Promise<boolean>} Success status
     */
    async rollback(backupTimestamp = null) {
        try {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');

            // Find backup to restore
            let backupPath;
            if (backupTimestamp) {
                backupPath = path.join(this.backupDir, backupTimestamp);
            } else {
                // Find latest backup
                const backups = await fs.readdir(this.backupDir);
                const latestBackup = backups.sort().reverse()[0];
                if (!latestBackup) {
                    throw new Error('No backups found');
                }
                backupPath = path.join(this.backupDir, latestBackup);
            }

            // Verify backup exists
            await fs.access(backupPath);

            // Restore package.json
            try {
                const packageJsonBackup = await fs.readFile(
                    path.join(backupPath, 'package.json'),
                    'utf8'
                );
                await fs.writeFile('package.json', packageJsonBackup);
                console.log('✓ Restored package.json');
            } catch (error) {
                console.warn('⚠ Could not restore package.json:', error.message);
            }

            // Restore pnpm-lock.yaml
            try {
                const lockFileBackup = await fs.readFile(
                    path.join(backupPath, 'pnpm-lock.yaml'),
                    'utf8'
                );
                await fs.writeFile('pnpm-lock.yaml', lockFileBackup);
                console.log('✓ Restored pnpm-lock.yaml');
            } catch (error) {
                console.warn('⚠ Could not restore pnpm-lock.yaml:', error.message);
            }

            console.log(`✓ Rollback completed from backup: ${backupPath}`);
            console.log('⚠ Run "pnpm install" to restore node_modules');

            return true;
        } catch (error) {
            console.error('✗ Rollback failed:', error);
            return false;
        }
    }

    /**
     * List available backups
     * @returns {Promise<Array>} List of backup information
     */
    async listBackups() {
        try {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');

            const backups = await fs.readdir(this.backupDir);
            const backupInfo = [];

            for (const backup of backups) {
                try {
                    const metadataPath = path.join(this.backupDir, backup, 'backup-metadata.json');
                    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
                    backupInfo.push({
                        timestamp: backup,
                        createdAt: metadata.createdAt,
                        originalVersions: metadata.originalVersions
                    });
                } catch (error) {
                    // Skip backups without metadata
                    backupInfo.push({
                        timestamp: backup,
                        createdAt: 'Unknown',
                        originalVersions: {}
                    });
                }
            }

            return backupInfo.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        } catch (error) {
            console.error('✗ Failed to list backups:', error);
            return [];
        }
    }

    /**
     * Update package.json with new dependency versions
     * @param {Object} newVersions - New dependency versions
     * @returns {Promise<boolean>} Success status
     */
    async updatePackageJson(newVersions) {
        try {
            const fs = await import('fs').then(m => m.promises);
            const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));

            // Update dependencies
            if (newVersions.dependencies) {
                packageJson.dependencies = {
                    ...packageJson.dependencies,
                    ...newVersions.dependencies
                };
            }

            // Update devDependencies
            if (newVersions.devDependencies) {
                packageJson.devDependencies = {
                    ...packageJson.devDependencies,
                    ...newVersions.devDependencies
                };
            }

            await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
            console.log('✓ Updated package.json');

            return true;
        } catch (error) {
            console.error('✗ Failed to update package.json:', error);
            return false;
        }
    }

    /**
     * Get validation results from last validation
     * @returns {Object} Last validation results
     */
    getLastValidationResults() {
        return this.validationResults;
    }
}

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DependencyManager;
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.DependencyManager = DependencyManager;
}
