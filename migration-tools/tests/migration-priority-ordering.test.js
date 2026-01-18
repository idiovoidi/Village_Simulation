/**
 * Property-Based Test: Migration Priority Ordering
 * 
 * Feature: eslint-typescript-migration, Property 9: Migration Priority Ordering
 * 
 * Property: For any file selection during migration, core utilities and infrastructure 
 * files should be selected before complex agent system files
 * 
 * Validates: Requirements 3.1
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationOrchestrator, MigrationPhase, MigrationStatus } from '../MigrationOrchestrator.js';
import { FilePriorityManager } from '../FilePriorityManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Property 9: Migration Priority Ordering', () => {
  let tempDir;
  let orchestrator;
  let priorityManager;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = path.join(__dirname, 'temp-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    orchestrator = new MigrationOrchestrator(tempDir);
    priorityManager = new FilePriorityManager(orchestrator);
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
   * Generator for file structure configurations
   */
  const fileStructureArbitrary = fc.record({
    coreFiles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
    infrastructureFiles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
    systemFiles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 15 }),
    agentFiles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 20 })
  });

  /**
   * Generator for dependency relationships
   */
  const dependencyArbitrary = fc.record({
    hasDependencies: fc.boolean(),
    dependencyCount: fc.integer({ min: 0, max: 5 })
  });

  /**
   * Create test file structure
   */
  async function createTestFileStructure(structure) {
    const createdFiles = [];
    
    // Create core utilities files
    const coreDir = path.join(tempDir, 'MyHavokSimCode', 'core');
    await fs.mkdir(coreDir, { recursive: true });
    
    for (const fileName of structure.coreFiles) {
      const filePath = path.join(coreDir, `${fileName}.js`);
      await fs.writeFile(filePath, `// Core utility: ${fileName}\nexport class ${fileName} {}`);
      createdFiles.push({ path: filePath, phase: MigrationPhase.CORE_UTILITIES });
    }
    
    // Create infrastructure files
    const assetsDir = path.join(tempDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
    
    for (const fileName of structure.infrastructureFiles) {
      const filePath = path.join(assetsDir, `${fileName}.js`);
      await fs.writeFile(filePath, `// Infrastructure: ${fileName}\nexport class ${fileName} {}`);
      createdFiles.push({ path: filePath, phase: MigrationPhase.INFRASTRUCTURE });
    }
    
    // Create system files
    const systemsDir = path.join(tempDir, 'MyHavokSimCode', 'systems');
    await fs.mkdir(systemsDir, { recursive: true });
    
    for (const fileName of structure.systemFiles) {
      const filePath = path.join(systemsDir, `${fileName}.js`);
      await fs.writeFile(filePath, `// System: ${fileName}\nexport class ${fileName} {}`);
      createdFiles.push({ path: filePath, phase: MigrationPhase.SYSTEMS });
    }
    
    // Create agent files
    const agentsDir = path.join(tempDir, 'MyHavokSimCode', 'Agents');
    await fs.mkdir(agentsDir, { recursive: true });
    
    for (const fileName of structure.agentFiles) {
      const filePath = path.join(agentsDir, `${fileName}.js`);
      await fs.writeFile(filePath, `// Agent: ${fileName}\nexport class ${fileName} {}`);
      createdFiles.push({ path: filePath, phase: MigrationPhase.AGENTS });
    }
    
    return createdFiles;
  }

  test('Property 9: Core utilities are prioritized before agent systems', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileStructureArbitrary,
        async (structure) => {
          // Skip if no files to test
          if (structure.coreFiles.length === 0 && structure.agentFiles.length === 0) {
            return true;
          }
          
          // Create test file structure
          const createdFiles = await createTestFileStructure(structure);
          
          // Initialize orchestrator with test files
          await orchestrator.initialize();
          
          // Get conversion queue
          const conversionQueue = await priorityManager.getConversionQueue();
          
          // Extract phases in order
          const phaseOrder = conversionQueue.map(file => {
            const fileData = orchestrator.migrationLog.get(file.path);
            return fileData ? fileData.phase : null;
          }).filter(phase => phase !== null);
          
          // Verify core utilities come before agents
          let lastCoreIndex = -1;
          let firstAgentIndex = phaseOrder.length;
          
          for (let i = 0; i < phaseOrder.length; i++) {
            if (phaseOrder[i] === MigrationPhase.CORE_UTILITIES) {
              lastCoreIndex = i;
            }
            if (phaseOrder[i] === MigrationPhase.AGENTS && firstAgentIndex === phaseOrder.length) {
              firstAgentIndex = i;
            }
          }
          
          // Core utilities should come before agents
          const coreBeforeAgents = lastCoreIndex < firstAgentIndex;
          
          // Verify infrastructure comes before systems and agents
          let lastInfraIndex = -1;
          let firstSystemIndex = phaseOrder.length;
          
          for (let i = 0; i < phaseOrder.length; i++) {
            if (phaseOrder[i] === MigrationPhase.INFRASTRUCTURE) {
              lastInfraIndex = i;
            }
            if ((phaseOrder[i] === MigrationPhase.SYSTEMS || phaseOrder[i] === MigrationPhase.AGENTS) && 
                firstSystemIndex === phaseOrder.length) {
              firstSystemIndex = i;
            }
          }
          
          const infraBeforeSystems = lastInfraIndex < firstSystemIndex;
          
          return coreBeforeAgents && infraBeforeSystems;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Phase priority ordering is consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileStructureArbitrary,
        async (structure) => {
          // Create test file structure
          await createTestFileStructure(structure);
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Get conversion queue multiple times
          const queue1 = await priorityManager.getConversionQueue();
          const queue2 = await priorityManager.getConversionQueue();
          
          // Extract phase sequences
          const getPhaseSequence = (queue) => {
            return queue.map(file => {
              const fileData = orchestrator.migrationLog.get(file.path);
              return fileData ? fileData.phase : null;
            }).filter(phase => phase !== null);
          };
          
          const sequence1 = getPhaseSequence(queue1);
          const sequence2 = getPhaseSequence(queue2);
          
          // Phase ordering should be consistent
          return JSON.stringify(sequence1) === JSON.stringify(sequence2);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 9: Dependencies are respected in priority ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 8 }),
        async (fileNames) => {
          // Create files with dependency chain
          const coreDir = path.join(tempDir, 'MyHavokSimCode', 'core');
          await fs.mkdir(coreDir, { recursive: true });
          
          const createdFiles = [];
          
          for (let i = 0; i < fileNames.length; i++) {
            const fileName = fileNames[i];
            const filePath = path.join(coreDir, `${fileName}.js`);
            
            // Create dependency chain: each file depends on the previous one
            let content = `// File: ${fileName}\n`;
            if (i > 0) {
              const prevFile = fileNames[i - 1];
              content += `import { ${prevFile} } from './${prevFile}.js';\n`;
            }
            content += `export class ${fileName} {}`;
            
            await fs.writeFile(filePath, content);
            createdFiles.push(filePath);
          }
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Get conversion queue
          const conversionQueue = await priorityManager.getConversionQueue();
          
          // Validate dependency order
          const validation = priorityManager.validateConversionOrder(conversionQueue);
          
          return validation.isValid;
        }
      ),
      { numRuns: 30 }
    );
  });

  test('Property 9: Priority scores decrease with phase priority', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileStructureArbitrary,
        async (structure) => {
          // Create test file structure
          await createTestFileStructure(structure);
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Get conversion queue with priority scores
          const conversionQueue = await priorityManager.getConversionQueue();
          
          if (conversionQueue.length < 2) {
            return true; // Not enough files to test
          }
          
          // Group by phase and check priority scores
          const phaseGroups = {};
          for (const file of conversionQueue) {
            const fileData = orchestrator.migrationLog.get(file.path);
            if (!fileData) continue;
            
            const phase = fileData.phase;
            if (!phaseGroups[phase]) {
              phaseGroups[phase] = [];
            }
            phaseGroups[phase].push(file.priorityScore);
          }
          
          // Check that core utilities have lower scores than agents
          const coreScores = phaseGroups[MigrationPhase.CORE_UTILITIES] || [];
          const agentScores = phaseGroups[MigrationPhase.AGENTS] || [];
          
          if (coreScores.length === 0 || agentScores.length === 0) {
            return true; // Can't compare if one phase is missing
          }
          
          const maxCoreScore = Math.max(...coreScores);
          const minAgentScore = Math.min(...agentScores);
          
          return maxCoreScore < minAgentScore;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 9: Files with fewer dependencies get higher priority within phase', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 3, maxLength: 8 }),
        async (dependencyCounts) => {
          // Create files in same phase with different dependency counts
          const coreDir = path.join(tempDir, 'MyHavokSimCode', 'core');
          await fs.mkdir(coreDir, { recursive: true });
          
          const files = [];
          
          for (let i = 0; i < dependencyCounts.length; i++) {
            const fileName = `TestFile${i}`;
            const filePath = path.join(coreDir, `${fileName}.js`);
            const depCount = dependencyCounts[i];
            
            let content = `// File: ${fileName}\n`;
            
            // Add fake imports to simulate dependencies
            for (let j = 0; j < depCount; j++) {
              content += `// import something${j} from './external${j}.js';\n`;
            }
            
            content += `export class ${fileName} {}`;
            
            await fs.writeFile(filePath, content);
            files.push({ path: filePath, expectedDeps: depCount });
          }
          
          // Initialize orchestrator
          await orchestrator.initialize();
          
          // Get conversion queue for core utilities only
          const coreQueue = await priorityManager.getNextBatchByPhase(MigrationPhase.CORE_UTILITIES, 10);
          
          if (coreQueue.length < 2) {
            return true; // Not enough files to test ordering
          }
          
          // Check that files are ordered by dependency count (fewer first)
          for (let i = 1; i < coreQueue.length; i++) {
            const prevFile = coreQueue[i - 1];
            const currFile = coreQueue[i];
            
            const prevData = orchestrator.migrationLog.get(prevFile.path);
            const currData = orchestrator.migrationLog.get(currFile.path);
            
            if (!prevData || !currData) continue;
            
            // Previous file should have <= dependencies than current file
            if (prevData.dependencies.length > currData.dependencies.length) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Integration test for full conversion plan
 */
describe('Migration Priority Integration', () => {
  let tempDir;
  let orchestrator;
  let priorityManager;

  beforeEach(async () => {
    tempDir = path.join(__dirname, 'temp-integration-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    orchestrator = new MigrationOrchestrator(tempDir);
    priorityManager = new FilePriorityManager(orchestrator);
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

  test('Full conversion plan respects phase ordering', async () => {
    // Create a realistic file structure
    const structure = {
      coreFiles: ['ErrorHandling', 'SimulationSetup', 'Entity'],
      infrastructureFiles: ['AssetManager'],
      systemFiles: ['PhysicsSystem', 'RenderSystem'],
      agentFiles: ['VillagerAgent', 'ZombieAgent', 'BirdAgent']
    };
    
    // Create test files
    const createdFiles = [];
    
    // Core files
    const coreDir = path.join(tempDir, 'MyHavokSimCode', 'core');
    await fs.mkdir(coreDir, { recursive: true });
    for (const fileName of structure.coreFiles) {
      const filePath = path.join(coreDir, `${fileName}.js`);
      await fs.writeFile(filePath, `export class ${fileName} {}`);
      createdFiles.push(filePath);
    }
    
    // Infrastructure files
    const assetsDir = path.join(tempDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
    for (const fileName of structure.infrastructureFiles) {
      const filePath = path.join(assetsDir, `${fileName}.js`);
      await fs.writeFile(filePath, `export class ${fileName} {}`);
      createdFiles.push(filePath);
    }
    
    // System files
    const systemsDir = path.join(tempDir, 'MyHavokSimCode', 'systems');
    await fs.mkdir(systemsDir, { recursive: true });
    for (const fileName of structure.systemFiles) {
      const filePath = path.join(systemsDir, `${fileName}.js`);
      await fs.writeFile(filePath, `export class ${fileName} {}`);
      createdFiles.push(filePath);
    }
    
    // Agent files
    const agentsDir = path.join(tempDir, 'MyHavokSimCode', 'Agents');
    await fs.mkdir(agentsDir, { recursive: true });
    for (const fileName of structure.agentFiles) {
      const filePath = path.join(agentsDir, `${fileName}.js`);
      await fs.writeFile(filePath, `export class ${fileName} {}`);
      createdFiles.push(filePath);
    }
    
    // Initialize and get conversion plan
    await orchestrator.initialize();
    const conversionPlan = await priorityManager.getFullConversionPlan();
    
    // Verify phase ordering
    expect(conversionPlan.phases).toHaveLength(4);
    
    const phaseOrder = conversionPlan.phases.map(p => p.phase);
    expect(phaseOrder).toEqual([
      MigrationPhase.CORE_UTILITIES,
      MigrationPhase.INFRASTRUCTURE,
      MigrationPhase.SYSTEMS,
      MigrationPhase.AGENTS
    ]);
    
    // Verify each phase has expected files
    const corePhase = conversionPlan.phases.find(p => p.phase === MigrationPhase.CORE_UTILITIES);
    expect(corePhase.fileCount).toBe(structure.coreFiles.length);
    
    const agentPhase = conversionPlan.phases.find(p => p.phase === MigrationPhase.AGENTS);
    expect(agentPhase.fileCount).toBe(structure.agentFiles.length);
  });
});