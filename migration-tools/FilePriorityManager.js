/**
 * File Priority Manager for TypeScript Migration
 * 
 * Implements file selection algorithm prioritizing core utilities
 * and dependency-aware conversion ordering.
 * 
 * Requirements: 3.1
 */

import { MigrationPhase, MigrationStatus } from './MigrationOrchestrator.js';

/**
 * Priority scoring factors
 */
export const PriorityFactors = {
  PHASE_WEIGHT: 1000,      // Phase priority has highest weight
  DEPENDENCY_WEIGHT: 100,   // Files with fewer dependencies get priority
  DEPENDENT_WEIGHT: 10,     // Files with more dependents get priority
  COMPLEXITY_WEIGHT: 1      // Simpler files get slight priority
};

/**
 * File complexity estimation based on file characteristics
 */
export class FileComplexityAnalyzer {
  /**
   * Estimate file complexity based on various factors
   */
  static async estimateComplexity(filePath, fileContent = null) {
    try {
      const fs = await import('fs/promises');
      const content = fileContent || await fs.readFile(filePath, 'utf-8');
      
      let complexity = 0;
      
      // Line count factor
      const lineCount = content.split('\n').length;
      complexity += Math.min(lineCount / 10, 50); // Cap at 50 points
      
      // Function count factor
      const functionMatches = content.match(/function\s+\w+|=>\s*{|class\s+\w+/g) || [];
      complexity += functionMatches.length * 2;
      
      // Import complexity
      const importMatches = content.match(/import\s+.*?from/g) || [];
      complexity += importMatches.length;
      
      // Babylon.js/Havok specific complexity
      const babylonMatches = content.match(/BABYLON\.|HK\.|scene\.|engine\.|physics\./g) || [];
      complexity += babylonMatches.length * 0.5;
      
      // Control flow complexity
      const controlFlowMatches = content.match(/if\s*\(|for\s*\(|while\s*\(|switch\s*\(/g) || [];
      complexity += controlFlowMatches.length * 0.5;
      
      return Math.round(complexity);
    } catch (error) {
      // Default complexity if analysis fails
      return 10;
    }
  }
}

/**
 * Manages file conversion priority and ordering
 */
export class FilePriorityManager {
  constructor(migrationOrchestrator) {
    this.orchestrator = migrationOrchestrator;
    
    // Phase priority mapping (lower number = higher priority)
    this.phasePriorities = {
      [MigrationPhase.CORE_UTILITIES]: 1,
      [MigrationPhase.INFRASTRUCTURE]: 2,
      [MigrationPhase.SYSTEMS]: 3,
      [MigrationPhase.AGENTS]: 4
    };
  }

  /**
   * Calculate priority score for a file
   * Lower score = higher priority
   */
  async calculatePriorityScore(filePath, fileData) {
    let score = 0;
    
    // Phase priority (most important factor)
    const phasePriority = this.phasePriorities[fileData.phase] || 999;
    score += phasePriority * PriorityFactors.PHASE_WEIGHT;
    
    // Dependency count (fewer dependencies = higher priority)
    score += fileData.dependencies.length * PriorityFactors.DEPENDENCY_WEIGHT;
    
    // Dependent count (more dependents = higher priority, so subtract)
    score -= fileData.dependents.length * PriorityFactors.DEPENDENT_WEIGHT;
    
    // File complexity (simpler files = higher priority)
    try {
      const complexity = await FileComplexityAnalyzer.estimateComplexity(filePath);
      score += complexity * PriorityFactors.COMPLEXITY_WEIGHT;
    } catch {
      // Use default complexity if analysis fails
      score += 10 * PriorityFactors.COMPLEXITY_WEIGHT;
    }
    
    return score;
  }

  /**
   * Get files ready for conversion in priority order
   */
  async getConversionQueue(maxFiles = null) {
    const readyFiles = this.orchestrator.getFilesReadyForConversion();
    const prioritizedFiles = [];
    
    // Calculate priority scores for all ready files
    for (const fileInfo of readyFiles) {
      const fileData = this.orchestrator.migrationLog.get(fileInfo.path);
      if (!fileData) continue;
      
      const priorityScore = await this.calculatePriorityScore(fileInfo.path, fileData);
      
      prioritizedFiles.push({
        ...fileInfo,
        priorityScore,
        complexity: await FileComplexityAnalyzer.estimateComplexity(fileInfo.path)
      });
    }
    
    // Sort by priority score (lower = higher priority)
    prioritizedFiles.sort((a, b) => a.priorityScore - b.priorityScore);
    
    // Limit results if requested
    if (maxFiles && maxFiles > 0) {
      return prioritizedFiles.slice(0, maxFiles);
    }
    
    return prioritizedFiles;
  }

  /**
   * Get next batch of files for conversion by phase
   */
  async getNextBatchByPhase(phase, batchSize = 5) {
    const allReady = await this.getConversionQueue();
    const phaseFiles = allReady.filter(file => file.phase === phase);
    
    return phaseFiles.slice(0, batchSize);
  }

  /**
   * Get conversion order for entire project
   */
  async getFullConversionPlan() {
    const plan = {
      phases: [],
      totalFiles: 0,
      estimatedComplexity: 0
    };
    
    // Process each phase in order
    for (const phase of Object.values(MigrationPhase)) {
      const phaseFiles = [];
      const phaseData = {
        phase,
        priority: this.phasePriorities[phase],
        files: phaseFiles,
        fileCount: 0,
        totalComplexity: 0
      };
      
      // Get all files for this phase
      for (const [filePath, fileData] of this.orchestrator.migrationLog.entries()) {
        if (fileData.phase === phase && fileData.status === MigrationStatus.PENDING) {
          const priorityScore = await this.calculatePriorityScore(filePath, fileData);
          const complexity = await FileComplexityAnalyzer.estimateComplexity(filePath);
          
          phaseFiles.push({
            path: filePath,
            relativePath: filePath.replace(this.orchestrator.projectRoot, ''),
            priorityScore,
            complexity,
            dependencies: fileData.dependencies.length,
            dependents: fileData.dependents.length
          });
          
          phaseData.totalComplexity += complexity;
        }
      }
      
      // Sort files within phase by priority
      phaseFiles.sort((a, b) => a.priorityScore - b.priorityScore);
      
      phaseData.fileCount = phaseFiles.length;
      plan.phases.push(phaseData);
      plan.totalFiles += phaseData.fileCount;
      plan.estimatedComplexity += phaseData.totalComplexity;
    }
    
    return plan;
  }

  /**
   * Validate conversion order respects dependencies
   */
  validateConversionOrder(orderedFiles) {
    const convertedFiles = new Set();
    const violations = [];
    
    for (const fileInfo of orderedFiles) {
      const fileData = this.orchestrator.migrationLog.get(fileInfo.path);
      if (!fileData) continue;
      
      // Check if all dependencies have been converted
      for (const dependency of fileData.dependencies) {
        if (!convertedFiles.has(dependency)) {
          const depData = this.orchestrator.migrationLog.get(dependency);
          // Only flag as violation if dependency is also being migrated
          if (depData && depData.status === MigrationStatus.PENDING) {
            violations.push({
              file: fileInfo.path,
              dependency: dependency,
              message: `File ${fileInfo.path} depends on ${dependency} which appears later in conversion order`
            });
          }
        }
      }
      
      convertedFiles.add(fileInfo.path);
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Get files that can be converted in parallel (no interdependencies)
   */
  async getParallelConversionBatches(maxBatchSize = 3) {
    const readyFiles = await this.getConversionQueue();
    const batches = [];
    const processed = new Set();
    
    while (processed.size < readyFiles.length) {
      const batch = [];
      const batchDependencies = new Set();
      
      for (const fileInfo of readyFiles) {
        if (processed.has(fileInfo.path)) continue;
        if (batch.length >= maxBatchSize) break;
        
        const fileData = this.orchestrator.migrationLog.get(fileInfo.path);
        if (!fileData) continue;
        
        // Check if this file conflicts with any file already in the batch
        const hasConflict = fileData.dependencies.some(dep => batchDependencies.has(dep)) ||
                           fileData.dependents.some(dep => batchDependencies.has(dep));
        
        if (!hasConflict) {
          batch.push(fileInfo);
          batchDependencies.add(fileInfo.path);
          processed.add(fileInfo.path);
        }
      }
      
      if (batch.length > 0) {
        batches.push(batch);
      } else {
        // No more files can be processed in parallel, break to avoid infinite loop
        break;
      }
    }
    
    return batches;
  }

  /**
   * Get priority statistics for analysis
   */
  async getPriorityStatistics() {
    const stats = {
      byPhase: {},
      complexityDistribution: {
        simple: 0,    // complexity < 20
        moderate: 0,  // complexity 20-50
        complex: 0    // complexity > 50
      },
      dependencyStats: {
        noDependencies: 0,
        lowDependencies: 0,  // 1-3 dependencies
        highDependencies: 0  // 4+ dependencies
      }
    };
    
    // Initialize phase stats
    for (const phase of Object.values(MigrationPhase)) {
      stats.byPhase[phase] = {
        fileCount: 0,
        avgComplexity: 0,
        avgDependencies: 0,
        totalComplexity: 0,
        totalDependencies: 0
      };
    }
    
    // Analyze all files
    for (const [filePath, fileData] of this.orchestrator.migrationLog.entries()) {
      if (fileData.status !== MigrationStatus.PENDING) continue;
      
      const phaseStats = stats.byPhase[fileData.phase];
      const complexity = await FileComplexityAnalyzer.estimateComplexity(filePath);
      const dependencyCount = fileData.dependencies.length;
      
      // Update phase stats
      phaseStats.fileCount++;
      phaseStats.totalComplexity += complexity;
      phaseStats.totalDependencies += dependencyCount;
      
      // Update complexity distribution
      if (complexity < 20) {
        stats.complexityDistribution.simple++;
      } else if (complexity <= 50) {
        stats.complexityDistribution.moderate++;
      } else {
        stats.complexityDistribution.complex++;
      }
      
      // Update dependency stats
      if (dependencyCount === 0) {
        stats.dependencyStats.noDependencies++;
      } else if (dependencyCount <= 3) {
        stats.dependencyStats.lowDependencies++;
      } else {
        stats.dependencyStats.highDependencies++;
      }
    }
    
    // Calculate averages
    for (const phaseStats of Object.values(stats.byPhase)) {
      if (phaseStats.fileCount > 0) {
        phaseStats.avgComplexity = Math.round(phaseStats.totalComplexity / phaseStats.fileCount);
        phaseStats.avgDependencies = Math.round(phaseStats.totalDependencies / phaseStats.fileCount);
      }
    }
    
    return stats;
  }
}