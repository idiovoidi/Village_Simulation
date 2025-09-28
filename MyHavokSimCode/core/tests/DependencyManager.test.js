/**
 * Unit tests for DependencyManager class
 * Tests backup, validation, version comparison, and rollback functionality
 */

// Mock fs module for testing
const mockFs = {
    promises: {
        mkdir: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        readdir: jest.fn(),
        access: jest.fn()
    }
};

// Mock path module
const mockPath = {
    join: (...args) => args.join('/'),
    resolve: (path) => path
};

// Mock imports
jest.mock('fs', () => mockFs);
jest.mock('path', () => mockPath);

// Import DependencyManager after mocking
const DependencyManager = require('../DependencyManager.js');

describe('DependencyManager', () => {
    let dependencyManager;
    
    beforeEach(() => {
        dependencyManager = new DependencyManager();
        jest.clearAllMocks();
    });

    describe('Version Comparison', () => {
        test('should correctly compare semantic versions', () => {
            expect(dependencyManager.compareVersions('1.0.0', '2.0.0')).toBe(-1);
            expect(dependencyManager.compareVersions('2.0.0', '1.0.0')).toBe(1);
            expect(dependencyManager.compareVersions('1.0.0', '1.0.0')).toBe(0);
        });

        test('should handle version prefixes', () => {
            expect(dependencyManager.compareVersions('^1.0.0', '~2.0.0')).toBe(-1);
            expect(dependencyManager.compareVersions('>=2.0.0', '<1.0.0')).toBe(1);
        });

        test('should handle different version lengths', () => {
            expect(dependencyManager.compareVersions('1.0', '1.0.0')).toBe(0);
            expect(dependencyManager.compareVersions('1.0.1', '1.0')).toBe(1);
        });
    });

    describe('getCurrentVersions', () => {
        test('should parse package.json correctly', async () => {
            const mockPackageJson = {
                dependencies: {
                    '@babylonjs/core': '^8.4.0',
                    '@babylonjs/gui': '^8.4.0'
                },
                devDependencies: {
                    'http-server': '^14.1.1'
                }
            };

            mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

            const result = await dependencyManager.getCurrentVersions();

            expect(result).toEqual({
                dependencies: mockPackageJson.dependencies,
                devDependencies: mockPackageJson.devDependencies
            });
        });

        test('should handle missing package.json', async () => {
            mockFs.promises.readFile.mockRejectedValue(new Error('File not found'));

            const result = await dependencyManager.getCurrentVersions();

            expect(result).toEqual({
                dependencies: {},
                devDependencies: {}
            });
        });
    });

    describe('createBackup', () => {
        test('should create backup successfully', async () => {
            const mockPackageJson = '{"name": "test"}';
            const mockLockFile = 'lockfileVersion: 9.0';

            mockFs.promises.readFile
                .mockResolvedValueOnce(mockPackageJson)
                .mockResolvedValueOnce(mockLockFile);
            mockFs.promises.mkdir.mockResolvedValue();
            mockFs.promises.writeFile.mockResolvedValue();

            const result = await dependencyManager.createBackup();

            expect(result).toBe(true);
            expect(mockFs.promises.mkdir).toHaveBeenCalled();
            expect(mockFs.promises.writeFile).toHaveBeenCalledTimes(3); // package.json, lock file, metadata
        });

        test('should handle backup creation errors gracefully', async () => {
            mockFs.promises.mkdir.mockRejectedValue(new Error('Permission denied'));

            const result = await dependencyManager.createBackup();

            expect(result).toBe(false);
        });
    });

    describe('validateDependencies', () => {
        beforeEach(() => {
            const mockCurrentVersions = {
                dependencies: {
                    '@babylonjs/core': '^8.4.0',
                    '@babylonjs/gui': '^8.4.0'
                },
                devDependencies: {}
            };
            
            mockFs.promises.readFile.mockResolvedValue(JSON.stringify({
                dependencies: mockCurrentVersions.dependencies,
                devDependencies: mockCurrentVersions.devDependencies
            }));
        });

        test('should detect major version upgrades', async () => {
            const newVersions = {
                dependencies: {
                    '@babylonjs/core': '^9.0.0',
                    '@babylonjs/gui': '^9.0.0'
                }
            };

            const result = await dependencyManager.validateDependencies(newVersions);

            expect(result.valid).toBe(true);
            expect(result.warnings).toHaveLength(2);
            expect(result.warnings[0]).toContain('Major version upgrade');
        });

        test('should handle Havok compatibility warnings', async () => {
            const newVersions = {
                dependencies: {
                    '@babylonjs/havok': '^1.4.0'
                }
            };

            const result = await dependencyManager.validateDependencies(newVersions);

            expect(result.warnings.some(w => w.includes('Havok physics version'))).toBe(true);
        });

        test('should handle validation errors', async () => {
            mockFs.promises.readFile.mockRejectedValue(new Error('File not found'));

            const result = await dependencyManager.validateDependencies({});

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
        });
    });

    describe('rollback', () => {
        test('should rollback to latest backup successfully', async () => {
            const mockBackups = ['2024-01-01T10-00-00-000Z', '2024-01-02T10-00-00-000Z'];
            const mockPackageJson = '{"name": "restored"}';
            const mockLockFile = 'restored lock file';

            mockFs.promises.readdir.mockResolvedValue(mockBackups);
            mockFs.promises.access.mockResolvedValue();
            mockFs.promises.readFile
                .mockResolvedValueOnce(mockPackageJson)
                .mockResolvedValueOnce(mockLockFile);
            mockFs.promises.writeFile.mockResolvedValue();

            const result = await dependencyManager.rollback();

            expect(result).toBe(true);
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith('package.json', mockPackageJson);
            expect(mockFs.promises.writeFile).toHaveBeenCalledWith('pnpm-lock.yaml', mockLockFile);
        });

        test('should rollback to specific backup', async () => {
            const specificBackup = '2024-01-01T10-00-00-000Z';
            mockFs.promises.access.mockResolvedValue();
            mockFs.promises.readFile
                .mockResolvedValueOnce('{"name": "specific"}')
                .mockResolvedValueOnce('specific lock');
            mockFs.promises.writeFile.mockResolvedValue();

            const result = await dependencyManager.rollback(specificBackup);

            expect(result).toBe(true);
            expect(mockFs.promises.access).toHaveBeenCalledWith(
                `.dependency-backups/${specificBackup}`
            );
        });

        test('should handle rollback errors', async () => {
            mockFs.promises.readdir.mockRejectedValue(new Error('No backups directory'));

            const result = await dependencyManager.rollback();

            expect(result).toBe(false);
        });
    });

    describe('listBackups', () => {
        test('should list backups with metadata', async () => {
            const mockBackups = ['2024-01-01T10-00-00-000Z', '2024-01-02T10-00-00-000Z'];
            const mockMetadata = {
                createdAt: '2024-01-01T10:00:00.000Z',
                originalVersions: { dependencies: {} }
            };

            mockFs.promises.readdir.mockResolvedValue(mockBackups);
            mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockMetadata));

            const result = await dependencyManager.listBackups();

            expect(result).toHaveLength(2);
            expect(result[0].timestamp).toBe('2024-01-02T10-00-00-000Z'); // Latest first
            expect(result[0].createdAt).toBe(mockMetadata.createdAt);
        });

        test('should handle backups without metadata', async () => {
            const mockBackups = ['backup-without-metadata'];

            mockFs.promises.readdir.mockResolvedValue(mockBackups);
            mockFs.promises.readFile.mockRejectedValue(new Error('No metadata'));

            const result = await dependencyManager.listBackups();

            expect(result).toHaveLength(1);
            expect(result[0].createdAt).toBe('Unknown');
        });
    });

    describe('updatePackageJson', () => {
        test('should update package.json with new versions', async () => {
            const mockPackageJson = {
                dependencies: {
                    '@babylonjs/core': '^8.4.0'
                },
                devDependencies: {
                    'http-server': '^14.1.1'
                }
            };

            const newVersions = {
                dependencies: {
                    '@babylonjs/core': '^8.29.0',
                    '@babylonjs/gui': '^8.29.0'
                }
            };

            mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));
            mockFs.promises.writeFile.mockResolvedValue();

            const result = await dependencyManager.updatePackageJson(newVersions);

            expect(result).toBe(true);
            
            const expectedPackageJson = {
                dependencies: {
                    '@babylonjs/core': '^8.29.0',
                    '@babylonjs/gui': '^8.29.0'
                },
                devDependencies: {
                    'http-server': '^14.1.1'
                }
            };

            expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
                'package.json',
                JSON.stringify(expectedPackageJson, null, 2)
            );
        });

        test('should handle update errors', async () => {
            mockFs.promises.readFile.mockRejectedValue(new Error('File not found'));

            const result = await dependencyManager.updatePackageJson({});

            expect(result).toBe(false);
        });
    });

    describe('getLastValidationResults', () => {
        test('should return last validation results', async () => {
            // First run a validation
            mockFs.promises.readFile.mockResolvedValue(JSON.stringify({
                dependencies: { '@babylonjs/core': '^8.4.0' },
                devDependencies: {}
            }));

            await dependencyManager.validateDependencies({
                dependencies: { '@babylonjs/core': '^9.0.0' }
            });

            const results = dependencyManager.getLastValidationResults();

            expect(results).toBeDefined();
            expect(results.valid).toBe(true);
            expect(results.warnings).toBeDefined();
        });
    });
});

// Test runner configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testEnvironment: 'node',
        setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    };
}