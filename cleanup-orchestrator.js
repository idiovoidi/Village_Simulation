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
    const fileName = filePath.split(/[/\\]/).pop();
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
    const fileName = filePath.split(/[/\\]/).pop();
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
    const fileName = filePath.split(/[/\\]/).pop();
    const fileNameWithoutExt = fileName.replace(/\.(js|mjs|cjs)$/, '');
    
    // Search for the filename in strings (but not in comments)
    const pattern = `['"\`][^'"\`]*${fileNameWithoutExt}[^'"\`]*['"\`]`;
    
    try {
      const results = await this._grepSearch(pattern);
      
      // Filter out import/require statements (already covered)
      const filtered = results.filter(ref => {
        const content = ref.content.trim();
        return !content.match(/^\s*(import|require|from)\s/) &&
               !content.match(/\/\//) && // Not in single-line comment
               !content.match(/\/\*/);   // Not in multi-line comment
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
        // Windows findstr doesn't support regex well, so we'll use a simpler approach
        // We'll search for the base filename and filter in JavaScript
        command = 'findstr';
        args = [
          '/S',  // Search subdirectories
          '/N',  // Show line numbers
          '/I',  // Case insensitive
          '/R',  // Regular expression (limited)
          pattern.replace(/\\/g, ''),  // Remove escape characters for findstr
          '*.js', '*.mjs', '*.cjs'
        ];
      } else {
        // Unix grep with better regex support
        command = 'grep';
        args = [
          '-r',           // Recursive
          '-n',           // Line numbers
          '-i',           // Case insensitive
          '-E',           // Extended regex
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
        // grep returns 1 if no matches found, which is not an error
        if (code === 0 || code === 1) {
          const results = this._parseGrepOutput(stdout);
          resolve(results);
        } else {
          reject(new Error(`Search failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        // If grep/findstr not available, return empty results
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

      // Parse format: filename:lineNumber:content
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
      // Use %ai instead of %aI for better Windows compatibility
      const result = await this._executeGitCommand([
        'log',
        '-1',
        '--format=%ai',  // ISO-like format that works on Windows
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
      // Use simpler format that works on Windows
      const result = await this._executeGitCommand([
        'log',
        `-${limit}`,
        '--format=%H|%ai|%s',  // hash|date|subject (use %ai instead of %aI for Windows compatibility)
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

    // Check if git is available
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
      this.countRecentCommits(filePath, this.config.get('safety').minDaysSinceModified || 90),
      this.getCommitMessages(filePath, 5)
    ]);

    return {
      lastModified,
      recentCommits,
      commits,
      isInGit: lastModified !== null
    };
  }

  /**
   * Check if git is available
   * @private
   * @returns {Promise<boolean>}
   */
  async _isGitAvailable() {
    try {
      await this._executeGitCommand(['--version']);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute a git command
   * @private
   * @param {Array<string>} args - Git command arguments
   * @returns {Promise<string>} Command output
   */
  async _executeGitCommand(args) {
    return new Promise((resolve, reject) => {
      // Don't use shell on Windows to avoid format string issues
      const child = spawn('git', args, {
        cwd: process.cwd(),
        shell: false
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
          reject(new Error(`Git command failed: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if a file has ES module export statements
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>}
   */
  async hasESModuleExports(filePath) {
    try {
      const fullPath = resolve(filePath);
      
      if (!existsSync(fullPath)) {
        return false;
      }

      const content = readFileSync(fullPath, 'utf-8');
      
      // Check for ES6 export patterns
      const exportPatterns = [
        /export\s+default\s+/,           // export default
        /export\s+\{/,                   // export { ... }
        /export\s+\*/,                   // export * from
        /export\s+(const|let|var|function|class)\s+/  // export const/let/var/function/class
      ];

      return exportPatterns.some(pattern => pattern.test(content));
    } catch (error) {
      this.logger.debug(`Failed to check ES exports for ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a file has CommonJS module.exports
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>}
   */
  async hasCommonJSExports(filePath) {
    try {
      const fullPath = resolve(filePath);
      
      if (!existsSync(fullPath)) {
        return false;
      }

      const content = readFileSync(fullPath, 'utf-8');
      
      // Check for CommonJS export patterns
      const exportPatterns = [
        /module\.exports\s*=/,           // module.exports =
        /exports\.\w+\s*=/,              // exports.something =
        /module\.exports\.\w+\s*=/       // module.exports.something =
      ];

      return exportPatterns.some(pattern => pattern.test(content));
    } catch (error) {
      this.logger.debug(`Failed to check CommonJS exports for ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a file is referenced in package.json
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>}
   */
  async isInPackageJson(filePath) {
    try {
      const packageJsonPath = resolve('package.json');
      
      if (!existsSync(packageJsonPath)) {
        return false;
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const fileName = filePath.split(/[/\\]/).pop();
      
      // Check main field
      if (packageJson.main && packageJson.main.includes(fileName)) {
        return true;
      }

      // Check exports field
      if (packageJson.exports) {
        const exportsStr = JSON.stringify(packageJson.exports);
        if (exportsStr.includes(fileName)) {
          return true;
        }
      }

      // Check bin field
      if (packageJson.bin) {
        const binStr = JSON.stringify(packageJson.bin);
        if (binStr.includes(fileName)) {
          return true;
        }
      }

      // Check scripts field (files referenced in npm scripts)
      if (packageJson.scripts) {
        const scriptsStr = JSON.stringify(packageJson.scripts);
        if (scriptsStr.includes(fileName)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.debug(`Failed to check package.json for ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a file is in a public-facing directory
   * @param {string} filePath - Path to the file
   * @returns {boolean}
   */
  isInPublicDirectory(filePath) {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Directories that are typically internal/private
    const internalDirs = [
      '/internal/',
      '/private/',
      '/__tests__/',
      '/test/',
      '/tests/',
      '/.git/',
      '/node_modules/',
      '/coverage/'
    ];

    // Check if file is in an internal directory
    const isInternal = internalDirs.some(dir => normalizedPath.includes(dir));
    
    // If not in internal directory, consider it potentially public
    return !isInternal;
  }

  /**
   * Determine if a file is part of the public API
   * @param {string} filePath - Path to the file
   * @returns {Promise<{isPublicAPI: boolean, reasons: Array<string>}>}
   */
  async isPublicAPI(filePath) {
    this.logger.debug(`Checking if ${filePath} is part of public API`);

    const reasons = [];
    
    const [hasESExports, hasCommonExports, inPackageJson] = await Promise.all([
      this.hasESModuleExports(filePath),
      this.hasCommonJSExports(filePath),
      this.isInPackageJson(filePath)
    ]);

    const inPublicDir = this.isInPublicDirectory(filePath);

    if (hasESExports) {
      reasons.push('Has ES module exports');
    }

    if (hasCommonExports) {
      reasons.push('Has CommonJS exports');
    }

    if (inPackageJson) {
      reasons.push('Referenced in package.json');
    }

    if (inPublicDir) {
      reasons.push('Located in public-facing directory');
    }

    // Consider it public API if it has exports and is in a public directory,
    // or if it's explicitly referenced in package.json
    const isPublicAPI = inPackageJson || 
                       ((hasESExports || hasCommonExports) && inPublicDir);

    return {
      isPublicAPI,
      reasons
    };
  }

  /**
   * Verify if a file is safe to remove
   * @param {string} filePath - Path to the file
   * @param {object} coverageItem - Coverage data for the file
   * @returns {Promise<{safe: boolean, category: string, reason: string, details: object}>}
   */
  async verifyFile(filePath, coverageItem = {}) {
    this.logger.info(`Verifying safety for: ${filePath}`);

    // Gather all verification data
    const [references, gitHistory, publicAPI] = await Promise.all([
      this.searchAllReferences(filePath),
      this.getGitHistory(filePath),
      this.isPublicAPI(filePath)
    ]);

    // Apply decision rules
    const decision = this._categorizeFile({
      filePath,
      coverageItem,
      references,
      gitHistory,
      publicAPI
    });

    this.logger.debug(`Verification result for ${filePath}: ${decision.category}`);

    return decision;
  }

  /**
   * Categorize a file based on verification data
   * @private
   * @param {object} data - All verification data
   * @returns {object} Decision with category, reason, and details
   */
  _categorizeFile(data) {
    const { filePath, coverageItem, references, gitHistory, publicAPI } = data;
    const safetyConfig = this.config.get('safety');
    
    const coverage = coverageItem.coverage || 0;
    const hasReferences = references.total > 0;
    const hasRecentCommits = gitHistory.recentCommits > 0;
    const isPublic = publicAPI.isPublicAPI;

    const details = {
      coverage,
      references: references.total,
      recentCommits: gitHistory.recentCommits,
      lastModified: gitHistory.lastModified,
      isPublicAPI: isPublic,
      publicAPIReasons: publicAPI.reasons,
      referenceDetails: {
        imports: references.imports.length,
        dynamic: references.dynamic.length,
        strings: references.strings.length
      }
    };

    // Rule 1: SAFE - 0% coverage, no references, not public API, no recent commits
    if (coverage === 0 && 
        !hasReferences && 
        !isPublic && 
        !hasRecentCommits) {
      return {
        safe: true,
        category: 'safe',
        reason: 'File has 0% coverage, no references, not part of public API, and no recent commits',
        details
      };
    }

    // Rule 2: KEEP - Has active references or is critical
    if (hasReferences && coverage > 30) {
      return {
        safe: false,
        category: 'keep',
        reason: `File has ${references.total} reference(s) and ${coverage}% coverage - actively used`,
        details
      };
    }

    // Rule 3: KEEP - Public API with any usage
    if (isPublic && coverage > 0) {
      return {
        safe: false,
        category: 'keep',
        reason: `File is part of public API (${publicAPI.reasons.join(', ')}) and has ${coverage}% coverage`,
        details
      };
    }

    // Rule 4: KEEP - Recent activity
    if (hasRecentCommits) {
      return {
        safe: false,
        category: 'keep',
        reason: `File has ${gitHistory.recentCommits} commit(s) in the last ${safetyConfig.minDaysSinceModified} days - actively maintained`,
        details
      };
    }

    // Rule 5: REVIEW - Low coverage but has some references
    if (coverage < 30 && hasReferences) {
      return {
        safe: false,
        category: 'review',
        reason: `File has low coverage (${coverage}%) but has ${references.total} reference(s) - needs manual review`,
        details
      };
    }

    // Rule 6: REVIEW - Public API but unused
    if (isPublic && coverage === 0) {
      return {
        safe: false,
        category: 'review',
        reason: `File is part of public API but has 0% coverage - may be unused external interface`,
        details
      };
    }

    // Rule 7: REVIEW - Has dynamic references
    if (references.dynamic.length > 0) {
      return {
        safe: false,
        category: 'review',
        reason: `File has ${references.dynamic.length} dynamic import(s) - may be loaded conditionally`,
        details
      };
    }

    // Rule 8: SAFE - Low/no coverage, no references, not public, no recent activity
    if (coverage < 30 && !hasReferences && !isPublic && !hasRecentCommits) {
      return {
        safe: true,
        category: 'safe',
        reason: `File has low coverage (${coverage}%), no references, not public API, and no recent activity`,
        details
      };
    }

    // Default: REVIEW - Uncertain case
    return {
      safe: false,
      category: 'review',
      reason: 'File does not clearly match safe or keep criteria - needs manual review',
      details
    };
  }

  /**
   * Verify multiple files and generate a verification report
   * @param {Array<object>} items - Array of coverage items to verify
   * @returns {Promise<{safe: Array, review: Array, keep: Array, summary: object}>}
   */
  async verifyMultipleFiles(items) {
    this.logger.info(`Verifying ${items.length} files...`);

    const results = {
      safe: [],
      review: [],
      keep: [],
      summary: {
        total: items.length,
        safe: 0,
        review: 0,
        keep: 0
      }
    };

    // Process files in batches to avoid overwhelming the system
    const batchSize = 10;
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      this.logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(item => this.verifyFile(item.path, item))
      );

      // Categorize results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const item = batch[j];
        
        const verifiedItem = {
          ...item,
          verification: result
        };

        results[result.category].push(verifiedItem);
        results.summary[result.category]++;
      }
    }

    this.logger.success('Verification complete');
    this.logger.info(`Safe to remove: ${results.summary.safe}`);
    this.logger.info(`Needs review: ${results.summary.review}`);
    this.logger.info(`Keep: ${results.summary.keep}`);

    return results;
  }

  /**
   * Generate a verification report
   * @param {object} verificationResults - Results from verifyMultipleFiles
   * @returns {string} Formatted report
   */
  generateVerificationReport(verificationResults) {
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push('SAFETY VERIFICATION REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    
    // Summary
    lines.push('SUMMARY:');
    lines.push(`  Total files analyzed: ${verificationResults.summary.total}`);
    lines.push(`  Safe to remove: ${verificationResults.summary.safe}`);
    lines.push(`  Needs review: ${verificationResults.summary.review}`);
    lines.push(`  Keep: ${verificationResults.summary.keep}`);
    lines.push('');

    // Safe to remove
    if (verificationResults.safe.length > 0) {
      lines.push('✅ SAFE TO REMOVE:');
      lines.push('');
      
      for (const item of verificationResults.safe) {
        lines.push(`  ${item.path}`);
        lines.push(`    Coverage: ${item.coverage}%`);
        lines.push(`    Reason: ${item.verification.reason}`);
        lines.push('');
      }
    }

    // Needs review
    if (verificationResults.review.length > 0) {
      lines.push('⚠️  NEEDS MANUAL REVIEW:');
      lines.push('');
      
      for (const item of verificationResults.review) {
        lines.push(`  ${item.path}`);
        lines.push(`    Coverage: ${item.coverage}%`);
        lines.push(`    Reason: ${item.verification.reason}`);
        lines.push(`    References: ${item.verification.details.references}`);
        lines.push('');
      }
    }

    // Keep
    if (verificationResults.keep.length > 0) {
      lines.push('🔒 KEEP (ACTIVELY USED):');
      lines.push('');
      
      for (const item of verificationResults.keep.slice(0, 10)) {
        lines.push(`  ${item.path}`);
        lines.push(`    Coverage: ${item.coverage}%`);
        lines.push(`    Reason: ${item.verification.reason}`);
        lines.push('');
      }
      
      if (verificationResults.keep.length > 10) {
        lines.push(`  ... and ${verificationResults.keep.length - 10} more files`);
        lines.push('');
      }
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}

// ============================================================================
// Git Branch Manager
// ============================================================================

class GitBranchManager {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Execute a git command
   * @private
   * @param {Array<string>} args - Git command arguments
   * @returns {Promise<string>} Command output
   */
  async _executeGitCommand(args) {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, {
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
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed (exit code ${code}): ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute git: ${error.message}`));
      });
    });
  }

  /**
   * Check current git status before starting cleanup
   * @returns {Promise<{clean: boolean, branch: string, uncommitted: Array<string>}>}
   */
  async checkGitStatus() {
    this.logger.info('Checking git status...');

    try {
      // Get current branch
      const branchOutput = await this._executeGitCommand(['branch', '--show-current']);
      const currentBranch = branchOutput.trim();

      // Check for uncommitted changes
      const statusOutput = await this._executeGitCommand(['status', '--porcelain']);
      const uncommittedFiles = statusOutput
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim());

      const isClean = uncommittedFiles.length === 0;

      if (isClean) {
        this.logger.success(`Git status is clean on branch: ${currentBranch}`);
      } else {
        this.logger.warn(`Found ${uncommittedFiles.length} uncommitted changes`);
        this.logger.debug('Uncommitted files:', uncommittedFiles);
      }

      return {
        clean: isClean,
        branch: currentBranch,
        uncommitted: uncommittedFiles
      };
    } catch (error) {
      this.logger.error('Failed to check git status:', error.message);
      throw error;
    }
  }

  /**
   * Create a cleanup branch with timestamp
   * @param {string} baseName - Base name for the branch (default: 'cleanup')
   * @returns {Promise<string>} Name of the created branch
   */
  async createCleanupBranch(baseName = 'cleanup') {
    this.logger.info('Creating cleanup branch...');

    try {
      // Generate branch name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const timeComponent = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      const branchName = `${baseName}-${timestamp}-${timeComponent}`;

      // Create and checkout new branch
      await this._executeGitCommand(['checkout', '-b', branchName]);

      this.logger.success(`Created and switched to branch: ${branchName}`);
      return branchName;
    } catch (error) {
      this.logger.error('Failed to create cleanup branch:', error.message);
      throw error;
    }
  }

  /**
   * Commit changes with descriptive message
   * @param {string} message - Commit message
   * @param {Array<string>} files - Optional list of specific files to commit
   * @returns {Promise<string>} Commit hash
   */
  async commitChanges(message, files = []) {
    this.logger.info('Committing changes...');

    try {
      // Stage files
      if (files.length > 0) {
        // Stage specific files
        for (const file of files) {
          await this._executeGitCommand(['add', file]);
        }
        this.logger.debug(`Staged ${files.length} files`);
      } else {
        // Stage all changes
        await this._executeGitCommand(['add', '-A']);
        this.logger.debug('Staged all changes');
      }

      // Commit
      await this._executeGitCommand(['commit', '-m', message]);

      // Get commit hash
      const hashOutput = await this._executeGitCommand(['rev-parse', 'HEAD']);
      const commitHash = hashOutput.trim().substring(0, 7);

      this.logger.success(`Committed changes: ${commitHash} - ${message}`);
      return commitHash;
    } catch (error) {
      this.logger.error('Failed to commit changes:', error.message);
      throw error;
    }
  }

  /**
   * Rollback changes if tests fail
   * @param {string} commitHash - Optional commit hash to rollback to
   * @returns {Promise<void>}
   */
  async rollbackChanges(commitHash = null) {
    this.logger.warn('Rolling back changes...');

    try {
      if (commitHash) {
        // Reset to specific commit
        await this._executeGitCommand(['reset', '--hard', commitHash]);
        this.logger.success(`Rolled back to commit: ${commitHash}`);
      } else {
        // Reset to HEAD (undo uncommitted changes)
        await this._executeGitCommand(['reset', '--hard', 'HEAD']);
        this.logger.success('Rolled back uncommitted changes');
      }
    } catch (error) {
      this.logger.error('Failed to rollback changes:', error.message);
      throw error;
    }
  }

  /**
   * Rollback last commit
   * @returns {Promise<void>}
   */
  async rollbackLastCommit() {
    this.logger.warn('Rolling back last commit...');

    try {
      // Get the commit hash before HEAD
      const hashOutput = await this._executeGitCommand(['rev-parse', 'HEAD~1']);
      const previousCommit = hashOutput.trim().substring(0, 7);

      // Reset to previous commit
      await this._executeGitCommand(['reset', '--hard', 'HEAD~1']);

      this.logger.success(`Rolled back to previous commit: ${previousCommit}`);
    } catch (error) {
      this.logger.error('Failed to rollback last commit:', error.message);
      throw error;
    }
  }

  /**
   * Get current commit hash
   * @returns {Promise<string>} Current commit hash (short)
   */
  async getCurrentCommit() {
    try {
      const hashOutput = await this._executeGitCommand(['rev-parse', 'HEAD']);
      return hashOutput.trim().substring(0, 7);
    } catch (error) {
      this.logger.error('Failed to get current commit:', error.message);
      throw error;
    }
  }

  /**
   * Switch back to original branch and optionally delete cleanup branch
   * @param {string} originalBranch - Branch to switch back to
   * @param {string} cleanupBranch - Cleanup branch to delete (optional)
   * @returns {Promise<void>}
   */
  async switchToOriginalBranch(originalBranch, cleanupBranch = null) {
    this.logger.info(`Switching back to branch: ${originalBranch}`);

    try {
      // Switch to original branch
      await this._executeGitCommand(['checkout', originalBranch]);
      this.logger.success(`Switched to branch: ${originalBranch}`);

      // Optionally delete cleanup branch
      if (cleanupBranch) {
        try {
          await this._executeGitCommand(['branch', '-D', cleanupBranch]);
          this.logger.success(`Deleted cleanup branch: ${cleanupBranch}`);
        } catch (error) {
          this.logger.warn(`Failed to delete cleanup branch: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to switch branch:', error.message);
      throw error;
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
    this.skipConfirmation = options.skipConfirmation || false;
    this.fs = require('node:fs');
    this.path = require('node:path');
    this.readline = require('node:readline');
  }

  /**
   * Delete a file from filesystem
   * @param {string} filePath - Path to the file to delete
   * @returns {Promise<{success: boolean, path: string, error?: string}>}
   */
  async deleteFile(filePath) {
    this.logger.info(`Deleting file: ${filePath}`);

    try {
      const resolvedPath = resolve(filePath);

      // Check if file exists
      if (!existsSync(resolvedPath)) {
        this.logger.warn(`File not found: ${filePath}`);
        return {
          success: false,
          path: filePath,
          error: 'File not found'
        };
      }

      // Delete the file
      this.fs.unlinkSync(resolvedPath);

      this.logger.success(`Deleted: ${filePath}`);
      return {
        success: true,
        path: filePath
      };
    } catch (error) {
      this.logger.error(`Failed to delete ${filePath}:`, error.message);
      return {
        success: false,
        path: filePath,
        error: error.message
      };
    }
  }

  /**
   * Find associated test files for a given file
   * @param {string} filePath - Path to the source file
   * @returns {Array<string>} Array of test file paths
   */
  findTestFiles(filePath) {
    this.logger.debug(`Finding test files for: ${filePath}`);

    const testFiles = [];
    const parsedPath = this.path.parse(filePath);
    const baseName = parsedPath.name;
    const dirName = parsedPath.dir;

    // Common test file patterns
    const patterns = [
      // Same directory
      this.path.join(dirName, `${baseName}.test.js`),
      this.path.join(dirName, `${baseName}.spec.js`),
      this.path.join(dirName, `${baseName}.test.mjs`),
      this.path.join(dirName, `${baseName}.spec.mjs`),
      // Test subdirectory
      this.path.join(dirName, 'test', `${baseName}.test.js`),
      this.path.join(dirName, 'test', `${baseName}.spec.js`),
      this.path.join(dirName, '__tests__', `${baseName}.test.js`),
      this.path.join(dirName, '__tests__', `${baseName}.spec.js`),
      // Root test directory
      this.path.join('test', `${baseName}.test.js`),
      this.path.join('test', `${baseName}.spec.js`),
      // With 'test-' prefix
      this.path.join(dirName, `test-${baseName}.js`),
      this.path.join('.', `test-${baseName}.js`)
    ];

    // Check which test files exist
    for (const pattern of patterns) {
      if (existsSync(pattern)) {
        testFiles.push(pattern);
        this.logger.debug(`Found test file: ${pattern}`);
      }
    }

    return testFiles;
  }

  /**
   * Delete a file and its associated test files
   * @param {string} filePath - Path to the file to delete
   * @returns {Promise<{success: boolean, deleted: Array<string>, failed: Array<string>}>}
   */
  async deleteFileWithTests(filePath) {
    this.logger.info(`Deleting file and associated tests: ${filePath}`);

    const deleted = [];
    const failed = [];

    // Find test files
    const testFiles = this.findTestFiles(filePath);

    if (testFiles.length > 0) {
      this.logger.info(`Found ${testFiles.length} associated test file(s)`);
    }

    // Delete main file
    const mainResult = await this.deleteFile(filePath);
    if (mainResult.success) {
      deleted.push(filePath);
    } else {
      failed.push(filePath);
    }

    // Delete test files
    for (const testFile of testFiles) {
      const testResult = await this.deleteFile(testFile);
      if (testResult.success) {
        deleted.push(testFile);
      } else {
        failed.push(testFile);
      }
    }

    return {
      success: failed.length === 0,
      deleted,
      failed
    };
  }

  /**
   * Stage file deletions in git
   * @param {Array<string>} filePaths - Array of file paths to stage
   * @returns {Promise<void>}
   */
  async stageFileDeletions(filePaths) {
    this.logger.info(`Staging ${filePaths.length} file deletion(s) in git...`);

    try {
      for (const filePath of filePaths) {
        await this.gitBranchManager._executeGitCommand(['add', filePath]);
      }

      this.logger.success(`Staged ${filePaths.length} file deletion(s)`);
    } catch (error) {
      this.logger.error('Failed to stage deletions:', error.message);
      throw error;
    }
  }

  /**
   * Prompt user for confirmation
   * @private
   * @param {string} message - Confirmation message
   * @returns {Promise<boolean>} True if user confirms
   */
  async _promptConfirmation(message) {
    if (this.skipConfirmation) {
      return true;
    }

    const rl = this.readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${message} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Remove a file with confirmation prompt
   * @param {string} filePath - Path to the file to delete
   * @returns {Promise<{success: boolean, deleted: Array<string>, skipped: boolean}>}
   */
  async removeFileWithConfirmation(filePath) {
    this.logger.info(`Preparing to remove: ${filePath}`);

    // Find test files
    const testFiles = this.findTestFiles(filePath);
    const allFiles = [filePath, ...testFiles];

    // Show what will be deleted
    this.logger.info('Files to be deleted:');
    for (const file of allFiles) {
      this.logger.info(`  - ${file}`);
    }

    // Ask for confirmation
    const confirmed = await this._promptConfirmation(
      `Delete ${allFiles.length} file(s)?`
    );

    if (!confirmed) {
      this.logger.info('Deletion cancelled by user');
      return {
        success: false,
        deleted: [],
        skipped: true
      };
    }

    // Proceed with deletion
    const result = await this.deleteFileWithTests(filePath);

    // Stage deletions in git
    if (result.deleted.length > 0) {
      await this.stageFileDeletions(result.deleted);
    }

    return {
      ...result,
      skipped: false
    };
  }

  /**
   * Remove multiple files with batch confirmation
   * @param {Array<string>} filePaths - Array of file paths to delete
   * @returns {Promise<{totalDeleted: number, totalFailed: number, totalSkipped: number, details: Array}>}
   */
  async removeMultipleFiles(filePaths) {
    this.logger.info(`Preparing to remove ${filePaths.length} file(s)...`);

    const results = {
      totalDeleted: 0,
      totalFailed: 0,
      totalSkipped: 0,
      details: []
    };

    for (const filePath of filePaths) {
      const result = await this.removeFileWithConfirmation(filePath);

      results.details.push({
        path: filePath,
        ...result
      });

      if (result.skipped) {
        results.totalSkipped++;
      } else if (result.success) {
        results.totalDeleted += result.deleted.length;
      } else {
        results.totalFailed += result.failed.length;
      }
    }

    this.logger.info('');
    this.logger.info('Removal Summary:');
    this.logger.info(`  Deleted: ${results.totalDeleted} file(s)`);
    this.logger.info(`  Failed: ${results.totalFailed} file(s)`);
    this.logger.info(`  Skipped: ${results.totalSkipped} file(s)`);

    return results;
  }
}

// ============================================================================
// Import Statement Updater
// ============================================================================

class ImportUpdater {
  constructor(logger, safetyVerifier) {
    this.logger = logger;
    this.safetyVerifier = safetyVerifier;
    this.fs = require('node:fs');
  }

  /**
   * Search for all files that import the removed file
   * @param {string} removedFilePath - Path to the removed file
   * @returns {Promise<Array<{file: string, line: number, content: string}>>}
   */
  async findImportingFiles(removedFilePath) {
    this.logger.info(`Finding files that import: ${removedFilePath}`);

    const references = await this.safetyVerifier.searchImportReferences(removedFilePath);

    this.logger.info(`Found ${references.length} file(s) with import statements`);
    return references;
  }

  /**
   * Remove or comment out import statements in a file
   * @param {string} filePath - Path to the file to update
   * @param {string} removedFilePath - Path to the removed file
   * @param {boolean} comment - If true, comment out instead of removing (default: false)
   * @returns {Promise<{success: boolean, linesModified: number, backup: string}>}
   */
  async updateImportsInFile(filePath, removedFilePath, comment = false) {
    this.logger.info(`Updating imports in: ${filePath}`);

    try {
      // Read file content
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Create backup
      const backupPath = `${filePath}.backup`;
      writeFileSync(backupPath, content, 'utf-8');

      // Extract filename patterns to match
      const fileName = removedFilePath.split(/[/\\]/).pop();
      const fileNameWithoutExt = fileName.replace(/\.(js|mjs|cjs)$/, '');

      let linesModified = 0;
      const modifiedLines = [];

      // Process each line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let modifiedLine = line;
        let isImportLine = false;

        // Check for ES6 import statements
        const es6ImportMatch = line.match(/^\s*import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/);
        if (es6ImportMatch) {
          const importPath = es6ImportMatch[1];
          if (importPath.includes(fileNameWithoutExt)) {
            isImportLine = true;
          }
        }

        // Check for CommonJS require statements
        const cjsRequireMatch = line.match(/^\s*(?:const|let|var)\s+.*\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (cjsRequireMatch) {
          const requirePath = cjsRequireMatch[1];
          if (requirePath.includes(fileNameWithoutExt)) {
            isImportLine = true;
          }
        }

        // Check for standalone require (no assignment)
        const standaloneRequireMatch = line.match(/^\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (standaloneRequireMatch) {
          const requirePath = standaloneRequireMatch[1];
          if (requirePath.includes(fileNameWithoutExt)) {
            isImportLine = true;
          }
        }

        // Check for dynamic imports
        const dynamicImportMatch = line.match(/import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (dynamicImportMatch) {
          const importPath = dynamicImportMatch[1];
          if (importPath.includes(fileNameWithoutExt)) {
            isImportLine = true;
          }
        }

        if (isImportLine) {
          linesModified++;
          if (comment) {
            // Comment out the line
            modifiedLine = `// REMOVED: ${line}`;
            this.logger.debug(`Line ${i + 1}: Commented out import`);
          } else {
            // Remove the line (skip it)
            this.logger.debug(`Line ${i + 1}: Removed import`);
            continue;
          }
        }

        modifiedLines.push(modifiedLine);
      }

      // Write updated content
      const updatedContent = modifiedLines.join('\n');
      writeFileSync(filePath, updatedContent, 'utf-8');

      this.logger.success(`Updated ${filePath}: ${linesModified} import(s) ${comment ? 'commented' : 'removed'}`);

      return {
        success: true,
        linesModified,
        backup: backupPath
      };
    } catch (error) {
      this.logger.error(`Failed to update imports in ${filePath}:`, error.message);
      return {
        success: false,
        linesModified: 0,
        error: error.message
      };
    }
  }

  /**
   * Remove unused variable declarations from removed imports
   * @param {string} filePath - Path to the file to update
   * @returns {Promise<{success: boolean, variablesRemoved: number}>}
   */
  async removeUnusedVariables(filePath) {
    this.logger.debug(`Checking for unused variables in: ${filePath}`);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      let variablesRemoved = 0;
      const modifiedLines = [];

      // This is a simplified approach - in production, you'd want to use an AST parser
      // For now, we'll look for commented import lines and check if the variable is used

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this is a commented import line
        const commentedImportMatch = line.match(/^\/\/\s*REMOVED:\s*(?:const|let|var)\s+(\w+)\s*=/);
        
        if (commentedImportMatch) {
          const variableName = commentedImportMatch[1];
          
          // Check if variable is used elsewhere in the file
          const isUsed = lines.some((l, idx) => {
            if (idx === i) return false; // Skip the import line itself
            return l.includes(variableName) && !l.trim().startsWith('//');
          });

          if (!isUsed) {
            this.logger.debug(`Variable '${variableName}' is unused, removing line`);
            variablesRemoved++;
            continue; // Skip this line
          }
        }

        modifiedLines.push(line);
      }

      if (variablesRemoved > 0) {
        const updatedContent = modifiedLines.join('\n');
        writeFileSync(filePath, updatedContent, 'utf-8');
        this.logger.success(`Removed ${variablesRemoved} unused variable(s) from ${filePath}`);
      }

      return {
        success: true,
        variablesRemoved
      };
    } catch (error) {
      this.logger.error(`Failed to remove unused variables in ${filePath}:`, error.message);
      return {
        success: false,
        variablesRemoved: 0,
        error: error.message
      };
    }
  }

  /**
   * Update all files that import the removed file
   * @param {string} removedFilePath - Path to the removed file
   * @param {boolean} comment - If true, comment out instead of removing (default: false)
   * @returns {Promise<{filesUpdated: number, totalModifications: number, errors: Array}>}
   */
  async updateAllImports(removedFilePath, comment = false) {
    this.logger.info(`Updating all imports for removed file: ${removedFilePath}`);

    const results = {
      filesUpdated: 0,
      totalModifications: 0,
      errors: []
    };

    try {
      // Find all files that import the removed file
      const importingFiles = await this.findImportingFiles(removedFilePath);

      if (importingFiles.length === 0) {
        this.logger.info('No files found with import statements');
        return results;
      }

      // Get unique file paths
      const uniqueFiles = [...new Set(importingFiles.map(ref => ref.file))];

      this.logger.info(`Updating ${uniqueFiles.length} file(s)...`);

      // Update each file
      for (const file of uniqueFiles) {
        const updateResult = await this.updateImportsInFile(file, removedFilePath, comment);

        if (updateResult.success) {
          results.filesUpdated++;
          results.totalModifications += updateResult.linesModified;

          // Try to remove unused variables
          await this.removeUnusedVariables(file);
        } else {
          results.errors.push({
            file,
            error: updateResult.error
          });
        }
      }

      this.logger.success(`Updated ${results.filesUpdated} file(s), ${results.totalModifications} import(s) modified`);

      if (results.errors.length > 0) {
        this.logger.warn(`Failed to update ${results.errors.length} file(s)`);
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to update imports:', error.message);
      throw error;
    }
  }

  /**
   * Restore files from backup
   * @param {Array<string>} filePaths - Array of file paths to restore
   * @returns {Promise<void>}
   */
  async restoreFromBackup(filePaths) {
    this.logger.info('Restoring files from backup...');

    for (const filePath of filePaths) {
      const backupPath = `${filePath}.backup`;

      if (existsSync(backupPath)) {
        try {
          const backupContent = readFileSync(backupPath, 'utf-8');
          writeFileSync(filePath, backupContent, 'utf-8');
          this.fs.unlinkSync(backupPath);
          this.logger.success(`Restored: ${filePath}`);
        } catch (error) {
          this.logger.error(`Failed to restore ${filePath}:`, error.message);
        }
      }
    }
  }

  /**
   * Clean up backup files
   * @param {Array<string>} filePaths - Array of file paths whose backups should be removed
   * @returns {Promise<void>}
   */
  async cleanupBackups(filePaths) {
    this.logger.debug('Cleaning up backup files...');

    for (const filePath of filePaths) {
      const backupPath = `${filePath}.backup`;

      if (existsSync(backupPath)) {
        try {
          this.fs.unlinkSync(backupPath);
          this.logger.debug(`Removed backup: ${backupPath}`);
        } catch (error) {
          this.logger.warn(`Failed to remove backup ${backupPath}:`, error.message);
        }
      }
    }
  }
}

// ============================================================================
// Function-Level Remover
// ============================================================================

class FunctionRemover {
  constructor(logger) {
    this.logger = logger;
    this.fs = require('node:fs');
  }

  /**
   * Parse JavaScript file to identify function boundaries
   * @param {string} content - File content
   * @returns {Array<{name: string, start: number, end: number, type: string}>}
   */
  parseFunctions(content) {
    this.logger.debug('Parsing functions in file...');

    const functions = [];
    const lines = content.split('\n');

    let currentFunction = null;
    let braceDepth = 0;
    let inFunction = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine === '') {
        continue;
      }

      // Detect function declarations
      // Pattern 1: function functionName(...) {
      const funcDeclMatch = trimmedLine.match(/^(?:async\s+)?function\s+(\w+)\s*\(/);
      // Pattern 2: const/let/var functionName = function(...) {
      const funcExprMatch = trimmedLine.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/);
      // Pattern 3: const/let/var functionName = (...) => {
      const arrowFuncMatch = trimmedLine.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/);
      // Pattern 4: methodName(...) { (class methods)
      const methodMatch = trimmedLine.match(/^(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/);

      if (funcDeclMatch || funcExprMatch || arrowFuncMatch || methodMatch) {
        const functionName = funcDeclMatch?.[1] || funcExprMatch?.[1] || arrowFuncMatch?.[1] || methodMatch?.[1];
        
        if (functionName && !inFunction) {
          currentFunction = {
            name: functionName,
            start: i,
            end: -1,
            type: funcDeclMatch ? 'declaration' : 
                  funcExprMatch ? 'expression' : 
                  arrowFuncMatch ? 'arrow' : 'method'
          };
          inFunction = true;
          braceDepth = 0;
        }
      }

      // Track brace depth
      if (inFunction) {
        for (const char of line) {
          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;

          // Function ended
          if (braceDepth === 0 && char === '}') {
            currentFunction.end = i;
            functions.push(currentFunction);
            inFunction = false;
            currentFunction = null;
            break;
          }
        }
      }
    }

    this.logger.debug(`Found ${functions.length} function(s)`);
    return functions;
  }

  /**
   * Remove specific unused functions while keeping used ones
   * @param {string} filePath - Path to the file
   * @param {Array<string>} functionNames - Names of functions to remove
   * @returns {Promise<{success: boolean, functionsRemoved: number, backup: string}>}
   */
  async removeFunctions(filePath, functionNames) {
    this.logger.info(`Removing ${functionNames.length} function(s) from: ${filePath}`);

    try {
      // Read file content
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Create backup
      const backupPath = `${filePath}.backup`;
      writeFileSync(backupPath, content, 'utf-8');

      // Parse functions
      const functions = this.parseFunctions(content);

      // Find functions to remove
      const functionsToRemove = functions.filter(func => 
        functionNames.includes(func.name)
      );

      if (functionsToRemove.length === 0) {
        this.logger.warn('No matching functions found to remove');
        return {
          success: false,
          functionsRemoved: 0,
          backup: backupPath
        };
      }

      this.logger.info(`Found ${functionsToRemove.length} function(s) to remove`);

      // Sort by start line (descending) to remove from bottom to top
      functionsToRemove.sort((a, b) => b.start - a.start);

      // Remove functions
      let modifiedLines = [...lines];
      let functionsRemoved = 0;

      for (const func of functionsToRemove) {
        this.logger.debug(`Removing function '${func.name}' (lines ${func.start + 1}-${func.end + 1})`);

        // Remove lines from start to end (inclusive)
        modifiedLines.splice(func.start, func.end - func.start + 1);
        functionsRemoved++;
      }

      // Write updated content
      const updatedContent = modifiedLines.join('\n');
      writeFileSync(filePath, updatedContent, 'utf-8');

      this.logger.success(`Removed ${functionsRemoved} function(s) from ${filePath}`);

      return {
        success: true,
        functionsRemoved,
        backup: backupPath
      };
    } catch (error) {
      this.logger.error(`Failed to remove functions from ${filePath}:`, error.message);
      return {
        success: false,
        functionsRemoved: 0,
        error: error.message
      };
    }
  }

  /**
   * Update exports if removed function was exported
   * @param {string} filePath - Path to the file
   * @param {Array<string>} functionNames - Names of removed functions
   * @returns {Promise<{success: boolean, exportsUpdated: number}>}
   */
  async updateExports(filePath, functionNames) {
    this.logger.debug(`Updating exports in: ${filePath}`);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      let exportsUpdated = 0;
      const modifiedLines = [];

      for (const line of lines) {
        let modifiedLine = line;
        let shouldRemove = false;

        // Check for ES6 named exports: export { functionName }
        const namedExportMatch = line.match(/export\s*\{\s*([^}]+)\s*\}/);
        if (namedExportMatch) {
          const exportedNames = namedExportMatch[1].split(',').map(n => n.trim());
          const filteredNames = exportedNames.filter(name => !functionNames.includes(name));
          
          if (filteredNames.length !== exportedNames.length) {
            if (filteredNames.length === 0) {
              // Remove entire export line
              shouldRemove = true;
            } else {
              // Update export list
              modifiedLine = `export { ${filteredNames.join(', ')} };`;
            }
            exportsUpdated++;
          }
        }

        // Check for ES6 inline exports: export function functionName
        const inlineExportMatch = line.match(/export\s+(?:async\s+)?function\s+(\w+)/);
        if (inlineExportMatch && functionNames.includes(inlineExportMatch[1])) {
          // This line should have been removed with the function
          shouldRemove = true;
          exportsUpdated++;
        }

        // Check for CommonJS exports: module.exports.functionName
        const cjsExportMatch = line.match(/module\.exports\.(\w+)\s*=/);
        if (cjsExportMatch && functionNames.includes(cjsExportMatch[1])) {
          shouldRemove = true;
          exportsUpdated++;
        }

        // Check for CommonJS exports object: module.exports = { functionName }
        const cjsObjectMatch = line.match(/module\.exports\s*=\s*\{([^}]+)\}/);
        if (cjsObjectMatch) {
          const exportedNames = cjsObjectMatch[1].split(',').map(n => n.trim());
          const filteredNames = exportedNames.filter(name => !functionNames.includes(name));
          
          if (filteredNames.length !== exportedNames.length) {
            if (filteredNames.length === 0) {
              shouldRemove = true;
            } else {
              modifiedLine = `module.exports = { ${filteredNames.join(', ')} };`;
            }
            exportsUpdated++;
          }
        }

        if (!shouldRemove) {
          modifiedLines.push(modifiedLine);
        }
      }

      if (exportsUpdated > 0) {
        const updatedContent = modifiedLines.join('\n');
        writeFileSync(filePath, updatedContent, 'utf-8');
        this.logger.success(`Updated ${exportsUpdated} export(s) in ${filePath}`);
      }

      return {
        success: true,
        exportsUpdated
      };
    } catch (error) {
      this.logger.error(`Failed to update exports in ${filePath}:`, error.message);
      return {
        success: false,
        exportsUpdated: 0,
        error: error.message
      };
    }
  }

  /**
   * Remove functions and update exports
   * @param {string} filePath - Path to the file
   * @param {Array<string>} functionNames - Names of functions to remove
   * @returns {Promise<{success: boolean, functionsRemoved: number, exportsUpdated: number}>}
   */
  async removeFunctionsAndUpdateExports(filePath, functionNames) {
    this.logger.info(`Removing functions and updating exports in: ${filePath}`);

    // Remove functions
    const removeResult = await this.removeFunctions(filePath, functionNames);

    if (!removeResult.success) {
      return removeResult;
    }

    // Update exports
    const exportResult = await this.updateExports(filePath, functionNames);

    return {
      success: true,
      functionsRemoved: removeResult.functionsRemoved,
      exportsUpdated: exportResult.exportsUpdated,
      backup: removeResult.backup
    };
  }

  /**
   * Restore file from backup
   * @param {string} filePath - Path to the file to restore
   * @returns {Promise<void>}
   */
  async restoreFromBackup(filePath) {
    const backupPath = `${filePath}.backup`;

    if (existsSync(backupPath)) {
      try {
        const backupContent = readFileSync(backupPath, 'utf-8');
        writeFileSync(filePath, backupContent, 'utf-8');
        this.fs.unlinkSync(backupPath);
        this.logger.success(`Restored: ${filePath}`);
      } catch (error) {
        this.logger.error(`Failed to restore ${filePath}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Clean up backup file
   * @param {string} filePath - Path to the file whose backup should be removed
   * @returns {Promise<void>}
   */
  async cleanupBackup(filePath) {
    const backupPath = `${filePath}.backup`;

    if (existsSync(backupPath)) {
      try {
        this.fs.unlinkSync(backupPath);
        this.logger.debug(`Removed backup: ${backupPath}`);
      } catch (error) {
        this.logger.warn(`Failed to remove backup ${backupPath}:`, error.message);
      }
    }
  }
}

// ============================================================================
// Test Validation Runner
// ============================================================================

class TestValidator {
  constructor(logger, gitBranchManager, options = {}) {
    this.logger = logger;
    this.gitBranchManager = gitBranchManager;
    this.stopOnFailure = options.stopOnFailure !== false; // Default: true
  }

  /**
   * Run npm test and capture output
   * @returns {Promise<{success: boolean, output: string, error: string, failures: Array}>}
   */
  async runTests() {
    this.logger.info('Running tests...');

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'npm.cmd' : 'npm';

      const child = spawn(command, ['test'], {
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
        const success = code === 0;
        const failures = this._parseTestFailures(stdout, stderr);

        if (success) {
          this.logger.success('All tests passed');
        } else {
          this.logger.error(`Tests failed (exit code ${code})`);
          if (failures.length > 0) {
            this.logger.error(`Found ${failures.length} test failure(s)`);
          }
        }

        resolve({
          success,
          output: stdout,
          error: stderr,
          failures
        });
      });

      child.on('error', (error) => {
        this.logger.error('Failed to run tests:', error.message);
        resolve({
          success: false,
          output: stdout,
          error: error.message,
          failures: []
        });
      });
    });
  }

  /**
   * Parse test output to extract failure information
   * @private
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {Array<{test: string, error: string}>}
   */
  _parseTestFailures(stdout, stderr) {
    const failures = [];
    const output = stdout + '\n' + stderr;

    // Try to parse common test framework output patterns
    // This is a simplified parser - adjust based on your test framework

    // Pattern for Jest/Vitest failures
    const jestFailurePattern = /FAIL\s+(.+?)\n([\s\S]*?)(?=FAIL|PASS|$)/g;
    let match;

    while ((match = jestFailurePattern.exec(output)) !== null) {
      failures.push({
        test: match[1].trim(),
        error: match[2].trim().substring(0, 200) // Limit error message length
      });
    }

    // Pattern for Mocha failures
    const mochaFailurePattern = /\d+\)\s+(.+?)\n\s+(.+?)(?=\n\s+\d+\)|$)/g;
    
    while ((match = mochaFailurePattern.exec(output)) !== null) {
      failures.push({
        test: match[1].trim(),
        error: match[2].trim().substring(0, 200)
      });
    }

    // Generic failure pattern
    if (failures.length === 0 && output.includes('failed')) {
      const lines = output.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('failed') || lines[i].toLowerCase().includes('error')) {
          failures.push({
            test: 'Unknown test',
            error: lines[i].trim().substring(0, 200)
          });
        }
      }
    }

    return failures;
  }

  /**
   * Run tests after a removal or batch of removals
   * @param {string} context - Context description (e.g., "after removing file.js")
   * @returns {Promise<{success: boolean, output: string, failures: Array}>}
   */
  async validateAfterRemoval(context) {
    this.logger.info(`Validating tests ${context}...`);

    const result = await this.runTests();

    if (!result.success) {
      this.logger.error(`Tests failed ${context}`);
      
      if (result.failures.length > 0) {
        this.logger.error('Failed tests:');
        for (const failure of result.failures) {
          this.logger.error(`  - ${failure.test}`);
          this.logger.debug(`    ${failure.error}`);
        }
      }
    }

    return result;
  }

  /**
   * Rollback the last change and log the failure
   * @param {string} itemDescription - Description of the item that caused failure
   * @param {Array} failures - Test failures
   * @returns {Promise<void>}
   */
  async rollbackAndLog(itemDescription, failures) {
    this.logger.warn(`Rolling back changes due to test failures for: ${itemDescription}`);

    try {
      // Rollback last commit
      await this.gitBranchManager.rollbackLastCommit();

      // Log the failure
      this.logger.error(`ROLLBACK: ${itemDescription}`);
      this.logger.error('Reason: Tests failed after removal');
      
      if (failures.length > 0) {
        this.logger.error('Failed tests:');
        for (const failure of failures) {
          this.logger.error(`  - ${failure.test}: ${failure.error}`);
        }
      }

      this.logger.success('Successfully rolled back changes');
    } catch (error) {
      this.logger.error('Failed to rollback changes:', error.message);
      throw error;
    }
  }

  /**
   * Validate removal with automatic rollback on failure
   * @param {string} itemDescription - Description of the removed item
   * @param {Function} removalFn - Function that performs the removal
   * @param {Function} commitFn - Function that commits the changes
   * @returns {Promise<{success: boolean, rolledBack: boolean, testResult: object}>}
   */
  async validateRemovalWithRollback(itemDescription, removalFn, commitFn) {
    this.logger.info(`Processing: ${itemDescription}`);

    try {
      // Perform the removal
      const removalResult = await removalFn();

      if (!removalResult.success) {
        this.logger.warn(`Removal failed for: ${itemDescription}`);
        return {
          success: false,
          rolledBack: false,
          removalResult
        };
      }

      // Commit the changes
      await commitFn();

      // Run tests
      const testResult = await this.validateAfterRemoval(`after removing ${itemDescription}`);

      if (!testResult.success) {
        // Tests failed - rollback
        await this.rollbackAndLog(itemDescription, testResult.failures);

        return {
          success: false,
          rolledBack: true,
          testResult
        };
      }

      // Success
      this.logger.success(`Successfully removed and validated: ${itemDescription}`);

      return {
        success: true,
        rolledBack: false,
        testResult
      };

    } catch (error) {
      this.logger.error(`Error processing ${itemDescription}:`, error.message);
      
      // Try to rollback
      try {
        await this.gitBranchManager.rollbackChanges();
      } catch (rollbackError) {
        this.logger.error('Failed to rollback after error:', rollbackError.message);
      }

      return {
        success: false,
        rolledBack: true,
        error: error.message
      };
    }
  }

  /**
   * Process multiple items with test validation
   * @param {Array<{description: string, removalFn: Function, commitFn: Function}>} items
   * @returns {Promise<{successful: number, failed: number, rolledBack: number, details: Array}>}
   */
  async processMultipleWithValidation(items) {
    this.logger.info(`Processing ${items.length} item(s) with test validation...`);

    const results = {
      successful: 0,
      failed: 0,
      rolledBack: 0,
      details: []
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      this.logger.info(`[${i + 1}/${items.length}] ${item.description}`);

      const result = await this.validateRemovalWithRollback(
        item.description,
        item.removalFn,
        item.commitFn
      );

      results.details.push({
        description: item.description,
        ...result
      });

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        if (result.rolledBack) {
          results.rolledBack++;
        }

        // Stop on failure if configured
        if (this.stopOnFailure) {
          this.logger.warn('Stopping due to failure (--stop-on-failure is enabled)');
          break;
        } else {
          this.logger.info('Continuing with next item...');
        }
      }
    }

    this.logger.info('');
    this.logger.info('Validation Summary:');
    this.logger.info(`  Successful: ${results.successful}`);
    this.logger.info(`  Failed: ${results.failed}`);
    this.logger.info(`  Rolled back: ${results.rolledBack}`);

    return results;
  }
}

// ============================================================================
// Baseline Metrics Collector
// ============================================================================

class BaselineMetricsCollector {
  constructor(logger) {
    this.logger = logger;
    this.fs = require('node:fs');
    this.path = require('node:path');
  }

  /**
   * Count total files in codebase
   * @param {string} directory - Root directory to scan (default: current directory)
   * @param {Array<string>} excludePatterns - Patterns to exclude
   * @returns {number} Total file count
   */
  countFiles(directory = '.', excludePatterns = ['node_modules', 'coverage', '.git']) {
    let fileCount = 0;

    const scanDirectory = (dir) => {
      try {
        const entries = this.fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = this.path.join(dir, entry.name);
          
          // Check if should be excluded
          const shouldExclude = excludePatterns.some(pattern => 
            fullPath.includes(pattern)
          );

          if (shouldExclude) {
            continue;
          }

          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && this._isCodeFile(entry.name)) {
            fileCount++;
          }
        }
      } catch (error) {
        this.logger.debug(`Failed to scan directory ${dir}: ${error.message}`);
      }
    };

    scanDirectory(directory);
    return fileCount;
  }

  /**
   * Check if a file is a code file
   * @private
   */
  _isCodeFile(filename) {
    const codeExtensions = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Count total lines of code in a file
   * @param {string} filePath - Path to the file
   * @returns {number} Line count
   */
  countLinesInFile(filePath) {
    try {
      const content = this.fs.readFileSync(filePath, 'utf-8');
      return content.split('\n').length;
    } catch (error) {
      this.logger.debug(`Failed to count lines in ${filePath}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Count total lines of code in codebase
   * @param {string} directory - Root directory to scan
   * @param {Array<string>} excludePatterns - Patterns to exclude
   * @returns {number} Total line count
   */
  countTotalLines(directory = '.', excludePatterns = ['node_modules', 'coverage', '.git']) {
    let totalLines = 0;

    const scanDirectory = (dir) => {
      try {
        const entries = this.fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = this.path.join(dir, entry.name);
          
          // Check if should be excluded
          const shouldExclude = excludePatterns.some(pattern => 
            fullPath.includes(pattern)
          );

          if (shouldExclude) {
            continue;
          }

          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && this._isCodeFile(entry.name)) {
            totalLines += this.countLinesInFile(fullPath);
          }
        }
      } catch (error) {
        this.logger.debug(`Failed to scan directory ${dir}: ${error.message}`);
      }
    };

    scanDirectory(directory);
    return totalLines;
  }

  /**
   * Get file size in bytes
   * @param {string} filePath - Path to the file
   * @returns {number} File size in bytes
   */
  getFileSize(filePath) {
    try {
      const stats = this.fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      this.logger.debug(`Failed to get size of ${filePath}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Estimate bundle size by summing file sizes
   * @param {string} directory - Root directory to scan
   * @param {Array<string>} excludePatterns - Patterns to exclude
   * @returns {number} Total size in bytes
   */
  estimateBundleSize(directory = '.', excludePatterns = ['node_modules', 'coverage', '.git']) {
    let totalSize = 0;

    const scanDirectory = (dir) => {
      try {
        const entries = this.fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = this.path.join(dir, entry.name);
          
          // Check if should be excluded
          const shouldExclude = excludePatterns.some(pattern => 
            fullPath.includes(pattern)
          );

          if (shouldExclude) {
            continue;
          }

          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && this._isCodeFile(entry.name)) {
            totalSize += this.getFileSize(fullPath);
          }
        }
      } catch (error) {
        this.logger.debug(`Failed to scan directory ${dir}: ${error.message}`);
      }
    };

    scanDirectory(directory);
    return totalSize;
  }

  /**
   * Get current coverage percentage from coverage reports
   * @returns {number|null} Coverage percentage or null if not available
   */
  getCurrentCoverage() {
    try {
      const coverageFinalPath = resolve('coverage', 'coverage-final.json');
      
      if (!existsSync(coverageFinalPath)) {
        this.logger.debug('Coverage file not found');
        return null;
      }

      const coverageData = JSON.parse(this.fs.readFileSync(coverageFinalPath, 'utf-8'));
      
      // Calculate overall coverage from all files
      let totalLines = 0;
      let coveredLines = 0;

      for (const filePath in coverageData) {
        const fileData = coverageData[filePath];
        
        if (fileData.s) {
          const statements = Object.values(fileData.s);
          totalLines += statements.length;
          coveredLines += statements.filter(count => count > 0).length;
        }
      }

      if (totalLines === 0) {
        return 0;
      }

      return (coveredLines / totalLines) * 100;
    } catch (error) {
      this.logger.debug(`Failed to get coverage: ${error.message}`);
      return null;
    }
  }

  /**
   * Collect all baseline metrics
   * @returns {object} Baseline metrics
   */
  collectBaseline() {
    this.logger.info('Collecting baseline metrics...');

    const metrics = {
      timestamp: new Date().toISOString(),
      totalFiles: this.countFiles(),
      totalLines: this.countTotalLines(),
      coverage: this.getCurrentCoverage(),
      bundleSize: this.estimateBundleSize()
    };

    this.logger.success('Baseline metrics collected');
    this.logger.info(`  Total Files: ${metrics.totalFiles}`);
    this.logger.info(`  Total Lines: ${metrics.totalLines.toLocaleString()}`);
    this.logger.info(`  Coverage: ${metrics.coverage !== null ? metrics.coverage.toFixed(2) + '%' : 'N/A'}`);
    this.logger.info(`  Bundle Size: ${(metrics.bundleSize / 1024).toFixed(2)} KB`);

    return metrics;
  }
}

// ============================================================================
// Action Logger
// ============================================================================

class ActionLogger {
  constructor(logger) {
    this.logger = logger;
    this.actions = [];
    this.fs = require('node:fs');
  }

  /**
   * Log an action with timestamp, type, item, and result
   * @param {object} action - Action details
   * @returns {void}
   */
  logAction(action) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: action.type,
      item: action.item,
      result: action.result,
      reason: action.reason || null,
      testResult: action.testResult || null,
      details: action.details || null
    };

    this.actions.push(entry);

    // Log to console based on result
    if (action.result === 'success') {
      this.logger.success(`${action.type}: ${action.item}`);
      if (action.reason) {
        this.logger.debug(`  Reason: ${action.reason}`);
      }
    } else if (action.result === 'failed') {
      this.logger.error(`${action.type} failed: ${action.item}`);
      if (action.reason) {
        this.logger.error(`  Reason: ${action.reason}`);
      }
    } else if (action.result === 'skipped') {
      this.logger.info(`${action.type} skipped: ${action.item}`);
      if (action.reason) {
        this.logger.info(`  Reason: ${action.reason}`);
      }
    }
  }

  /**
   * Log a file removal action
   * @param {string} filePath - Path to the removed file
   * @param {string} result - Result: 'success', 'failed', 'skipped'
   * @param {string} reason - Reason for removal
   * @param {object} testResult - Test validation result
   */
  logFileRemoval(filePath, result, reason, testResult = null) {
    this.logAction({
      type: 'file_removal',
      item: filePath,
      result,
      reason,
      testResult
    });
  }

  /**
   * Log a function removal action
   * @param {string} filePath - Path to the file
   * @param {string} functionName - Name of the removed function
   * @param {string} result - Result: 'success', 'failed', 'skipped'
   * @param {string} reason - Reason for removal
   * @param {object} testResult - Test validation result
   */
  logFunctionRemoval(filePath, functionName, result, reason, testResult = null) {
    this.logAction({
      type: 'function_removal',
      item: `${filePath}::${functionName}`,
      result,
      reason,
      testResult
    });
  }

  /**
   * Log a file kept decision
   * @param {string} filePath - Path to the file
   * @param {string} reason - Reason for keeping
   */
  logFileKept(filePath, reason) {
    this.logAction({
      type: 'file_kept',
      item: filePath,
      result: 'kept',
      reason
    });
  }

  /**
   * Log a file marked for review
   * @param {string} filePath - Path to the file
   * @param {string} reason - Reason for review
   */
  logFileReview(filePath, reason) {
    this.logAction({
      type: 'file_review',
      item: filePath,
      result: 'review',
      reason
    });
  }

  /**
   * Log test results after a removal
   * @param {string} item - Item that was removed
   * @param {boolean} passed - Whether tests passed
   * @param {string} output - Test output
   */
  logTestResult(item, passed, output) {
    this.logAction({
      type: 'test_validation',
      item,
      result: passed ? 'passed' : 'failed',
      details: { output }
    });
  }

  /**
   * Get all logged actions
   * @returns {Array<object>} Array of action entries
   */
  getActions() {
    return this.actions;
  }

  /**
   * Get actions by type
   * @param {string} type - Action type to filter by
   * @returns {Array<object>} Filtered actions
   */
  getActionsByType(type) {
    return this.actions.filter(action => action.type === type);
  }

  /**
   * Get actions by result
   * @param {string} result - Result to filter by ('success', 'failed', 'skipped', etc.)
   * @returns {Array<object>} Filtered actions
   */
  getActionsByResult(result) {
    return this.actions.filter(action => action.result === result);
  }

  /**
   * Get summary statistics
   * @returns {object} Summary of actions
   */
  getSummary() {
    const summary = {
      total: this.actions.length,
      byType: {},
      byResult: {}
    };

    for (const action of this.actions) {
      // Count by type
      if (!summary.byType[action.type]) {
        summary.byType[action.type] = 0;
      }
      summary.byType[action.type]++;

      // Count by result
      if (!summary.byResult[action.result]) {
        summary.byResult[action.result] = 0;
      }
      summary.byResult[action.result]++;
    }

    return summary;
  }

  /**
   * Save action log to JSON file
   * @param {string} outputPath - Path to save the log (default: 'cleanup-actions.json')
   * @returns {void}
   */
  saveToFile(outputPath = 'cleanup-actions.json') {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        summary: this.getSummary(),
        actions: this.actions
      };

      this.fs.writeFileSync(
        outputPath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      this.logger.success(`Action log saved to: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to save action log: ${error.message}`);
    }
  }

  /**
   * Clear all logged actions
   * @returns {void}
   */
  clear() {
    this.actions = [];
  }
}

// ============================================================================
// Improvement Metrics Calculator
// ============================================================================

class ImprovementMetricsCalculator {
  constructor(logger, baselineCollector, actionLogger) {
    this.logger = logger;
    this.baselineCollector = baselineCollector;
    this.actionLogger = actionLogger;
  }

  /**
   * Count files removed from action log
   * @returns {number} Number of files removed
   */
  countFilesRemoved() {
    const fileRemovals = this.actionLogger.getActionsByType('file_removal');
    return fileRemovals.filter(action => action.result === 'success').length;
  }

  /**
   * Count functions removed from action log
   * @returns {number} Number of functions removed
   */
  countFunctionsRemoved() {
    const functionRemovals = this.actionLogger.getActionsByType('function_removal');
    return functionRemovals.filter(action => action.result === 'success').length;
  }

  /**
   * Calculate lines of code reduction
   * @param {object} baseline - Baseline metrics
   * @param {object} current - Current metrics
   * @returns {number} Lines reduced
   */
  calculateLinesReduced(baseline, current) {
    return baseline.totalLines - current.totalLines;
  }

  /**
   * Calculate coverage improvement
   * @param {object} baseline - Baseline metrics
   * @param {object} current - Current metrics
   * @returns {number} Coverage improvement (percentage points)
   */
  calculateCoverageImprovement(baseline, current) {
    if (baseline.coverage === null || current.coverage === null) {
      return 0;
    }
    return current.coverage - baseline.coverage;
  }

  /**
   * Calculate bundle size reduction
   * @param {object} baseline - Baseline metrics
   * @param {object} current - Current metrics
   * @returns {number} Size reduced in bytes
   */
  calculateBundleSizeReduction(baseline, current) {
    return baseline.bundleSize - current.bundleSize;
  }

  /**
   * Run coverage again to get updated metrics
   * @param {CoverageRunner} coverageRunner - Coverage runner instance
   * @returns {Promise<boolean>} Success status
   */
  async runCoverageAgain(coverageRunner) {
    this.logger.info('Running coverage again to calculate improvements...');
    
    try {
      // Run server coverage
      const serverResult = await coverageRunner.runServerCoverage();
      
      if (!serverResult.success) {
        this.logger.warn('Failed to run coverage for improvement calculation');
        return false;
      }

      this.logger.success('Coverage re-run completed');
      return true;
    } catch (error) {
      this.logger.error(`Failed to re-run coverage: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate all improvement metrics
   * @param {object} baseline - Baseline metrics
   * @param {CoverageRunner} coverageRunner - Optional coverage runner to re-run coverage
   * @returns {Promise<object>} Improvement metrics
   */
  async calculateImprovements(baseline, coverageRunner = null) {
    this.logger.info('Calculating improvement metrics...');

    // Re-run coverage if runner provided
    if (coverageRunner) {
      await this.runCoverageAgain(coverageRunner);
    }

    // Collect current metrics
    const current = this.baselineCollector.collectBaseline();

    // Calculate improvements
    const improvements = {
      filesRemoved: this.countFilesRemoved(),
      functionsRemoved: this.countFunctionsRemoved(),
      linesReduced: this.calculateLinesReduced(baseline, current),
      coverageImprovement: this.calculateCoverageImprovement(baseline, current),
      bundleSizeReduction: this.calculateBundleSizeReduction(baseline, current),
      baseline,
      current
    };

    this.logger.success('Improvement metrics calculated');
    this.logger.info(`  Files Removed: ${improvements.filesRemoved}`);
    this.logger.info(`  Functions Removed: ${improvements.functionsRemoved}`);
    this.logger.info(`  Lines Reduced: ${improvements.linesReduced.toLocaleString()}`);
    this.logger.info(`  Coverage Change: ${improvements.coverageImprovement >= 0 ? '+' : ''}${improvements.coverageImprovement.toFixed(2)}%`);
    this.logger.info(`  Bundle Size Reduced: ${(improvements.bundleSizeReduction / 1024).toFixed(2)} KB`);

    return improvements;
  }
}

// ============================================================================
// Cleanup Report Generator
// ============================================================================

class CleanupReportGenerator {
  constructor(logger, actionLogger) {
    this.logger = logger;
    this.actionLogger = actionLogger;
    this.fs = require('node:fs');
  }

  /**
   * Generate markdown cleanup report
   * @param {object} improvements - Improvement metrics
   * @param {object} verificationResults - Verification results (optional)
   * @returns {string} Markdown report content
   */
  generateMarkdownReport(improvements, verificationResults = null) {
    this.logger.info('Generating markdown cleanup report...');

    const lines = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Header
    lines.push(`# Cleanup Report - ${new Date().toLocaleString()}`);
    lines.push('');

    // Summary Section
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Files Removed:** ${improvements.filesRemoved}`);
    lines.push(`- **Functions Removed:** ${improvements.functionsRemoved}`);
    lines.push(`- **Lines of Code Reduced:** ${improvements.linesReduced.toLocaleString()}`);
    
    if (improvements.coverageImprovement !== 0) {
      const coverageChange = improvements.coverageImprovement >= 0 ? '+' : '';
      lines.push(`- **Coverage Change:** ${coverageChange}${improvements.coverageImprovement.toFixed(2)}%`);
    }
    
    lines.push(`- **Bundle Size Reduction:** ${(improvements.bundleSizeReduction / 1024).toFixed(2)} KB`);
    lines.push('');

    // Actions Taken Section
    lines.push('## Actions Taken');
    lines.push('');

    // Removed Files
    const removedFiles = this.actionLogger.getActionsByType('file_removal')
      .filter(action => action.result === 'success');

    if (removedFiles.length > 0) {
      lines.push('### Removed Files');
      lines.push('');
      
      for (const action of removedFiles) {
        lines.push(`- **${action.item}**`);
        if (action.reason) {
          lines.push(`  - Reason: ${action.reason}`);
        }
        if (action.testResult) {
          lines.push(`  - Tests: ${action.testResult.passed ? '✓ Passed' : '✗ Failed'}`);
        }
      }
      lines.push('');
    } else {
      lines.push('### Removed Files');
      lines.push('');
      lines.push('No files were removed.');
      lines.push('');
    }

    // Removed Functions
    const removedFunctions = this.actionLogger.getActionsByType('function_removal')
      .filter(action => action.result === 'success');

    if (removedFunctions.length > 0) {
      lines.push('### Removed Functions');
      lines.push('');
      
      for (const action of removedFunctions) {
        lines.push(`- **${action.item}**`);
        if (action.reason) {
          lines.push(`  - Reason: ${action.reason}`);
        }
      }
      lines.push('');
    }

    // Kept for Review Section
    if (verificationResults) {
      const reviewItems = verificationResults.review || [];
      
      if (reviewItems.length > 0) {
        lines.push('## Kept for Review');
        lines.push('');
        lines.push('The following items need manual review before removal:');
        lines.push('');

        for (const item of reviewItems) {
          lines.push(`- **${item.path}** (${item.coverage}% coverage)`);
          if (item.verification && item.verification.reason) {
            lines.push(`  - ${item.verification.reason}`);
          }
          if (item.verification && item.verification.details) {
            const details = item.verification.details;
            if (details.references > 0) {
              lines.push(`  - References: ${details.references}`);
            }
            if (details.isPublicAPI) {
              lines.push(`  - Part of public API`);
            }
          }
        }
        lines.push('');
      }
    }

    // Before/After Metrics Comparison
    lines.push('## Metrics Comparison');
    lines.push('');
    lines.push('| Metric | Before | After | Change |');
    lines.push('|--------|--------|-------|--------|');
    
    // Files
    const fileChange = improvements.baseline.totalFiles - improvements.current.totalFiles;
    lines.push(`| Total Files | ${improvements.baseline.totalFiles} | ${improvements.current.totalFiles} | -${fileChange} |`);
    
    // Lines
    const lineChange = improvements.linesReduced;
    lines.push(`| Total Lines | ${improvements.baseline.totalLines.toLocaleString()} | ${improvements.current.totalLines.toLocaleString()} | -${lineChange.toLocaleString()} |`);
    
    // Coverage
    if (improvements.baseline.coverage !== null && improvements.current.coverage !== null) {
      const coverageChange = improvements.coverageImprovement >= 0 ? '+' : '';
      lines.push(`| Coverage | ${improvements.baseline.coverage.toFixed(2)}% | ${improvements.current.coverage.toFixed(2)}% | ${coverageChange}${improvements.coverageImprovement.toFixed(2)}% |`);
    }
    
    // Bundle Size
    const bundleChange = improvements.bundleSizeReduction / 1024;
    lines.push(`| Bundle Size | ${(improvements.baseline.bundleSize / 1024).toFixed(2)} KB | ${(improvements.current.bundleSize / 1024).toFixed(2)} KB | -${bundleChange.toFixed(2)} KB |`);
    
    lines.push('');

    // Failed Actions (if any)
    const failedActions = this.actionLogger.getActionsByResult('failed');
    
    if (failedActions.length > 0) {
      lines.push('## Failed Actions');
      lines.push('');
      lines.push('The following actions failed and were rolled back:');
      lines.push('');

      for (const action of failedActions) {
        lines.push(`- **${action.item}**`);
        if (action.reason) {
          lines.push(`  - Reason: ${action.reason}`);
        }
      }
      lines.push('');
    }

    // Next Steps
    lines.push('## Next Steps');
    lines.push('');

    if (verificationResults && verificationResults.review && verificationResults.review.length > 0) {
      lines.push('1. **Review flagged items:** Manually review the items listed in "Kept for Review" section');
      lines.push('2. **Verify functionality:** Run the application and test key features');
      lines.push('3. **Run full test suite:** Ensure all tests pass after cleanup');
      lines.push('4. **Consider additional cleanup:** Review low-usage files for potential refactoring');
    } else {
      lines.push('1. **Verify functionality:** Run the application and test key features');
      lines.push('2. **Run full test suite:** Ensure all tests pass after cleanup');
      lines.push('3. **Merge changes:** If everything looks good, merge the cleanup branch');
    }

    if (improvements.filesRemoved === 0 && improvements.functionsRemoved === 0) {
      lines.push('');
      lines.push('**Note:** No code was removed during this cleanup. This could mean:');
      lines.push('- The codebase is already well-maintained');
      lines.push('- Coverage thresholds may need adjustment');
      lines.push('- Manual review of flagged items is needed');
    }

    lines.push('');

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Report generated on ${new Date().toLocaleString()}*`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Save report to file
   * @param {string} content - Report content
   * @param {string} outputPath - Optional output path
   * @returns {string} Path where report was saved
   */
  saveReport(content, outputPath = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeComponent = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const filename = outputPath || `cleanup-report-${timestamp}-${timeComponent}.md`;

    try {
      this.fs.writeFileSync(filename, content, 'utf-8');
      this.logger.success(`Cleanup report saved to: ${filename}`);
      return filename;
    } catch (error) {
      this.logger.error(`Failed to save report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate and save cleanup report
   * @param {object} improvements - Improvement metrics
   * @param {object} verificationResults - Verification results (optional)
   * @returns {string} Path to saved report
   */
  generateAndSave(improvements, verificationResults = null) {
    const content = this.generateMarkdownReport(improvements, verificationResults);
    return this.saveReport(content);
  }
}

// ============================================================================
// Terminal Summary Display
// ============================================================================

class TerminalSummaryDisplay {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Get color code for terminal output
   * @private
   * @param {string} color - Color name
   * @returns {string} ANSI color code
   */
  _getColor(color) {
    const colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m'
    };
    return colors[color] || colors.reset;
  }

  /**
   * Colorize text for terminal output
   * @private
   * @param {string} text - Text to colorize
   * @param {string} color - Color name
   * @returns {string} Colorized text
   */
  _colorize(text, color) {
    // Check if terminal supports colors
    const supportsColor = process.stdout.isTTY && process.env.TERM !== 'dumb';
    
    if (!supportsColor) {
      return text;
    }

    return `${this._getColor(color)}${text}${this._getColor('reset')}`;
  }

  /**
   * Display colorized summary of cleanup results
   * @param {object} improvements - Improvement metrics
   * @param {string} reportPath - Path to detailed report
   * @param {object} verificationResults - Verification results (optional)
   */
  displaySummary(improvements, reportPath, verificationResults = null) {
    console.log('');
    console.log(this._colorize('═'.repeat(70), 'cyan'));
    console.log(this._colorize('                    CLEANUP SUMMARY                    ', 'bright'));
    console.log(this._colorize('═'.repeat(70), 'cyan'));
    console.log('');

    // Key Metrics
    console.log(this._colorize('📊 KEY METRICS:', 'bright'));
    console.log('');

    // Files Removed
    if (improvements.filesRemoved > 0) {
      console.log(`   ${this._colorize('✓', 'green')} Files Removed: ${this._colorize(improvements.filesRemoved.toString(), 'green')}`);
    } else {
      console.log(`   ${this._colorize('○', 'yellow')} Files Removed: ${this._colorize('0', 'yellow')}`);
    }

    // Functions Removed
    if (improvements.functionsRemoved > 0) {
      console.log(`   ${this._colorize('✓', 'green')} Functions Removed: ${this._colorize(improvements.functionsRemoved.toString(), 'green')}`);
    } else {
      console.log(`   ${this._colorize('○', 'yellow')} Functions Removed: ${this._colorize('0', 'yellow')}`);
    }

    // Lines Reduced
    if (improvements.linesReduced > 0) {
      console.log(`   ${this._colorize('✓', 'green')} Lines of Code Reduced: ${this._colorize(improvements.linesReduced.toLocaleString(), 'green')}`);
    } else {
      console.log(`   ${this._colorize('○', 'yellow')} Lines of Code Reduced: ${this._colorize('0', 'yellow')}`);
    }

    // Coverage Improvement
    if (improvements.coverageImprovement !== 0) {
      const coverageColor = improvements.coverageImprovement > 0 ? 'green' : 'red';
      const coverageSymbol = improvements.coverageImprovement > 0 ? '↑' : '↓';
      const coverageChange = improvements.coverageImprovement >= 0 ? '+' : '';
      console.log(`   ${this._colorize(coverageSymbol, coverageColor)} Coverage Change: ${this._colorize(coverageChange + improvements.coverageImprovement.toFixed(2) + '%', coverageColor)}`);
    }

    // Bundle Size Reduction
    if (improvements.bundleSizeReduction > 0) {
      const sizeKB = (improvements.bundleSizeReduction / 1024).toFixed(2);
      console.log(`   ${this._colorize('✓', 'green')} Bundle Size Reduced: ${this._colorize(sizeKB + ' KB', 'green')}`);
    } else {
      console.log(`   ${this._colorize('○', 'yellow')} Bundle Size Reduced: ${this._colorize('0 KB', 'yellow')}`);
    }

    console.log('');

    // Before/After Comparison
    console.log(this._colorize('📈 BEFORE → AFTER:', 'bright'));
    console.log('');
    console.log(`   Files:    ${improvements.baseline.totalFiles} → ${improvements.current.totalFiles}`);
    console.log(`   Lines:    ${improvements.baseline.totalLines.toLocaleString()} → ${improvements.current.totalLines.toLocaleString()}`);
    
    if (improvements.baseline.coverage !== null && improvements.current.coverage !== null) {
      console.log(`   Coverage: ${improvements.baseline.coverage.toFixed(2)}% → ${improvements.current.coverage.toFixed(2)}%`);
    }
    
    const baselineSizeKB = (improvements.baseline.bundleSize / 1024).toFixed(2);
    const currentSizeKB = (improvements.current.bundleSize / 1024).toFixed(2);
    console.log(`   Size:     ${baselineSizeKB} KB → ${currentSizeKB} KB`);
    console.log('');

    // Review Items
    if (verificationResults && verificationResults.review && verificationResults.review.length > 0) {
      console.log(this._colorize('⚠️  ITEMS FOR REVIEW:', 'yellow'));
      console.log('');
      console.log(`   ${verificationResults.review.length} item(s) need manual review`);
      console.log(`   See detailed report for more information`);
      console.log('');
    }

    // Detailed Report
    console.log(this._colorize('📄 DETAILED REPORT:', 'bright'));
    console.log('');
    console.log(`   ${this._colorize(reportPath, 'cyan')}`);
    console.log('');

    // Next Steps
    console.log(this._colorize('🎯 NEXT STEPS:', 'bright'));
    console.log('');

    if (improvements.filesRemoved > 0 || improvements.functionsRemoved > 0) {
      console.log('   1. Review the detailed report');
      console.log('   2. Run the application and test key features');
      console.log('   3. Run the full test suite');
      console.log('   4. Merge the cleanup branch if everything looks good');
    } else {
      console.log('   1. Review the detailed report');
      console.log('   2. Check items flagged for manual review');
      console.log('   3. Consider adjusting coverage thresholds');
    }

    console.log('');
    console.log(this._colorize('═'.repeat(70), 'cyan'));
    console.log('');

    // Success message
    if (improvements.filesRemoved > 0 || improvements.functionsRemoved > 0) {
      console.log(this._colorize('✨ Cleanup completed successfully!', 'green'));
    } else {
      console.log(this._colorize('✓ Cleanup analysis completed - no changes made', 'yellow'));
    }
    console.log('');
  }

  /**
   * Display error summary
   * @param {string} errorMessage - Error message
   */
  displayError(errorMessage) {
    console.log('');
    console.log(this._colorize('═'.repeat(70), 'red'));
    console.log(this._colorize('                    CLEANUP FAILED                     ', 'red'));
    console.log(this._colorize('═'.repeat(70), 'red'));
    console.log('');
    console.log(this._colorize('❌ Error:', 'red'));
    console.log(`   ${errorMessage}`);
    console.log('');
    console.log(this._colorize('═'.repeat(70), 'red'));
    console.log('');
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
    
    this.baseline = null; // Store baseline metrics
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
    
    try {
      // Collect baseline metrics before any changes
      if (!this.baseline) {
        this.baseline = this.baselineCollector.collectBaseline();
        this.logger.info('');
      }
      
      // Run full coverage workflow
      const coverageResults = await this.coverageRunner.runFullCoverage();
      
      this.logger.success('Coverage collection completed');
      
      // Parse and structure coverage data
      const structuredData = await this.codeAnalyzer.parseCoverageData();
      
      this.logger.success('Coverage data parsed and structured');
      
      // Generate and display analysis report
      this.reportGenerator.generateReport(structuredData);
      
      // Store results for next phases
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
      // Check if we have analysis results
      if (!this.results.analysis || !this.results.analysis.structuredData) {
        // Try to load from file
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
      
      // Get high-priority items (unused and low-usage files)
      const itemsToVerify = structuredData.items.filter(
        item => item.category === 'unused' || item.category === 'lowUsage'
      );

      this.logger.info(`Found ${itemsToVerify.length} items to verify`);

      // Verify all items
      const verificationResults = await this.safetyVerifier.verifyMultipleFiles(itemsToVerify);

      // Log verification decisions
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

      // Generate and display report
      const report = this.safetyVerifier.generateVerificationReport(verificationResults);
      this.logger.info('');
      this.logger.info(report);

      // Save verification results
      const outputPath = resolve('cleanup-verification.json');
      writeFileSync(outputPath, JSON.stringify(verificationResults, null, 2), 'utf-8');
      this.logger.success(`Verification results saved to: ${outputPath}`);

      // Store results
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
      // Load verification results
      const verificationPath = resolve('cleanup-verification.json');
      
      if (!existsSync(verificationPath)) {
        throw new Error('Verification results not found. Run verification phase first.');
      }

      const verificationResults = JSON.parse(readFileSync(verificationPath, 'utf-8'));

      // Get files marked as safe to remove
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

      // Check git status
      const gitStatus = await this.gitBranchManager.checkGitStatus();

      if (!gitStatus.clean) {
        this.logger.warn('Git working directory has uncommitted changes');
        this.logger.warn('Please commit or stash changes before running cleanup');
        throw new Error('Git working directory is not clean');
      }

      // Create cleanup branch
      const originalBranch = gitStatus.branch;
      const cleanupBranch = await this.gitBranchManager.createCleanupBranch();

      this.logger.info(`Created cleanup branch: ${cleanupBranch}`);

      // Process files with test validation
      const itemsToProcess = safeFiles.map(file => ({
        description: file.path,
        removalFn: async () => {
          // Remove file and associated tests
          const result = await this.fileRemover.deleteFileWithTests(file.path);
          
          if (result.success) {
            // Update imports in other files
            await this.importUpdater.updateAllImports(file.path, false);
            
            // Log successful removal
            this.actionLogger.logFileRemoval(
              file.path,
              'success',
              file.verification.reason
            );
          } else {
            // Log failed removal
            this.actionLogger.logFileRemoval(
              file.path,
              'failed',
              'File deletion failed'
            );
          }

          return result;
        },
        commitFn: async () => {
          // Stage all changes
          await this.gitBranchManager._executeGitCommand(['add', '-A']);
          
          // Commit
          await this.gitBranchManager.commitChanges(
            `Remove unused file: ${file.path}\n\nCoverage: ${file.coverage}%\nReason: ${file.verification.reason}`
          );
        }
      }));

      // Process items with validation
      const validationResults = await this.testValidator.processMultipleWithValidation(itemsToProcess);
      
      // Log test results
      for (const detail of validationResults.details) {
        if (detail.testResult) {
          this.actionLogger.logTestResult(
            detail.description,
            detail.testResult.passed,
            detail.testResult.output
          );
        }
      }

      // Store results
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
    this.logger.info('');
    this.logger.info('='.repeat(60));
    this.logger.info('PHASE 4: REPORTING');
    this.logger.info('='.repeat(60));
    this.logger.info('');

    try {
      // If baseline wasn't collected yet, collect it now
      if (!this.baseline) {
        this.baseline = this.baselineCollector.collectBaseline();
      }

      // Calculate improvement metrics
      const improvements = await this.metricsCalculator.calculateImprovements(
        this.baseline,
        this.coverageRunner
      );

      // Load verification results if available
      let verificationResults = null;
      const verificationPath = resolve('cleanup-verification.json');
      if (existsSync(verificationPath)) {
        verificationResults = JSON.parse(readFileSync(verificationPath, 'utf-8'));
      }

      // Generate and save markdown report
      const reportPath = this.cleanupReportGenerator.generateAndSave(
        improvements,
        verificationResults
      );

      // Save action log
      this.actionLogger.saveToFile('cleanup-actions.json');

      // Display terminal summary
      this.terminalDisplay.displaySummary(
        improvements,
        reportPath,
        verificationResults
      );

      // Store results
      this.results.report = {
        status: 'completed',
        reportPath,
        improvements,
        actionSummary: this.actionLogger.getSummary()
      };

      this.logger.success('Report phase completed');

    } catch (error) {
      this.logger.error('Report phase failed:', error.message);
      this.terminalDisplay.displayError(error.message);
      this.results.report = {
        status: 'failed',
        error: error.message
      };
      throw error;
    }
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
