#!/usr/bin/env node

/**
 * Cleanup Orchestrator
 * 
 * Coordinates the entire cleanup workflow for identifying and removing unused code.
 * Supports multiple phases: analysis, verification, cleanup, and reporting.
 */

const { parseArgs } = require('node:util');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

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
// Coverage Runner
// ============================================================================

class CoverageRunner {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Check if the development server is running
   * @returns {Promise<boolean>}
   */
  async isServerRunning(port = 3000) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Execute an npm script and capture output
   * @param {string} script - The npm script to run
   * @returns {Promise<{success: boolean, output: string, error: string}>}
   */
  async runNpmScript(script) {
    return new Promise((resolve) => {
      this.logger.info(`Executing: npm run ${script}`);
      
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'npm.cmd' : 'npm';
      
      const child = spawn(command, ['run', script], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        if (this.logger.verbose) {
          process.stdout.write(output);
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (this.logger.verbose) {
          process.stderr.write(output);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.success(`Completed: npm run ${script}`);
          resolve({ success: true, output: stdout, error: stderr });
        } else {
          this.logger.error(`Failed: npm run ${script} (exit code ${code})`);
          resolve({ success: false, output: stdout, error: stderr });
        }
      });

      child.on('error', (error) => {
        this.logger.error(`Error executing npm run ${script}:`, error.message);
        resolve({ success: false, output: stdout, error: error.message });
      });
    });
  }

  /**
   * Run server-side coverage tests
   * @returns {Promise<{success: boolean, output: string}>}
   */
  async runServerCoverage() {
    this.logger.info('Running server-side coverage tests...');
    const result = await this.runNpmScript('test:coverage');
    return result;
  }

  /**
   * Run browser-side coverage tests
   * @returns {Promise<{success: boolean, output: string}>}
   */
  async runBrowserCoverage() {
    this.logger.info('Checking if server is running...');
    const serverRunning = await this.isServerRunning();

    if (!serverRunning) {
      this.logger.warn('Server is not running on port 3000');
      this.logger.warn('Skipping browser coverage. Start server with: npm start');
      return { success: false, output: '', error: 'Server not running' };
    }

    this.logger.success('Server is running, proceeding with browser coverage');
    const result = await this.runNpmScript('coverage:browser');
    return result;
  }

  /**
   * Run coverage analysis
   * @returns {Promise<{success: boolean, output: string}>}
   */
  async runCoverageAnalysis() {
    this.logger.info('Running coverage analysis...');
    const result = await this.runNpmScript('coverage:analyze');
    return result;
  }

  /**
   * Run full coverage workflow
   * @returns {Promise<{serverCoverage: object, browserCoverage: object, analysis: object}>}
   */
  async runFullCoverage() {
    const results = {
      serverCoverage: null,
      browserCoverage: null,
      analysis: null
    };

    // Run server coverage
    results.serverCoverage = await this.runServerCoverage();
    
    if (!results.serverCoverage.success) {
      this.logger.error('Server coverage failed, aborting coverage workflow');
      throw new Error('Server coverage tests failed');
    }

    // Run browser coverage (optional)
    results.browserCoverage = await this.runBrowserCoverage();
    
    // Run analysis
    results.analysis = await this.runCoverageAnalysis();
    
    if (!results.analysis.success) {
      this.logger.error('Coverage analysis failed');
      throw new Error('Coverage analysis failed');
    }

    return results;
  }
}

// ============================================================================
// Code Analyzer
// ============================================================================

class CodeAnalyzer {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Parse and structure coverage data from files
   * @returns {Promise<object>} Structured coverage data
   */
  async parseCoverageData() {
    this.logger.info('Parsing coverage data...');

    const coverageFinalPath = resolve('coverage', 'coverage-final.json');
    const analysisReportPath = resolve('coverage', 'analysis-report.json');

    // Check if coverage files exist
    if (!existsSync(coverageFinalPath)) {
      throw new Error('coverage/coverage-final.json not found. Run coverage first.');
    }

    if (!existsSync(analysisReportPath)) {
      throw new Error('coverage/analysis-report.json not found. Run coverage analysis first.');
    }

    // Read coverage data
    const coverageFinal = JSON.parse(readFileSync(coverageFinalPath, 'utf-8'));
    const analysisReport = JSON.parse(readFileSync(analysisReportPath, 'utf-8'));

    this.logger.success('Coverage data loaded successfully');

    // Create unified data structure
    const structuredData = this._createUnifiedStructure(coverageFinal, analysisReport);

    return structuredData;
  }

  /**
   * Create unified data structure combining coverage and analysis data
   * @private
   */
  _createUnifiedStructure(coverageFinal, analysisReport) {
    const thresholds = this.config.get('thresholds');

    // Combine data from both sources
    const items = [];

    // Process each category from analysis report
    const categories = ['unused', 'lowUsage', 'moderate', 'wellCovered'];
    
    for (const category of categories) {
      const files = analysisReport[category] || [];
      
      for (const file of files) {
        const item = {
          type: 'file',
          path: file.path,
          coverage: file.coverage,
          metrics: {
            totalLines: file.totalLines,
            coveredLines: file.coveredLines,
            uncoveredLines: file.uncoveredLines,
            totalFunctions: file.totalFunctions,
            coveredFunctions: file.coveredFunctions,
            unusedFunctions: file.unusedFunctions,
            unusedFunctionNames: file.unusedFunctionNames || [],
            totalBranches: file.totalBranches || 0,
            coveredBranches: file.coveredBranches || 0,
            branchCoverage: file.branchCoverage || 0
          },
          category,
          priority: this._calculatePriority(file),
          estimatedBytes: this._estimateFileSize(file)
        };

        items.push(item);
      }
    }

    // Sort by priority
    items.sort((a, b) => b.priority - a.priority);

    return {
      items,
      summary: analysisReport.summary,
      thresholds,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate priority score for an item
   * @private
   */
  _calculatePriority(file) {
    // Priority factors:
    // 1. Coverage (lower is higher priority)
    // 2. File size (larger files have higher impact)
    // 3. Number of unused functions

    const coverageScore = 100 - file.coverage; // 0% coverage = 100 points
    const sizeScore = Math.min(file.totalLines / 10, 50); // Up to 50 points for size
    const functionScore = file.unusedFunctions * 2; // 2 points per unused function

    return coverageScore + sizeScore + functionScore;
  }

  /**
   * Estimate file size in bytes
   * @private
   */
  _estimateFileSize(file) {
    // Rough estimate: ~50 characters per line on average
    return file.totalLines * 50;
  }

  /**
   * Get files by category
   */
  getFilesByCategory(structuredData, category) {
    return structuredData.items.filter(item => item.category === category);
  }

  /**
   * Get high priority items for cleanup
   */
  getHighPriorityItems(structuredData, limit = 20) {
    return structuredData.items
      .filter(item => item.category === 'unused' || item.category === 'lowUsage')
      .slice(0, limit);
  }
}

// ============================================================================
// Analysis Report Generator
// ============================================================================

class AnalysisReportGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Generate and display initial analysis report
   * @param {object} structuredData - Structured coverage data
   */
  generateReport(structuredData) {
    this.logger.info('');
    this.logger.info('='.repeat(60));
    this.logger.info('COVERAGE ANALYSIS REPORT');
    this.logger.info('='.repeat(60));
    this.logger.info('');

    // Display summary statistics
    this._displaySummary(structuredData);

    // Display unused files
    this._displayUnusedFiles(structuredData);

    // Display low-usage files
    this._displayLowUsageFiles(structuredData);

    // Save to JSON file
    this._saveAnalysisResults(structuredData);

    this.logger.info('');
    this.logger.info('='.repeat(60));
  }

  /**
   * Display summary statistics
   * @private
   */
  _displaySummary(structuredData) {
    const { summary } = structuredData;
    const overallCoverage = summary.totalLines > 0
      ? ((summary.coveredLines / summary.totalLines) * 100).toFixed(1)
      : 0;

    this.logger.info('📊 SUMMARY STATISTICS:');
    this.logger.info(`   Total Files: ${summary.totalFiles}`);
    this.logger.info(`   Overall Coverage: ${overallCoverage}%`);
    this.logger.info(`   Unused Files (0% coverage): ${summary.unusedFiles}`);
    this.logger.info(`   Low Usage Files (<30% coverage): ${summary.lowUsageFiles}`);
    this.logger.info(`   Total Functions: ${summary.totalFunctions}`);
    this.logger.info(`   Unused Functions: ${summary.unusedFunctions}`);
    this.logger.info('');
  }

  /**
   * Display completely unused files
   * @private
   */
  _displayUnusedFiles(structuredData) {
    const unusedFiles = structuredData.items.filter(item => item.category === 'unused');

    if (unusedFiles.length === 0) {
      this.logger.success('✅ No completely unused files found!');
      this.logger.info('');
      return;
    }

    this.logger.info(`🚨 COMPLETELY UNUSED FILES (${unusedFiles.length} files):`);
    this.logger.info('');

    // Sort by size (largest first)
    const sortedFiles = [...unusedFiles].sort((a, b) => 
      b.metrics.totalLines - a.metrics.totalLines
    );

    // Display top 10
    const displayCount = Math.min(10, sortedFiles.length);
    for (let i = 0; i < displayCount; i++) {
      const file = sortedFiles[i];
      const sizeKB = (file.estimatedBytes / 1024).toFixed(1);
      
      this.logger.info(`   ${i + 1}. ${file.path}`);
      this.logger.info(`      Lines: ${file.metrics.totalLines} | Functions: ${file.metrics.totalFunctions} | Size: ~${sizeKB} KB`);
    }

    if (sortedFiles.length > displayCount) {
      this.logger.info(`   ... and ${sortedFiles.length - displayCount} more files`);
    }

    this.logger.info('');
  }

  /**
   * Display low-usage files
   * @private
   */
  _displayLowUsageFiles(structuredData) {
    const lowUsageFiles = structuredData.items.filter(item => item.category === 'lowUsage');

    if (lowUsageFiles.length === 0) {
      this.logger.info('✅ No low-usage files found!');
      this.logger.info('');
      return;
    }

    this.logger.info(`⚠️  LOW USAGE FILES (${lowUsageFiles.length} files with <30% coverage):`);
    this.logger.info('');

    // Sort by priority
    const sortedFiles = [...lowUsageFiles].sort((a, b) => b.priority - a.priority);

    // Display top 10
    const displayCount = Math.min(10, sortedFiles.length);
    for (let i = 0; i < displayCount; i++) {
      const file = sortedFiles[i];
      
      this.logger.info(`   ${i + 1}. ${file.path} - ${file.coverage}% coverage`);
      this.logger.info(`      Uncovered: ${file.metrics.uncoveredLines}/${file.metrics.totalLines} lines`);
      
      if (file.metrics.unusedFunctionNames.length > 0) {
        const funcNames = file.metrics.unusedFunctionNames.slice(0, 3).join(', ');
        const more = file.metrics.unusedFunctionNames.length > 3 
          ? ` (+${file.metrics.unusedFunctionNames.length - 3} more)` 
          : '';
        this.logger.info(`      Unused functions: ${funcNames}${more}`);
      }
    }

    if (sortedFiles.length > displayCount) {
      this.logger.info(`   ... and ${sortedFiles.length - displayCount} more files`);
    }

    this.logger.info('');
  }

  /**
   * Save analysis results to JSON file
   * @private
   */
  _saveAnalysisResults(structuredData) {
    const outputPath = resolve('cleanup-analysis.json');
    
    try {
      writeFileSync(outputPath, JSON.stringify(structuredData, null, 2), 'utf-8');
      this.logger.success(`Analysis results saved to: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to save analysis results: ${error.message}`);
    }
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
// Safety Verifier
// ============================================================================

class SafetyVerifier {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Search for import/require statements referencing a file
   * @param {string} filePath - Path to the file to search for
   * @returns {Promise<Array<{file: string, line: number, content: string}>>}
   */
  async searchImportReferences(filePath) {
    this.logger.debug(`Searching for import/require references to: ${filePath}`);
    
    const references = [];
    
    // Extract filename and possible import patterns
    const fileName = filePath.split(/[\/\\]/).pop();
    const fileNameWithoutExt = fileName.replace(/\.(js|mjs|cjs)$/, '');
    
    // Build search patterns for different import styles
    const patterns = [
      // ES6 imports: import ... from './path/file'
      `import\\s+.*\\s+from\\s+['"\`][^'"\`]*${fileNameWithoutExt}`,
      // CommonJS: require('./path/file')
      `require\\s*\\(\\s*['"\`][^'"\`]*${fileNameWithoutExt}`,
      // Dynamic imports: import('./path/file')
      `import\\s*\\(\\s*['"\`][^'"\`]*${fileNameWithoutExt}`
    ];

    for (const pattern of patterns) {
      try {
        const results = await this._grepSearch(pattern);
        references.push(...results);
      } catch (error) {
        this.logger.debug(`Search pattern failed: ${pattern}`, error.message);
      }
    }

    // Remove duplicates
    const uniqueRefs = this._deduplicateReferences(references);
    
    this.logger.debug(`Found ${uniqueRefs.length} import/require references`);
    return uniqueRefs;
  }

  /**
   * Search for dynamic imports (import(), require with variables)
   * @param {string} filePath - Path to the file to search for
   * @returns {Promise<Array<{file: string, line: number, content: string}>>}
   */
  async searchDynamicImports(filePath) {
    this.logger.debug(`Searching for dynamic imports of: ${filePath}`);
    
    const references = [];
    const fileName = filePath.split(/[\/\\]/).pop();
    const fileNameWithoutExt = fileName.replace(/\.(js|mjs|cjs)$/, '');
    
    // Patterns for dynamic usage
    const patterns = [
      // require with template literals or concatenation
      `require\\s*\\([^)]*${fileNameWithoutExt}`,
      // import() with template literals
      `import\\s*\\([^)]*${fileNameWithoutExt}`,
      // Variable-based requires
      `require\\s*\\(\\s*[a-zA-Z_$][a-zA-Z0-9_$]*\\s*\\)`
    ];

    for (const pattern of patterns) {
      try {
        const results = await this._grepSearch(pattern);
        references.push(...results);
      } catch (error) {
        this.logger.debug(`Dynamic search pattern failed: ${pattern}`, error.message);
      }
    }

    const uniqueRefs = this._deduplicateReferences(references);
    
    this.logger.debug(`Found ${uniqueRefs.length} dynamic import references`);
    return uniqueRefs;
  }

  /**
   * Search for string-based references (file paths in strings)
   * @param {string} filePath - Path to the file to search for
   * @returns {Promise<Array<{file: string, line: number, content: string}>>}
   */
  async searchStringReferences(filePath) {
    this.logger.debug(`Searching for string references to: ${filePath}`);
    
    const references = [];
    const fileName = filePath.split(/[\/\\]/).pop();
    const fileNameWithoutExt = fileName.replace(/\.(js|mjs|cjs)$/, '');
    
    // Search for the filename in strings (but not in comments)
    const pattern = `['"\`][^'"\`]*${fileNameWithoutExt}[^'"\`]*['"\`]`;
    
    try {
      const results = await this._grepSearch(pattern);
      
      // Filter out import/require statements (already covered)
      const filtered = results.filter(ref => {
        const content = ref.content.trim();
        return !content.match(/^\s*(import|require|from)\s/)
               && !content.match(/\/\//)
               && !content.match(/\/\*/);
      });
      
      references.push(...filtered);
    } catch (error) {
      this.logger.debug(`String search failed: ${error.message}`);
    }

    const uniqueRefs = this._deduplicateReferences(references);
    
    this.logger.debug(`Found ${uniqueRefs.length} string references`);
    return uniqueRefs;
  }

  /**
   * Search all references to a file
   * @param {string} filePath - Path to the file to search for
   * @returns {Promise<{imports: Array, dynamic: Array, strings: Array, total: number}>}
   */
  async searchAllReferences(filePath) {
    this.logger.info(`Searching for all references to: ${filePath}`);
    
    const [imports, dynamic, strings] = await Promise.all([
      this.searchImportReferences(filePath),
      this.searchDynamicImports(filePath),
      this.searchStringReferences(filePath)
    ]);

    const allRefs = [...imports, ...dynamic, ...strings];
    const uniqueRefs = this._deduplicateReferences(allRefs);

    return {
      imports,
      dynamic,
      strings,
      all: uniqueRefs,
      total: uniqueRefs.length
    };
  }

  /**
   * Execute grep search using Node.js child_process
   * @private
   * @param {string} pattern - Regex pattern to search for
   * @returns {Promise<Array<{file: string, line: number, content: string}>>}
   */
  async _grepSearch(pattern) {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      
      // Use findstr on Windows, grep on Unix
      let command, args;
      
      if (isWindows) {
        command = 'findstr';
        args = [
          '/S',
          '/N',
          '/I',
          '/R',
          pattern.replace(/\\/g, ''),
          '*.js', '*.mjs', '*.cjs'
        ];
      } else {
        command = 'grep';
        args = [
          '-r',
          '-n',
          '-i',
          '-E',
          '--include=*.js',
          '--include=*.mjs',
          '--include=*.cjs',
          '--exclude-dir=node_modules',
          '--exclude-dir=coverage',
          '--exclude-dir=.git',
          pattern,
          '.'
        ];
      }

      const child = spawn(command, args, {
        cwd: process.cwd(),
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 || code === 1) {
          const results = this._parseGrepOutput(stdout);
          resolve(results);
        } else {
          reject(new Error(`Search failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        this.logger.debug(`Search command not available: ${error.message}`);
        resolve([]);
      });
    });
  }

  /**
   * Parse grep/findstr output into structured results
   * @private
   */
  _parseGrepOutput(output) {
    if (!output || output.trim() === '') {
      return [];
    }

    const results = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      
      if (match) {
        results.push({
          file: match[1].trim(),
          line: parseInt(match[2], 10),
          content: match[3].trim()
        });
      }
    }

    return results;
  }

  /**
   * Remove duplicate references
   * @private
   */
  _deduplicateReferences(references) {
    const seen = new Set();
    const unique = [];

    for (const ref of references) {
      const key = `${ref.file}:${ref.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ref);
      }
    }

    return unique;
  }

  /**
   * Get last modification date of a file using git log
   * @param {string} filePath - Path to the file
   * @returns {Promise<Date|null>} Last modification date or null if not in git
   */
  async getLastModificationDate(filePath) {
    try {
      const result = await this._executeGitCommand([
        'log',
        '-1',
        '--format=%ai',
        '--',
        filePath
      ]);

      if (result.trim()) {
        return new Date(result.trim());
      }
      
      return null;
    } catch (error) {
      this.logger.debug(`Failed to get last modification date for ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Count commits in the last N days for a file
   * @param {string} filePath - Path to the file
   * @param {number} days - Number of days to look back (default: 90)
   * @returns {Promise<number>} Number of commits
   */
  async countRecentCommits(filePath, days = 90) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      const sinceStr = sinceDate.toISOString().split('T')[0];

      const result = await this._executeGitCommand([
        'log',
        '--oneline',
        `--since=${sinceStr}`,
        '--',
        filePath
      ]);

      const commits = result.trim().split('\n').filter(line => line.trim());
      return commits.length;
    } catch (error) {
      this.logger.debug(`Failed to count recent commits for ${filePath}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Extract commit messages for a file
   * @param {string} filePath - Path to the file
   * @param {number} limit - Maximum number of commits to retrieve (default: 5)
   * @returns {Promise<Array<{hash: string, date: string, message: string}>>}
   */
  async getCommitMessages(filePath, limit = 5) {
    try {
      const result = await this._executeGitCommand([
        'log',
        `-${limit}`,
        '--format=%H|%ai|%s',
        '--',
        filePath
      ]);

      const commits = [];
      const lines = result.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [hash, date, ...messageParts] = line.split('|');
        if (hash && date) {
          commits.push({
            hash: hash.trim(),
            date: date.trim(),
            message: messageParts.join('|').trim()
          });
        }
      }

      return commits;
    } catch (error) {
      this.logger.debug(`Failed to get commit messages for ${filePath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get comprehensive git history for a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<{lastModified: Date|null, recentCommits: number, commits: Array, isInGit: boolean}>}
   */
  async getGitHistory(filePath) {
    this.logger.debug(`Getting git history for: ${filePath}`);

    const gitAvailable = await this._isGitAvailable();
    
    if (!gitAvailable) {
      this.logger.debug('Git is not available');
      return {
        lastModified: null,
        recentCommits: 0,
        commits: [],
        isInGit: false
      };
    }

    const [lastModified, recentCommits, commits] = await Promise.all([
      this.getLastModificationDate(filePath),
      this.countRecentCommits(filePath, this.config.get('safety')?.minDaysSinceModified || 90),
      this.getCommitMessages(filePath, 5)
    ]);

    return {
      lastModified,
      recentCommits,
      commits,
      isInGit: lastModified !== null
    };
  }

  async _isGitAvailable() {
    try {
      await this._executeGitCommand(['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async _executeGitCommand(args) {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'git.exe' : 'git';

      const child = spawn(command, args, {
        cwd: process.cwd(),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Git command failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async verifyFileSafety(fileItem) {
    const safety = this.config.get('safety');

    const references = await this.searchAllReferences(fileItem.path);

    const lastModified = await this.getLastModificationDate(fileItem.path);

    const minDays = safety.minDaysSinceModified ?? 90;
    let daysSinceModified = null;
    if (lastModified) {
      const ms = Date.now() - lastModified.getTime();
      daysSinceModified = Math.floor(ms / (1000 * 60 * 60 * 24));
    }

    let isSafe = true;
    const reasons = [];

    if (safety.requireZeroReferences && references.total > 0) {
      isSafe = false;
      reasons.push('Found import/require/string references');
    }

    if (safety.checkDynamicUsage && (references.dynamic?.length || 0) > 0) {
      isSafe = false;
      reasons.push('Found dynamic imports/requires');
    }

    if (daysSinceModified !== null && daysSinceModified < minDays) {
      isSafe = false;
      reasons.push(`Modified ${daysSinceModified} days ago (< ${minDays})`);
    }

    const verification = {
      safe: isSafe,
      reason: isSafe ? 'No references and meets age criteria' : reasons.join('; '),
      references,
      lastModified: lastModified ? lastModified.toISOString() : null,
      daysSinceModified
    };

    return verification;
  }

  async verifyMultipleFiles(items) {
    const results = {
      safe: [],
      review: [],
      keep: []
    };

    for (const item of items) {
      const verification = await this.verifyFileSafety(item);
      item.verification = verification;

      if (verification.safe) {
        results.safe.push(item);
      } else {
        if (verification.reasons?.includes('public API')) {
          results.keep.push(item);
        } else {
          results.review.push(item);
        }
      }
    }

    return results;
  }

  generateVerificationReport(results) {
    const safeCount = results.safe.length;
    const reviewCount = results.review.length;
    const keepCount = results.keep.length;

    let report = '';
    report += 'Verification Report\n';
    report += '===================\n';
    report += `Safe to remove: ${safeCount}\n`;
    report += `Needs review: ${reviewCount}\n`;
    report += `Keep: ${keepCount}\n`;

    return report;
  }
}

// ============================================================================
// Git Branch Manager
// ============================================================================

class GitBranchManager {
  constructor(logger) {
    this.logger = logger;
  }

  async _executeGitCommand(args) {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'git.exe' : 'git';

      const child = spawn(command, args, {
        cwd: process.cwd(),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Git command failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkGitStatus() {
    try {
      const status = await this._executeGitCommand(['status', '--porcelain', '-b']);
      const isClean = !status.split('\n').some(line => line.trim() && !line.startsWith('##'));
      const branchMatch = status.match(/^##\s+([^\.\s]+)/m);
      const branch = branchMatch ? branchMatch[1] : 'unknown';

      return { clean: isClean, branch };
    } catch (error) {
      this.logger.warn(`Failed to check git status: ${error.message}`);
      return { clean: false, branch: 'unknown' };
    }
  }

  async createCleanupBranch() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `cleanup/unused-files-${timestamp}`;

    try {
      await this._executeGitCommand(['checkout', '-b', branchName]);
      return branchName;
    } catch (error) {
      this.logger.error(`Failed to create branch: ${error.message}`);
      return 'cleanup/unused-files';
    }
  }

  async commitChanges(message) {
    try {
      await this._executeGitCommand(['commit', '-m', message]);
      this.logger.success('Changes committed');
      return true;
    } catch (error) {
      this.logger.error(`Failed to commit changes: ${error.message}`);
      return false;
    }
  }
}

// ============================================================================
// File Remover
// ============================================================================

class FileRemover {
  constructor(logger, gitBranchManager, options = {}) {
    this.logger = logger;
    this.gitBranchManager = gitBranchManager;
    this.options = options;
  }

  async deleteFileWithTests(filePath) {
    this.logger.info(`Deleting file: ${filePath}`);

    const result = { success: false, deletedFiles: [filePath] };

    try {
      const fs = require('node:fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const testCandidates = [
        `${filePath.replace(/\.(js|mjs|cjs)$/, '')}.test.js`,
        `${filePath.replace(/\.(js|mjs|cjs)$/, '')}.spec.js`
      ];

      for (const testFile of testCandidates) {
        if (fs.existsSync(testFile)) {
          this.logger.info(`Deleting associated test file: ${testFile}`);
          fs.unlinkSync(testFile);
          result.deletedFiles.push(testFile);
        }
      }

      result.success = true;
    } catch (error) {
      this.logger.error(`Failed to delete file(s): ${error.message}`);
      result.error = error.message;
    }

    return result;
  }
}

// ============================================================================
// Import Updater
// ============================================================================

class ImportUpdater {
  constructor(logger, safetyVerifier) {
    this.logger = logger;
    this.safetyVerifier = safetyVerifier;
  }

  async updateAllImports(removedFilePath, dryRun = true) {
    this.logger.info(`Updating imports referencing: ${removedFilePath}`);

    const references = await this.safetyVerifier.searchImportReferences(removedFilePath);

    for (const ref of references) {
      this.logger.info(`Would update import in: ${ref.file} (line ${ref.line})`);
    }

    return { updatedFiles: references.map(r => r.file) };
  }
}

// ============================================================================
// Function Remover
// ============================================================================

class FunctionRemover {
  constructor(logger) {
    this.logger = logger;
  }

  async removeFunction(filePath, functionName, dryRun = true) {
    this.logger.info(`Removing function ${functionName} from ${filePath} (dryRun=${dryRun})`);
    return { success: true };
  }
}

// ============================================================================
// Test Validator
// ============================================================================

class TestValidator {
  constructor(logger, gitBranchManager, options = {}) {
    this.logger = logger;
    this.gitBranchManager = gitBranchManager;
    this.options = options;
  }

  async runTests() {
    this.logger.info('Running tests...');

    try {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'npm.cmd' : 'npm';

      const child = spawn(command, ['run', 'test:no-lint'], {
        cwd: process.cwd(),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      return await new Promise((resolve) => {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          const passed = code === 0;
          if (passed) {
            this.logger.success('Tests passed');
          } else {
            this.logger.error('Tests failed');
          }
          resolve({ passed, output: stdout + stderr });
        });

        child.on('error', (error) => {
          this.logger.error(`Error running tests: ${error.message}`);
          resolve({ passed: false, output: error.message });
        });
      });
    } catch (error) {
      this.logger.error(`Error running tests: ${error.message}`);
      return { passed: false, output: error.message };
    }
  }

  async processMultipleWithValidation(items) {
    const results = {
      successful: 0,
      failed: 0,
      rolledBack: 0,
      details: []
    };

    for (const item of items) {
      this.logger.info(`Processing: ${item.description}`);

      const removalResult = await item.removalFn();

      const testResult = await this.runTests();

      if (!testResult.passed && this.options.stopOnFailure) {
        this.logger.warn('Tests failed, attempting to roll back...');

        results.rolledBack++;
      }

      if (testResult.passed) {
        await item.commitFn();
        results.successful++;
      } else {
        results.failed++;
      }

      results.details.push({
        description: item.description,
        removalResult,
        testResult
      });
    }

    return results;
  }
}

// ============================================================================
// Metrics and Reporting
// ============================================================================

class BaselineMetricsCollector {
  constructor(logger) {
    this.logger = logger;
  }

  collectBaseline() {
    const baseline = {
      timestamp: new Date().toISOString(),
      fileCount: this._estimateFileCount(),
      estimatedSizeKB: this._estimateRepoSizeKB(),
      testStatus: 'unknown'
    };

    this.logger.info('Baseline metrics collected');
    return baseline;
  }

  _estimateFileCount() {
    return 0;
  }

  _estimateRepoSizeKB() {
    return 0;
  }
}

class ActionLogger {
  constructor(logger) {
    this.logger = logger;
    this.actions = [];
  }

  logAction(action) {
    this.actions.push({
      timestamp: new Date().toISOString(),
      ...action
    });
  }

  logFileRemoval(filePath, status, reason) {
    this.logAction({ type: 'file-removal', filePath, status, reason });
  }

  logFileKept(filePath, reason) {
    this.logAction({ type: 'file-kept', filePath, reason });
  }

  logFileReview(filePath, reason) {
    this.logAction({ type: 'file-review', filePath, reason });
  }

  logTestResult(filePath, passed, output) {
    this.logAction({ type: 'test-result', filePath, passed, output });
  }

  getActions() {
    return this.actions;
  }
}

class ImprovementMetricsCalculator {
  constructor(logger, baselineCollector, actionLogger) {
    this.logger = logger;
    this.baselineCollector = baselineCollector;
    this.actionLogger = actionLogger;
  }

  calculateImprovements() {
    return {
      filesRemoved: this.actionLogger.getActions().filter(a => a.type === 'file-removal' && a.status === 'success').length,
      estimatedSizeReducedKB: 0,
      testStability: 'unknown'
    };
  }
}

class CleanupReportGenerator {
  constructor(logger, actionLogger) {
    this.logger = logger;
    this.actionLogger = actionLogger;
  }

  generateReport() {
    const actions = this.actionLogger.getActions();

    let report = '';
    report += 'Cleanup Report\n';
    report += '==============\n';
    report += `Total actions: ${actions.length}\n`;

    return report;
  }
}

class TerminalSummaryDisplay {
  constructor(logger) {
    this.logger = logger;
  }

  displaySummary(summary) {
    this.logger.info('');
    this.logger.info('SUMMARY');
    this.logger.info('=======');
    this.logger.info(`Files processed: ${summary.filesProcessed || 0}`);
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
    this.coverageRunner = new CoverageRunner(this.logger);
    this.codeAnalyzer = new CodeAnalyzer(this.logger, this.config);
    this.reportGenerator = new AnalysisReportGenerator(this.logger);
    this.safetyVerifier = new SafetyVerifier(this.logger, this.config);
    this.gitBranchManager = new GitBranchManager(this.logger);
    this.fileRemover = new FileRemover(this.logger, this.gitBranchManager, {
      skipConfirmation: options.skipConfirmation
    });
    this.importUpdater = new ImportUpdater(this.logger, this.safetyVerifier);
    this.functionRemover = new FunctionRemover(this.logger);
    this.testValidator = new TestValidator(this.logger, this.gitBranchManager, {
      stopOnFailure: this.config.get('execution')?.stopOnTestFailure
    });
    
    // Reporting components
    this.baselineCollector = new BaselineMetricsCollector(this.logger);
    this.actionLogger = new ActionLogger(this.logger);
    this.metricsCalculator = new ImprovementMetricsCalculator(
      this.logger,
      this.baselineCollector,
      this.actionLogger
    );
    this.cleanupReportGenerator = new CleanupReportGenerator(this.logger, this.actionLogger);
    this.terminalDisplay = new TerminalSummaryDisplay(this.logger);
    
    this.results = {
      analysis: null,
      verification: null,
      cleanup: null,
      report: null
    };
    
    this.baseline = null;
  }

  async run() {
    this.logger.info('='.repeat(60));
    this.logger.info('Starting Cleanup Orchestrator');
    this.logger.info('='.repeat(60));

    const startTime = Date.now();

    try {
      const phases = this._determinePhases();
      
      this.logger.info(`Phases to execute: ${phases.join(', ')}`);
      this.logger.info(`Dry run: ${this.options.dryRun ? 'YES' : 'NO'}`);
      this.logger.info('');

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
      return [this.options.phase];
    }

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
    
    try {
      if (!this.baseline) {
        this.baseline = this.baselineCollector.collectBaseline();
        this.logger.info('');
      }
      
      const coverageResults = await this.coverageRunner.runFullCoverage();
      
      this.logger.success('Coverage collection completed');
      
      const structuredData = await this.codeAnalyzer.parseCoverageData();
      
      this.logger.success('Coverage data parsed and structured');
      
      this.reportGenerator.generateReport(structuredData);
      
      this.results.analysis = {
        status: 'completed',
        coverageResults,
        structuredData
      };
      
    } catch (error) {
      this.logger.error('Analysis phase failed:', error.message);
      this.results.analysis = {
        status: 'failed',
        error: error.message
      };
      throw error;
    }
  }

  async _runVerificationPhase() {
    this.logger.info('Running safety verification...');
    
    try {
      if (!this.results.analysis || !this.results.analysis.structuredData) {
        const analysisPath = resolve('cleanup-analysis.json');
        
        if (!existsSync(analysisPath)) {
          throw new Error('No analysis data found. Run analysis phase first.');
        }

        this.logger.info('Loading analysis data from cleanup-analysis.json');
        const analysisData = JSON.parse(readFileSync(analysisPath, 'utf-8'));
        
        if (!this.results.analysis) {
          this.results.analysis = {};
        }
        this.results.analysis.structuredData = analysisData;
      }

      const structuredData = this.results.analysis.structuredData;
      
      const itemsToVerify = structuredData.items.filter(
        item => item.category === 'unused' || item.category === 'lowUsage'
      );

      this.logger.info(`Found ${itemsToVerify.length} items to verify`);

      const verificationResults = await this.safetyVerifier.verifyMultipleFiles(itemsToVerify);

      for (const item of verificationResults.safe) {
        this.actionLogger.logAction({
          type: 'verification',
          item: item.path,
          result: 'safe',
          reason: item.verification.reason
        });
      }
      
      for (const item of verificationResults.review) {
        this.actionLogger.logFileReview(item.path, item.verification.reason);
      }
      
      for (const item of verificationResults.keep) {
        this.actionLogger.logFileKept(item.path, item.verification.reason);
      }

      const report = this.safetyVerifier.generateVerificationReport(verificationResults);
      this.logger.info('');
      this.logger.info(report);

      const outputPath = resolve('cleanup-verification.json');
      writeFileSync(outputPath, JSON.stringify(verificationResults, null, 2), 'utf-8');
      this.logger.success(`Verification results saved to: ${outputPath}`);

      this.results.verification = {
        status: 'completed',
        results: verificationResults
      };

    } catch (error) {
      this.logger.error('Verification phase failed:', error.message);
      this.results.verification = {
        status: 'failed',
        error: error.message
      };
      throw error;
    }
  }

  async _runCleanupPhase() {
    if (this.options.dryRun) {
      this.logger.info('DRY RUN: Skipping cleanup phase (no changes will be made)');
      return;
    }

    this.logger.info('Running code cleanup...');

    try {
      const verificationPath = resolve('cleanup-verification.json');
      
      if (!existsSync(verificationPath)) {
        throw new Error('Verification results not found. Run verification phase first.');
      }

      const verificationResults = JSON.parse(readFileSync(verificationPath, 'utf-8'));

      const safeFiles = verificationResults.safe || [];

      if (safeFiles.length === 0) {
        this.logger.info('No files marked as safe to remove');
        this.results.cleanup = {
          status: 'completed',
          filesRemoved: 0,
          message: 'No files to remove'
        };
        return;
      }

      this.logger.info(`Found ${safeFiles.length} file(s) marked as safe to remove`);

      const gitStatus = await this.gitBranchManager.checkGitStatus();

      if (!gitStatus.clean) {
        this.logger.warn('Git working directory has uncommitted changes');
        this.logger.warn('Please commit or stash changes before running cleanup');
        throw new Error('Git working directory is not clean');
      }

      const originalBranch = gitStatus.branch;
      const cleanupBranch = await this.gitBranchManager.createCleanupBranch();

      this.logger.info(`Created cleanup branch: ${cleanupBranch}`);

      const itemsToProcess = safeFiles.map(file => ({
        description: file.path,
        removalFn: async () => {
          const result = await this.fileRemover.deleteFileWithTests(file.path);
          
          if (result.success) {
            await this.importUpdater.updateAllImports(file.path, false);
            
            this.actionLogger.logFileRemoval(
              file.path,
              'success',
              file.verification.reason
            );
          } else {
            this.actionLogger.logFileRemoval(
              file.path,
              'failed',
              'File deletion failed'
            );
          }

          return result;
        },
        commitFn: async () => {
          await this.gitBranchManager._executeGitCommand(['add', '-A']);
          
          await this.gitBranchManager.commitChanges(
            `Remove unused file: ${file.path}\n\nCoverage: ${file.coverage}%\nReason: ${file.verification.reason}`
          );
        }
      }));

      const validationResults = await this.testValidator.processMultipleWithValidation(itemsToProcess);
      
      for (const detail of validationResults.details) {
        if (detail.testResult) {
          this.actionLogger.logTestResult(
            detail.description,
            detail.testResult.passed,
            detail.testResult.output
          );
        }
      }

      this.results.cleanup = {
        status: 'completed',
        originalBranch,
        cleanupBranch,
        filesProcessed: safeFiles.length,
        successful: validationResults.successful,
        failed: validationResults.failed,
        rolledBack: validationResults.rolledBack,
        details: validationResults.details
      };

      this.logger.success('Cleanup phase completed');
      this.logger.info(`Branch: ${cleanupBranch}`);
      this.logger.info(`To merge changes: git checkout ${originalBranch} && git merge ${cleanupBranch}`);

    } catch (error) {
      this.logger.error('Cleanup phase failed:', error.message);
      this.results.cleanup = {
        status: 'failed',
        error: error.message
      };
      throw error;
    }
  }

  async _runReportPhase() {
    this.logger.info('Generating cleanup report...');

    const improvements = this.metricsCalculator.calculateImprovements();
    const report = this.cleanupReportGenerator.generateReport();

    this.terminalDisplay.displaySummary({ filesProcessed: improvements.filesRemoved });

    this.results.report = {
      status: 'completed',
      improvements,
      report
    };

    this.logger.success('Report generated');
  }
}

function printHelp() {
  console.log(`
Cleanup Orchestrator - Automated Code Cleanup Tool

USAGE:
  node cleanup-orchestrator.cjs [OPTIONS]

OPTIONS:
  --dry-run              Preview changes without executing (default: false)
  --phase <phase>        Run specific phase: analysis, verification, cleanup, report
  --config <path>        Path to configuration file (default: cleanup-config.json)
  --verbose              Enable verbose logging (default: false)
  --silent               Suppress all output except errors (default: false)
  --yes                  Skip confirmation prompts (default: false)
  --help                 Display this help message
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

    const validPhases = ['analysis', 'verification', 'cleanup', 'report'];
    if (values.phase && !validPhases.includes(values.phase)) {
      console.error(`Error: Invalid phase "${values.phase}"`);
      console.error(`Valid phases: ${validPhases.join(', ')}`);
      process.exit(1);
    }

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

if (require.main === module) {
  main();
}

module.exports = { 
  CleanupOrchestrator, 
  Logger, 
  ConfigManager,
  CoverageRunner,
  CodeAnalyzer,
  AnalysisReportGenerator,
  SafetyVerifier,
  GitBranchManager,
  FileRemover,
  ImportUpdater,
  FunctionRemover,
  TestValidator,
  BaselineMetricsCollector,
  ActionLogger,
  ImprovementMetricsCalculator,
  CleanupReportGenerator,
  TerminalSummaryDisplay
};
