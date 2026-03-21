/**
 * Formatting Utilities
 * Shared formatting helpers for bytes, numbers, time, etc.
 */

export class FormatUtils {
    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @param {number} [decimals=2] - Number of decimal places
     * @returns {string} - Formatted string (e.g., "1.5 MB")
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
    }

    /**
     * Format milliseconds to human readable duration
     * @param {number} ms - Milliseconds
     * @returns {string} - Formatted string (e.g., "1h 30m")
     */
    static formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m ${seconds % 60}s`;
    }

    /**
     * Format a number with commas as thousands separators
     * @param {number} num - Number to format
     * @returns {string} - Formatted number
     */
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Format FPS value with appropriate color indicator
     * @param {number} fps - Frames per second
     * @returns {string} - Formatted FPS string
     */
    static formatFPS(fps) {
        if (fps >= 55) return `${fps.toFixed(1)} (Good)`;
        if (fps >= 30) return `${fps.toFixed(1)} (OK)`;
        return `${fps.toFixed(1)} (Poor)`;
    }

    /**
     * Format percentage with color indicator
     * @param {number} value - Value between 0 and 1
     * @returns {string} - Formatted percentage
     */
    static formatPercentage(value) {
        const percentage = (value * 100).toFixed(1);
        return `${percentage}%`;
    }
}
