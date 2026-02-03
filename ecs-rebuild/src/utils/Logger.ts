/**
 * Logger
 * 
 * Logging utility with log levels and formatting.
 * Provides structured logging for debugging and monitoring.
 * 
 * Requirements: 18.5
 */

/**
 * Log levels in order of severity.
 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4
}

/**
 * Log entry structure.
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

/**
 * Logger configuration.
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
  maxHistorySize: number;
}

/**
 * Logger class for structured logging with levels.
 */
export class Logger {
  private config: LoggerConfig;
  private history: LogEntry[] = [];
  private categoryFilters: Set<string> = new Set();

  /**
   * Creates a new Logger instance.
   * 
   * @param config - Logger configuration
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: config.minLevel ?? LogLevel.Info,
      enableTimestamps: config.enableTimestamps ?? true,
      enableColors: config.enableColors ?? true,
      maxHistorySize: config.maxHistorySize ?? 1000
    };
  }

  /**
   * Logs a debug message.
   */
  debug(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Debug, category, message, data);
  }

  /**
   * Logs an info message.
   */
  info(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Info, category, message, data);
  }

  /**
   * Logs a warning message.
   */
  warn(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Warn, category, message, data);
  }

  /**
   * Logs an error message.
   */
  error(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Error, category, message, data);
  }

  /**
   * Internal log method.
   */
  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    // Check if level is enabled
    if (level < this.config.minLevel) {
      return;
    }

    // Check if category is filtered
    if (this.categoryFilters.size > 0 && !this.categoryFilters.has(category)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };

    // Add to history
    this.history.push(entry);
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }

    // Output to console
    this.outputToConsole(entry);
  }

  /**
   * Outputs a log entry to the console.
   */
  private outputToConsole(entry: LogEntry): void {
    const parts: string[] = [];

    // Timestamp
    if (this.config.enableTimestamps) {
      const date = new Date(entry.timestamp);
      const timestamp = date.toISOString();
      parts.push(`[${timestamp}]`);
    }

    // Level
    const levelName = LogLevel[entry.level];
    if (this.config.enableColors) {
      parts.push(this.colorizeLevel(levelName, entry.level));
    } else {
      parts.push(`[${levelName}]`);
    }

    // Category
    parts.push(`[${entry.category}]`);

    // Message
    parts.push(entry.message);

    // Output based on level
    const output = parts.join(' ');
    switch (entry.level) {
      case LogLevel.Debug:
        console.debug(output, entry.data ?? '');
        break;
      case LogLevel.Info:
        console.info(output, entry.data ?? '');
        break;
      case LogLevel.Warn:
        console.warn(output, entry.data ?? '');
        break;
      case LogLevel.Error:
        console.error(output, entry.data ?? '');
        break;
    }
  }

  /**
   * Colorizes a log level name for console output.
   */
  private colorizeLevel(levelName: string, level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      [LogLevel.Debug]: '\x1b[36m', // Cyan
      [LogLevel.Info]: '\x1b[32m',  // Green
      [LogLevel.Warn]: '\x1b[33m',  // Yellow
      [LogLevel.Error]: '\x1b[31m', // Red
      [LogLevel.None]: '\x1b[0m'    // Reset
    };
    const reset = '\x1b[0m';
    return `${colors[level]}[${levelName}]${reset}`;
  }

  /**
   * Sets the minimum log level.
   */
  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * Gets the current minimum log level.
   */
  getMinLevel(): LogLevel {
    return this.config.minLevel;
  }

  /**
   * Adds a category filter. Only logs from filtered categories will be shown.
   */
  addCategoryFilter(category: string): void {
    this.categoryFilters.add(category);
  }

  /**
   * Removes a category filter.
   */
  removeCategoryFilter(category: string): void {
    this.categoryFilters.delete(category);
  }

  /**
   * Clears all category filters.
   */
  clearCategoryFilters(): void {
    this.categoryFilters.clear();
  }

  /**
   * Gets the log history.
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /**
   * Gets log history filtered by level.
   */
  getHistoryByLevel(level: LogLevel): LogEntry[] {
    return this.history.filter(entry => entry.level === level);
  }

  /**
   * Gets log history filtered by category.
   */
  getHistoryByCategory(category: string): LogEntry[] {
    return this.history.filter(entry => entry.category === category);
  }

  /**
   * Gets log history within a time range.
   */
  getHistoryByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.history.filter(
      entry => entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }

  /**
   * Clears the log history.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Exports log history as JSON.
   */
  exportHistoryAsJSON(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Exports log history as CSV.
   */
  exportHistoryAsCSV(): string {
    const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Data'];
    const rows = this.history.map(entry => [
      new Date(entry.timestamp).toISOString(),
      LogLevel[entry.level],
      entry.category,
      entry.message,
      entry.data ? JSON.stringify(entry.data) : ''
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Creates a child logger with a specific category prefix.
   */
  createChild(categoryPrefix: string): ChildLogger {
    return new ChildLogger(this, categoryPrefix);
  }
}

/**
 * Child logger that prefixes all categories.
 */
export class ChildLogger {
  constructor(
    private parent: Logger,
    private categoryPrefix: string
  ) {}

  debug(category: string, message: string, data?: unknown): void {
    this.parent.debug(`${this.categoryPrefix}:${category}`, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.parent.info(`${this.categoryPrefix}:${category}`, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.parent.warn(`${this.categoryPrefix}:${category}`, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.parent.error(`${this.categoryPrefix}:${category}`, message, data);
  }
}

/**
 * Global logger instance for convenience.
 */
export const logger = new Logger({
  minLevel: LogLevel.Info,
  enableTimestamps: true,
  enableColors: true,
  maxHistorySize: 1000
});
