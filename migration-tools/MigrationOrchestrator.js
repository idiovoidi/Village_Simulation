/**
 * Migration Orchestrator for ESLint and TypeScript Migration
 * 
 * Manages the incremental conversion process from JavaScript to TypeScript,
 * tracks progress, analyzes dependencies, and provides status reporting.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration status enumeration
 */
export const MigrationStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress', 
  CONVERTED: 'converted',
  FAILED: 'failed'
};

/**
 * Migration phase enumeration
 */
export const MigrationPhase = {
  CORE_UTILITIES: 'coreUtilities',
  INFRASTRUCTURE: 'infrastructure', 
  SYSTEMS: 'systems',
  AGENTS: 'agents'
};

/**
 * Main orchestrator class for managing TypeScript migration
 */
export class MigrationOrchestrator {
  constructor(projectRoot = process.cwd(), migrationConfig = {}) {
    this.projectRoot = projectRoot;
    this.config = {
      migrationLogFile: path.join(projectRoot, 'migration-tools', 'migration-log.json'),
      progressFile: path.join(projectRoot, 'migration-tools', 'migration-progress.json'),
      sourceDir: path.join(projectRoot, 'MyHavokSimCode'),
      assetsDir: path.join(projectRoot, 'assets'),
      ...migrationConfig
    };
    
    // In-memory tracking
    this.migrationLog = new Map();
    this.dependencyGraph = new Map();
    this.progressData = null;
    
    // Phase definitions with priority ordering
    this.phaseDefinitions = {
      [MigrationPhase.CORE_UTILITIES]: {
        priority: 1,
        directories: ['MyHavokSimCode/core', 'MyHavokSimCode/Utilities'],
        description: 'Core utilities and infrastructure'
      },
      [MigrationPhase.INFRASTRUCTURE]: {
        priority: 2,
        directories: ['assets'],
        files: ['server.js'],
        description: 'Asset management and build infrastructure'
      },
      [MigrationPhase.SYSTEMS]: {
        priority: 3,
        directories: [
          'MyHavokSimCode/systems',
          'MyHavokSimCode/LevelSystem', 
          'MyHavokSimCode/Performance',
          'MyHavokSimCode/Environment',
          'MyHavokSimCode/Navigation',
          'MyHavokSimCode/UI',
          'MyHavokSimCode/Village',
          'MyHavokSimCode/Effects'
        ],
        description: 'System-level components'
      },
      [MigrationPhase.AGENTS]: {
        priority: 4,
        directories: ['MyHavokSimCode/Agents'],
        description: 'Complex agent behavioral systems'
      }
    };
  }

  /**
   * Initialize the migration orchestrator
   * Creates necessary directories and loads existing progress
   */
  async initialize() {
    try {
      // Ensure migration tools directory exists
      const migrationToolsDir = path.dirname(this.config.migrationLogFile);
      await fs.mkdir(migrationToolsDir, { recursive: true });
      
      // Load existing progress if available
      await this.loadProgress();
      
      // Scan project files and build dependency graph
      await this.scanProjectFiles();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize MigrationOrchestrator:', error);
      return false;
    }
  }

  /**
   * Scan project files and build initial migration tracking data
   */
  async scanProjectFiles() {
    const allFiles = await this.getAllJavaScriptFiles();
    
    for (const filePath of allFiles) {
      if (!this.migrationLog.has(filePath)) {
        const phase = this.determineFilePhase(filePath);
        const dependencies = await this.analyzeDependencies(filePath);
        
        this.migrationLog.set(filePath, {
          path: filePath,
          status: MigrationStatus.PENDING,
          phase: phase,
          dependencies: dependencies,
          dependents: [],
          typeErrors: 0,
          lastModified: null,
          conversionAttempts: 0
        });
      }
    }
    
    // Build reverse dependency mapping
    this.buildDependentMapping();
  }

  /**
   * Get all JavaScript files in the project
   */
  async getAllJavaScriptFiles() {
    const files = [];
    
    // Scan MyHavokSimCode directory
    await this.scanDirectory(this.config.sourceDir, files, '.js');
    
    // Scan assets directory for AssetManager.js
    await this.scanDirectory(this.config.assetsDir, files, '.js');
    
    // Add specific root files
    const rootFiles = ['server.js'];
    for (const file of rootFiles) {
      const fullPath = path.join(this.projectRoot, file);
      try {
        await fs.access(fullPath);
        files.push(fullPath);
      } catch {
        // File doesn't exist, skip
      }
    }
    
    return files;
  }

  /**
   * Recursively scan directory for JavaScript files
   */
  async scanDirectory(dirPath, files, extension) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, files, extension);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read, skip
    }
  }

  /**
   * Determine which migration phase a file belongs to
   */
  determineFilePhase(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    for (const [phase, definition] of Object.entries(this.phaseDefinitions)) {
      // Check directories
      if (definition.directories) {
        for (const dir of definition.directories) {
          if (relativePath.startsWith(dir)) {
            return phase;
          }
        }
      }
      
      // Check specific files
      if (definition.files) {
        for (const file of definition.files) {
          if (relativePath === file) {
            return phase;
          }
        }
      }
    }
    
    // Default to systems phase for unclassified files
    return MigrationPhase.SYSTEMS;
  }

  /**
   * Analyze file dependencies by parsing import statements
   */
  async analyzeDependencies(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const dependencies = [];
      
      // Match ES6 import statements
      const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Resolve relative imports to absolute paths
        if (importPath.startsWith('.')) {
          const resolvedPath = path.resolve(path.dirname(filePath), importPath);
          
          // Try .js extension if no extension provided
          let actualPath = resolvedPath;
          if (!path.extname(resolvedPath)) {
            actualPath = resolvedPath + '.js';
          }
          
          try {
            await fs.access(actualPath);
            dependencies.push(actualPath);
          } catch {
            // File doesn't exist, might be external dependency
          }
        }
      }
      
      return dependencies;
    } catch (error) {
      console.warn(`Failed to analyze dependencies for ${filePath}:`, error.message);
      return [];
    }
  }

  /**
   * Build reverse dependency mapping (dependents)
   */
  buildDependentMapping() {
    // Clear existing dependents
    for (const fileData of this.migrationLog.values()) {
      fileData.dependents = [];
    }
    
    // Build dependents list
    for (const [filePath, fileData] of this.migrationLog.entries()) {
      for (const dependency of fileData.dependencies) {
        const dependencyData = this.migrationLog.get(dependency);
        if (dependencyData) {
          dependencyData.dependents.push(filePath);
        }
      }
    }
  }

  /**
   * Get migration progress report
   */
  generateProgressReport() {
    const report = {
      timestamp: new Date().toISOString(),
      phases: {},
      overallProgress: {
        totalFiles: this.migrationLog.size,
        convertedFiles: 0,
        inProgressFiles: 0,
        failedFiles: 0,
        percentComplete: 0
      }
    };
    
    // Initialize phase data
    for (const phase of Object.values(MigrationPhase)) {
      report.phases[phase] = {
        totalFiles: 0,
        convertedFiles: 0,
        inProgressFiles: 0,
        failedFiles: 0,
        files: []
      };
    }
    
    // Aggregate data by phase
    for (const [filePath, fileData] of this.migrationLog.entries()) {
      const phase = fileData.phase;
      const phaseData = report.phases[phase];
      
      phaseData.totalFiles++;
      phaseData.files.push({
        path: path.relative(this.projectRoot, filePath),
        status: fileData.status,
        typeErrors: fileData.typeErrors,
        dependencies: fileData.dependencies.map(dep => path.relative(this.projectRoot, dep)),
        dependents: fileData.dependents.map(dep => path.relative(this.projectRoot, dep))
      });
      
      // Count by status
      switch (fileData.status) {
        case MigrationStatus.CONVERTED:
          phaseData.convertedFiles++;
          report.overallProgress.convertedFiles++;
          break;
        case MigrationStatus.IN_PROGRESS:
          phaseData.inProgressFiles++;
          report.overallProgress.inProgressFiles++;
          break;
        case MigrationStatus.FAILED:
          phaseData.failedFiles++;
          report.overallProgress.failedFiles++;
          break;
      }
    }
    
    // Calculate percentages
    if (report.overallProgress.totalFiles > 0) {
      report.overallProgress.percentComplete = 
        Math.round((report.overallProgress.convertedFiles / report.overallProgress.totalFiles) * 100);
    }
    
    return report;
  }

  /**
   * Update file migration status
   */
  updateFileStatus(filePath, status, additionalData = {}) {
    const fileData = this.migrationLog.get(filePath);
    if (!fileData) {
      throw new Error(`File not found in migration log: ${filePath}`);
    }
    
    fileData.status = status;
    fileData.lastModified = new Date().toISOString();
    
    // Update additional data
    Object.assign(fileData, additionalData);
    
    return fileData;
  }

  /**
   * Save progress to disk
   */
  async saveProgress() {
    try {
      const progressReport = this.generateProgressReport();
      
      // Save progress report
      await fs.writeFile(
        this.config.progressFile,
        JSON.stringify(progressReport, null, 2),
        'utf-8'
      );
      
      // Save detailed migration log
      const logData = Object.fromEntries(
        Array.from(this.migrationLog.entries()).map(([path, data]) => [
          path.replace(this.projectRoot, ''), // Use relative paths
          data
        ])
      );
      
      await fs.writeFile(
        this.config.migrationLogFile,
        JSON.stringify(logData, null, 2),
        'utf-8'
      );
      
      return true;
    } catch (error) {
      console.error('Failed to save migration progress:', error);
      return false;
    }
  }

  /**
   * Load existing progress from disk
   */
  async loadProgress() {
    try {
      // Load migration log
      try {
        const logContent = await fs.readFile(this.config.migrationLogFile, 'utf-8');
        const logData = JSON.parse(logContent);
        
        this.migrationLog.clear();
        for (const [relativePath, data] of Object.entries(logData)) {
          const fullPath = path.join(this.projectRoot, relativePath);
          this.migrationLog.set(fullPath, data);
        }
      } catch {
        // No existing log file, start fresh
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load migration progress:', error);
      return false;
    }
  }

  /**
   * Get files ready for conversion based on dependency order
   */
  getFilesReadyForConversion(phase = null) {
    const readyFiles = [];
    
    for (const [filePath, fileData] of this.migrationLog.entries()) {
      // Filter by phase if specified
      if (phase && fileData.phase !== phase) {
        continue;
      }
      
      // Only consider pending files
      if (fileData.status !== MigrationStatus.PENDING) {
        continue;
      }
      
      // Check if all dependencies are converted
      const allDependenciesConverted = fileData.dependencies.every(depPath => {
        const depData = this.migrationLog.get(depPath);
        return !depData || depData.status === MigrationStatus.CONVERTED;
      });
      
      if (allDependenciesConverted) {
        readyFiles.push({
          path: filePath,
          phase: fileData.phase,
          priority: this.phaseDefinitions[fileData.phase]?.priority || 999,
          dependencyCount: fileData.dependencies.length,
          dependentCount: fileData.dependents.length
        });
      }
    }
    
    // Sort by priority, then by dependency count (fewer dependencies first)
    readyFiles.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.dependencyCount - b.dependencyCount;
    });
    
    return readyFiles;
  }

  /**
   * Get migration statistics
   */
  getStatistics() {
    const stats = {
      totalFiles: this.migrationLog.size,
      byStatus: {},
      byPhase: {},
      readyForConversion: this.getFilesReadyForConversion().length
    };
    
    // Initialize counters
    for (const status of Object.values(MigrationStatus)) {
      stats.byStatus[status] = 0;
    }
    
    for (const phase of Object.values(MigrationPhase)) {
      stats.byPhase[phase] = 0;
    }
    
    // Count files
    for (const fileData of this.migrationLog.values()) {
      stats.byStatus[fileData.status]++;
      stats.byPhase[fileData.phase]++;
    }
    
    return stats;
  }
}