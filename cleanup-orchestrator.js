#!/usr/bin/env node

/**
 * Cleanup Orchestrator
 * 
 * Coordinates the entire cleanup workflow for identifying and removing unused code.
 * Supports multiple phases: analysis, verification, cleanup, and reporting.
 */

const { parseArgs } = require('node:util');
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

// ============================================================================
// Logger System
// ============================================================================

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.silent = options.silent || false;
    this.logs = [];
  }

  _formatTimestamp() {
    return new Date().toISOString();
  }

  _log(level, message, data = null) {
    const entry = {
      timestamp: this._formatTimestamp(),
      level,
      message,
      data
    };
    
    this.logs.push(entry);

    if (this.silent) return;

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'info':
        console.log(`${prefix} ${message}`, data || '');
        break;
      case 'debug':
        if (this.verbose) {
          console.log(`${prefix} ${message}`, data || '');
        }
        break;
      case 'success':
        console.log(`${prefix} ✓ ${message}`, data || '');
        break;
    }
  }

  error(message, data) {
    this._log('error', message, data);
  }

  warn(message, data) {
    this._log('warn', message, data);
  }

  info(message, data) {
    this._log('info', message, data);
  }

  debug(message, data) {
    this._log('debug', message, data);
  }

  success(message, data) {
    this._log('success', message, data);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

// ============================================================================
// Configuration Manager
// ============================================================================

class ConfigManager {
  constructor(configPath, logger) {
    this.logger = logger;
    this.config = this._loadConfig(configPath);
  }

  _loadConfig(configPath) {
    const defaultConfig = {
      thresholds: {
        unused: 0,
        lowUsage: 30,
        moderate: 60
      },
      safety: {
        requireZeroReferences: true,
        checkDynamicUsage: true,
        checkPublicAPI: true,
        minDaysSinceModified: 90
      },
      execution: {
        dryRun: false,
        stopOnTestFailure: true,
        maxItemsPerRun: 50,
        createBackupBranch: true
      },
      exclusions: {
        paths: [
          'node_modules/**',
          'coverage/**',
          '.git/**'
        ],
        patterns: []
      }
    };

    if (!configPath) {
      this.logger.debug('No config file specified, using defaults');
      return defaultConfig;
    }

    const resolvedPath = resolve(configPath);
    
    if (!existsSync(resolvedPath)) {
      this.logger.warn(`Config file not found: ${resolvedPath}, using defaults`);
      return defaultConfig;
    }

    try {
      const configContent = readFileSync(resolvedPath, 'utf-8');
      const userConfig = JSON.parse(configContent);
      
      // Merge user config with defaults
      const merged = {
        ...defaultConfig,
        thresholds: { ...defaultConfig.thresholds, ...userConfig.thresholds },
        safety: { ...defaultConfig.safety, ...userConfig.safety },
        execution: { ...defaultConfig.execution, ...userConfig.execution },
        exclusions: { ...defaultConfig.exclusions, ...userConfig.exclusions }
      };

      this.logger.success(`Loaded configuration from ${resolvedPath}`);
      return merged;
    } catch (error) {
      this.logger.error(`Failed to load config file: ${error.message}`);
      this.logger.warn('Using default configuration');
      return defaultConfig;
    }
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return this.config;
  }
}

// ============================================================================
// Cleanup Orchestrator
// ============================================================================

class CleanupOrchestrator {
  constructor(options = {}) {
    this.options = options;
    this.logger = new Logger({
      verbose: options.verbose,
      silent: options.silent
    });
    this.config = new ConfigManager(options.config, this.logger);
    this.results = {
      analysis: null,
      verification: null,
      cleanup: null,
      report: null
    };
  }

  async run() {
    this.logger.info('='.repeat(60));
    this.logger.info('Starting Cleanup Orchestrator');
    this.logger.info('='.repeat(60));

    const startTime = Date.now();

    try {
      // Determine which phases to run
      const phases = this._determinePhases();
      
      this.logger.info(`Phases to execute: ${phases.join(', ')}`);
      this.logger.info(`Dry run: ${this.options.dryRun ? 'YES' : 'NO'}`);
      this.logger.info('');

      // Execute phases in order
      for (const phase of phases) {
        await this._executePhase(phase);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.success(`Cleanup orchestration completed in ${duration}s`);
      
      return {
        success: true,
        results: this.results,
        logs: this.logger.getLogs()
      };

    } catch (error) {
      this.logger.error('Cleanup orchestration failed', error.message);
      
      return {
        success: false,
        error: error.message,
        results: this.results,
        logs: this.logger.getLogs()
      };
    }
  }

  _determinePhases() {
    if (this.options.phase) {
      // Single phase specified
      return [this.options.phase];
    }

    // Default: run all phases
    return ['analysis', 'verification', 'cleanup', 'report'];
  }

  async _executePhase(phase) {
    this.logger.info('');
    this.logger.info('-'.repeat(60));
    this.logger.info(`Phase: ${phase.toUpperCase()}`);
    this.logger.info('-'.repeat(60));

    switch (phase) {
      case 'analysis':
        await this._runAnalysisPhase();
        break;
      case 'verification':
        await this._runVerificationPhase();
        break;
      case 'cleanup':
        await this._runCleanupPhase();
        break;
      case 'report':
        await this._runReportPhase();
        break;
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }

  async _runAnalysisPhase() {
    this.logger.info('Running coverage analysis...');
    this.logger.warn('Analysis phase not yet implemented');
    // TODO: Implement in task 2
    this.results.analysis = { status: 'pending' };
  }

  async _runVerificationPhase() {
    this.logger.info('Running safety verification...');
    this.logger.warn('Verification phase not yet implemented');
    // TODO: Implement in task 3
    this.results.verification = { status: 'pending' };
  }

  async _runCleanupPhase() {
    if (this.options.dryRun) {
      this.logger.info('DRY RUN: Skipping cleanup phase (no changes will be made)');
      return;
    }

    this.logger.info('Running code cleanup...');
    this.logger.warn('Cleanup phase not yet implemented');
    // TODO: Implement in task 4
    this.results.cleanup = { status: 'pending' };
  }

  async _runReportPhase() {
    this.logger.info('Generating cleanup report...');
    this.logger.warn('Report phase not yet implemented');
    // TODO: Implement in task 5
    this.results.report = { status: 'pending' };
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function printHelp() {
  console.log(`
Cleanup Orchestrator - Automated Code Cleanup Tool

USAGE:
  node cleanup-orchestrator.js [OPTIONS]

OPTIONS:
  --dry-run              Preview changes without executing (default: false)
  --phase <phase>        Run specific phase: analysis, verification, cleanup, report
  --config <path>        Path to configuration file (default: cleanup-config.json)
  --verbose              Enable verbose logging (default: false)
  --silent               Suppress all output except errors (default: false)
  --yes                  Skip confirmation prompts (default: false)
  --help                 Display this help message

EXAMPLES:
  # Run full cleanup workflow (dry-run)
  node cleanup-orchestrator.js --dry-run

  # Run only analysis phase
  node cleanup-orchestrator.js --phase analysis

  # Run with custom config
  node cleanup-orchestrator.js --config my-config.json

  # Run full cleanup with verbose logging
  node cleanup-orchestrator.js --verbose --yes

PHASES:
  analysis      - Run coverage analysis and identify unused code
  verification  - Verify code is safe to remove
  cleanup       - Remove verified unused code
  report        - Generate cleanup report and metrics

For more information, see CLEANUP_GUIDE.md
`);
}

async function main() {
  try {
    const { values } = parseArgs({
      options: {
        'dry-run': { type: 'boolean', default: false },
        'phase': { type: 'string' },
        'config': { type: 'string' },
        'verbose': { type: 'boolean', default: false },
        'silent': { type: 'boolean', default: false },
        'yes': { type: 'boolean', default: false },
        'help': { type: 'boolean', default: false }
      }
    });

    if (values.help) {
      printHelp();
      process.exit(0);
    }

    // Validate phase if specified
    const validPhases = ['analysis', 'verification', 'cleanup', 'report'];
    if (values.phase && !validPhases.includes(values.phase)) {
      console.error(`Error: Invalid phase "${values.phase}"`);
      console.error(`Valid phases: ${validPhases.join(', ')}`);
      process.exit(1);
    }

    // Create and run orchestrator
    const orchestrator = new CleanupOrchestrator({
      dryRun: values['dry-run'],
      phase: values.phase,
      config: values.config,
      verbose: values.verbose,
      silent: values.silent,
      skipConfirmation: values.yes
    });

    const result = await orchestrator.run();

    if (!result.success) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { CleanupOrchestrator, Logger, ConfigManager };
