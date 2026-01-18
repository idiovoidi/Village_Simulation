/**
 * Property-Based Test: Migration Progress Tracking
 * 
 * Feature: eslint-typescript-migration, Property 19: Migration Progress Tracking
 * 
 * Property: For any migration operation, the system should maintain accurate records 
 * of file conversion status, dependency relationships, and overall progress percentage
 * 
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationOrchestrator, MigrationPhase, MigrationStatus } from '../MigrationOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Property 19: Migration Progress Tracking', () => {
  let tempDir;
  let orchestrator;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = path.join(__dirname, 'temp-progress-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    orchestrator = new MigrationOrchestrator(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp directory:', error.message);
      }
    }
  });

  /**
   * Generator for file status updates
   */
  const statusUpdateArbitrary = fc.record({
    filePath: fc.string({ minLength: 5, maxLength: 50 }),
    status: fc.constantFrom(...Object.values(MigrationStatus)),
    typeErrors: fc.integer({ min: 0, max: 20 }),
    conversionAttempts: fc.integer({ min: 0, max: 5 })
  });

  /**
   * Generator for file structures with dependencies
   */
  const fileStructureArbitrary = fc.record({
    files: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        phase: fc.constantFrom(...Object.values(MigrationPhase)),
        dependencies: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })
      }),
      { minLength: 1, maxLength: 15 }
    )
  });

  /**
   * Create test file structure with dependencies
   */
  async function createTestFiles(structure) {
    const createdFiles = [];
    const fileMap = new Map();
    
    // First pass: create all files
    for (const fileInfo of structure.files) {
      const phaseDir = getPhaseDirectory(fileInfo.phase);
      const fullDir = path.join(tempDir, phaseDir);
      await fs.mkdir(fullDir, { recursive: true });
      
      const filePath = path.join(fullDir, `${fileInfo.name}.js`);
      fileMap.set(fileInfo.name, filePath);
      
      let content = `// File: ${fileInfo.name}\n`;
      content += `export class ${fileInfo.name} {}\n`;
      
      await fs.writeFile(filePath, content);
      createdFiles.push({ ...fileInfo, path: filePath });
    }
    
    // Second pass: add dependency imports
    for (const fileInfo of structure.files) {
      if (fileInfo.dependencies.length > 0) {
        const filePath = fileMap.get(fileInfo.name);
        if (filePath) {
          let content = await fs.readFile(filePath, 'utf-8');
          
          for (const dep of fileInfo.dependencies) {
            const depPath = fileMap.get(dep);
            if (depPath) {
              const relativePath = path.relative(path.dirname(filePath), depPath).replace(/\\/g, '/');
              const importPath = relativePath.endsWith('.js') ? relativePath.slice(0, -3) : relativePath;
              content = `import { ${dep} } from '${importPath}.js';\n` + content;
            }
          }
          
          await fs.writeFile(filePath, content);
        }
      }
    }
    
    return createdFiles;
  }

  /**
   * Get directory path for a migration phase
   */
  function getPhaseDirectory(phase) {
    switch (phase) {
      case MigrationPhase.CORE_UTILITIES:
        return 'MyHavokSimCode/core';
      case MigrationPhase.INFRASTRUCTURE:
        return 'assets';
      case MigrationPhase.SYSTEMS:
        return 'MyHavokSimCode/systems';
      case MigrationPhase.AGENTS:
        return 'MyHavokSimCode/Agents';
      default:
        return 'MyHavokSimCode/misc';
    }
  }

  test('Property 19: Progress tracking maintains accurate file conversion status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileStructureArbitrary,
        fc.array(statusUpdateArbitrary, { maxLength: 10 }),
        async (structure, statusUpdates) => {
          // Create test files
          const createdFiles = await createTestFiles(structure);
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Apply status updates to existing files
          const validUpdates = statusUpdates.filter(update => 
            createdFiles.some(file => file.path.includes(update.filePath.slice(0, 10)))
          );
          
          for (const update of validUpdates) {
            const matchingFile = createdFiles.find(file => 
              file.path.includes(update.filePath.slice(0, 10))
            );
            
            if (matchingFile) {
              orchestrator.updateFileStatus(matchingFile.path, update.status, {
                typeErrors: update.typeErrors,
                conversionAttempts: update.conversionAttempts
              });
            }
          }
          
          // Generate progress report
          const progressReport = orchestrator.generateProgressReport();
          
          // Verify progress report accuracy
          let totalFiles = 0;
          let convertedFiles = 0;
          let inProgressFiles = 0;
          let failedFiles = 0;
          
          for (const phaseData of Object.values(progressReport.phases)) {
            totalFiles += phaseData.totalFiles;
            convertedFiles += phaseData.convertedFiles;
            inProgressFiles += phaseData.inProgressFiles;
            failedFiles += phaseData.failedFiles;
          }
          
          // Verify totals match
          const totalsMatch = 
            progressReport.overallProgress.totalFiles === totalFiles &&
            progressReport.overallProgress.convertedFiles === convertedFiles &&
            progressReport.overallProgress.inProgressFiles === inProgressFiles &&
            progressReport.overallProgress.failedFiles === failedFiles;
          
          // Verify percentage calculation
          const expectedPercentage = totalFiles > 0 ? 
            Math.round((convertedFiles / totalFiles) * 100) : 0;
          const percentageCorrect = 
            progressReport.overallProgress.percentComplete === expectedPercentage;
          
          return totalsMatch && percentageCorrect;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 19: Dependency relationships are accurately tracked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileStructureArbitrary,
        async (structure) => {
          // Create test files with dependencies
          const createdFiles = await createTestFiles(structure);
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Verify dependency tracking
          for (const fileInfo of createdFiles) {
            const fileData = orchestrator.migrationLog.get(fileInfo.path);
            if (!fileData) continue;
            
            // Check that declared dependencies are tracked
            for (const expectedDep of fileInfo.dependencies) {
              const depFile = createdFiles.find(f => f.name === expectedDep);
              if (depFile) {
                const hasDependency = fileData.dependencies.includes(depFile.path);
                if (!hasDependency) {
                  return false;
                }
                
                // Check reverse dependency (dependent relationship)
                const depData = orchestrator.migrationLog.get(depFile.path);
                if (depData) {
                  const hasDependent = depData.dependents.includes(fileInfo.path);
                  if (!hasDependent) {
                    return false;
                  }
                }
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test('Property 19: Progress persistence maintains data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileStructureArbitrary,
        fc.array(statusUpdateArbitrary, { maxLength: 8 }),
        async (structure, statusUpdates) => {
          // Create test files
          const createdFiles = await createTestFiles(structure);
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Apply status updates
          const validUpdates = statusUpdates.filter(update => 
            createdFiles.some(file => file.path.includes(update.filePath.slice(0, 10)))
          );
          
          for (const update of validUpdates) {
            const matchingFile = createdFiles.find(file => 
              file.path.includes(update.filePath.slice(0, 10))
            );
            
            if (matchingFile) {
              orchestrator.updateFileStatus(matchingFile.path, update.status, {
                typeErrors: update.typeErrors,
                conversionAttempts: update.conversionAttempts
              });
            }
          }
          
          // Save progress
          const saveResult = await orchestrator.saveProgress();
          if (!saveResult) return false;
          
          // Create new orchestrator instance and load progress
          const newOrchestrator = new MigrationOrchestrator(tempDir);
          await newOrchestrator.initialize();
          
          // Compare progress reports
          const originalReport = orchestrator.generateProgressReport();
          const loadedReport = newOrchestrator.generateProgressReport();
          
          // Verify overall progress matches
          const progressMatches = 
            originalReport.overallProgress.totalFiles === loadedReport.overallProgress.totalFiles &&
            originalReport.overallProgress.convertedFiles === loadedReport.overallProgress.convertedFiles &&
            originalReport.overallProgress.percentComplete === loadedReport.overallProgress.percentComplete;
          
          return progressMatches;
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Property 19: Progress percentage calculation is always accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        async (totalFiles, convertedFiles) => {
          // Ensure converted files doesn't exceed total files
          const actualConverted = Math.min(convertedFiles, totalFiles);
          
          // Create test files
          const structure = {
            files: Array.from({ length: totalFiles }, (_, i) => ({
              name: `TestFile${i}`,
              phase: MigrationPhase.CORE_UTILITIES,
              dependencies: []
            }))
          };
          
          const createdFiles = await createTestFiles(structure);
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Mark some files as converted
          for (let i = 0; i < actualConverted; i++) {
            orchestrator.updateFileStatus(createdFiles[i].path, MigrationStatus.CONVERTED);
          }
          
          // Generate progress report
          const progressReport = orchestrator.generateProgressReport();
          
          // Calculate expected percentage
          const expectedPercentage = Math.round((actualConverted / totalFiles) * 100);
          
          // Verify percentage calculation
          return progressReport.overallProgress.percentComplete === expectedPercentage;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 19: File status transitions are properly recorded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom(...Object.values(MigrationStatus)), { minLength: 2, maxLength: 5 }),
        async (statusSequence) => {
          // Create a single test file
          const structure = {
            files: [{
              name: 'TestFile',
              phase: MigrationPhase.CORE_UTILITIES,
              dependencies: []
            }]
          };
          
          const createdFiles = await createTestFiles(structure);
          const testFile = createdFiles[0];
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Apply status sequence
          let lastModified = null;
          for (const status of statusSequence) {
            orchestrator.updateFileStatus(testFile.path, status);
            
            const fileData = orchestrator.migrationLog.get(testFile.path);
            if (!fileData) return false;
            
            // Verify status was updated
            if (fileData.status !== status) return false;
            
            // Verify lastModified timestamp was updated
            if (lastModified && fileData.lastModified <= lastModified) return false;
            
            lastModified = fileData.lastModified;
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 19: Phase-based progress tracking is consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          coreFiles: fc.integer({ min: 1, max: 5 }),
          systemFiles: fc.integer({ min: 1, max: 5 }),
          agentFiles: fc.integer({ min: 1, max: 5 })
        }),
        async (fileCounts) => {
          // Create files for different phases
          const structure = {
            files: [
              ...Array.from({ length: fileCounts.coreFiles }, (_, i) => ({
                name: `CoreFile${i}`,
                phase: MigrationPhase.CORE_UTILITIES,
                dependencies: []
              })),
              ...Array.from({ length: fileCounts.systemFiles }, (_, i) => ({
                name: `SystemFile${i}`,
                phase: MigrationPhase.SYSTEMS,
                dependencies: []
              })),
              ...Array.from({ length: fileCounts.agentFiles }, (_, i) => ({
                name: `AgentFile${i}`,
                phase: MigrationPhase.AGENTS,
                dependencies: []
              }))
            ]
          };
          
          const createdFiles = await createTestFiles(structure);
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Generate progress report
          const progressReport = orchestrator.generateProgressReport();
          
          // Verify phase file counts
          const corePhase = progressReport.phases[MigrationPhase.CORE_UTILITIES];
          const systemPhase = progressReport.phases[MigrationPhase.SYSTEMS];
          const agentPhase = progressReport.phases[MigrationPhase.AGENTS];
          
          const countsMatch = 
            corePhase.totalFiles === fileCounts.coreFiles &&
            systemPhase.totalFiles === fileCounts.systemFiles &&
            agentPhase.totalFiles === fileCounts.agentFiles;
          
          // Verify total matches sum of phases
          const totalFromPhases = corePhase.totalFiles + systemPhase.totalFiles + agentPhase.totalFiles;
          const totalMatches = progressReport.overallProgress.totalFiles === totalFromPhases;
          
          return countsMatch && totalMatches;
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Integration tests for migration progress tracking
 */
describe('Migration Progress Integration', () => {
  let tempDir;
  let orchestrator;

  beforeEach(async () => {
    tempDir = path.join(__dirname, 'temp-integration-progress-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    orchestrator = new MigrationOrchestrator(tempDir);
  });

  afterEach(async () => {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp directory:', error.message);
      }
    }
  });

  test('Complete migration workflow progress tracking', async () => {
    // Create a realistic file structure
    const coreDir = path.join(tempDir, 'MyHavokSimCode', 'core');
    const systemsDir = path.join(tempDir, 'MyHavokSimCode', 'systems');
    const agentsDir = path.join(tempDir, 'MyHavokSimCode', 'Agents');
    
    await fs.mkdir(coreDir, { recursive: true });
    await fs.mkdir(systemsDir, { recursive: true });
    await fs.mkdir(agentsDir, { recursive: true });
    
    // Create core files
    await fs.writeFile(path.join(coreDir, 'ErrorHandling.js'), 'export class ErrorHandling {}');
    await fs.writeFile(path.join(coreDir, 'SimulationSetup.js'), 'export class SimulationSetup {}');
    
    // Create system files
    await fs.writeFile(path.join(systemsDir, 'PhysicsSystem.js'), 'export class PhysicsSystem {}');
    
    // Create agent files
    await fs.writeFile(path.join(agentsDir, 'VillagerAgent.js'), 'export class VillagerAgent {}');
    await fs.writeFile(path.join(agentsDir, 'ZombieAgent.js'), 'export class ZombieAgent {}');
    
    // Initialize orchestrator
    await orchestrator.initialize();
    
    // Initial progress check
    let progressReport = orchestrator.generateProgressReport();
    expect(progressReport.overallProgress.totalFiles).toBe(5);
    expect(progressReport.overallProgress.convertedFiles).toBe(0);
    expect(progressReport.overallProgress.percentComplete).toBe(0);
    
    // Convert core files
    const coreFiles = [
      path.join(coreDir, 'ErrorHandling.js'),
      path.join(coreDir, 'SimulationSetup.js')
    ];
    
    for (const file of coreFiles) {
      orchestrator.updateFileStatus(file, MigrationStatus.CONVERTED);
    }
    
    // Check progress after core conversion
    progressReport = orchestrator.generateProgressReport();
    expect(progressReport.overallProgress.convertedFiles).toBe(2);
    expect(progressReport.overallProgress.percentComplete).toBe(40);
    
    // Convert system files
    orchestrator.updateFileStatus(path.join(systemsDir, 'PhysicsSystem.js'), MigrationStatus.CONVERTED);
    
    // Check progress after system conversion
    progressReport = orchestrator.generateProgressReport();
    expect(progressReport.overallProgress.convertedFiles).toBe(3);
    expect(progressReport.overallProgress.percentComplete).toBe(60);
    
    // Convert agent files
    const agentFiles = [
      path.join(agentsDir, 'VillagerAgent.js'),
      path.join(agentsDir, 'ZombieAgent.js')
    ];
    
    for (const file of agentFiles) {
      orchestrator.updateFileStatus(file, MigrationStatus.CONVERTED);
    }
    
    // Check final progress
    progressReport = orchestrator.generateProgressReport();
    expect(progressReport.overallProgress.convertedFiles).toBe(5);
    expect(progressReport.overallProgress.percentComplete).toBe(100);
    
    // Verify phase-specific progress
    const corePhase = progressReport.phases[MigrationPhase.CORE_UTILITIES];
    const systemPhase = progressReport.phases[MigrationPhase.SYSTEMS];
    const agentPhase = progressReport.phases[MigrationPhase.AGENTS];
    
    expect(corePhase.convertedFiles).toBe(2);
    expect(systemPhase.convertedFiles).toBe(1);
    expect(agentPhase.convertedFiles).toBe(2);
  });

  test('Progress persistence across orchestrator instances', async () => {
    // Create test files
    const coreDir = path.join(tempDir, 'MyHavokSimCode', 'core');
    await fs.mkdir(coreDir, { recursive: true });
    await fs.writeFile(path.join(coreDir, 'TestFile.js'), 'export class TestFile {}');
    
    // Initialize and update status
    await orchestrator.initialize();
    const testFile = path.join(coreDir, 'TestFile.js');
    orchestrator.updateFileStatus(testFile, MigrationStatus.CONVERTED, {
      typeErrors: 5,
      conversionAttempts: 2
    });
    
    // Save progress
    await orchestrator.saveProgress();
    
    // Create new orchestrator and load progress
    const newOrchestrator = new MigrationOrchestrator(tempDir);
    await newOrchestrator.initialize();
    
    // Verify progress was loaded correctly
    const fileData = newOrchestrator.migrationLog.get(testFile);
    expect(fileData).toBeTruthy();
    expect(fileData.status).toBe(MigrationStatus.CONVERTED);
    expect(fileData.typeErrors).toBe(5);
    expect(fileData.conversionAttempts).toBe(2);
    
    // Verify progress report matches
    const originalReport = orchestrator.generateProgressReport();
    const loadedReport = newOrchestrator.generateProgressReport();
    
    expect(loadedReport.overallProgress.totalFiles).toBe(originalReport.overallProgress.totalFiles);
    expect(loadedReport.overallProgress.convertedFiles).toBe(originalReport.overallProgress.convertedFiles);
    expect(loadedReport.overallProgress.percentComplete).toBe(originalReport.overallProgress.percentComplete);
  });
});