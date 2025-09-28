/**
 * Development Environment Test
 * Tests that all development tools and dependencies work correctly
 */

// Test development environment functionality
function testDevelopmentEnvironment() {
    console.log("Testing development environment...");
    
    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        details: []
    };
    
    function addResult(test, status, message) {
        results.details.push({ test, status, message });
        if (status === 'pass') results.passed++;
        else if (status === 'fail') results.failed++;
        else if (status === 'warn') results.warnings++;
    }
    
    try {
        // Test 1: Check if all Babylon.js packages are loaded
        const babylonPackages = [
            { name: 'Core', check: () => typeof BABYLON !== 'undefined' && BABYLON.Engine },
            { name: 'GUI', check: () => typeof BABYLON.GUI !== 'undefined' },
            { name: 'Loaders', check: () => typeof BABYLON.SceneLoader !== 'undefined' },
            { name: 'Materials', check: () => typeof BABYLON.StandardMaterial !== 'undefined' },
            { name: 'Havok Physics', check: () => typeof HavokPhysics !== 'undefined' }
        ];
        
        babylonPackages.forEach(pkg => {
            try {
                if (pkg.check()) {
                    addResult(`Babylon.js ${pkg.name}`, 'pass', `${pkg.name} package loaded successfully`);
                } else {
                    addResult(`Babylon.js ${pkg.name}`, 'fail', `${pkg.name} package not available`);
                }
            } catch (error) {
                addResult(`Babylon.js ${pkg.name}`, 'fail', `Error checking ${pkg.name}: ${error.message}`);
            }
        });
        
        // Test 2: Check FontAwesome availability (if used)
        if (typeof FontAwesome !== 'undefined' || document.querySelector('link[href*="fontawesome"]')) {
            addResult('FontAwesome', 'pass', 'FontAwesome is available');
        } else {
            addResult('FontAwesome', 'warn', 'FontAwesome not detected (may not be used)');
        }
        
        // Test 3: Test module loading capability
        try {
            // Test if ES6 modules work
            const testModule = `
                export function testFunction() {
                    return "Module loading works";
                }
            `;
            
            const blob = new Blob([testModule], { type: 'application/javascript' });
            const moduleUrl = URL.createObjectURL(blob);
            
            import(moduleUrl).then(module => {
                if (module.testFunction() === "Module loading works") {
                    addResult('ES6 Modules', 'pass', 'ES6 module loading works');
                } else {
                    addResult('ES6 Modules', 'fail', 'ES6 module loading failed');
                }
                URL.revokeObjectURL(moduleUrl);
            }).catch(error => {
                addResult('ES6 Modules', 'warn', `ES6 modules may have issues: ${error.message}`);
                URL.revokeObjectURL(moduleUrl);
            });
        } catch (error) {
            addResult('ES6 Modules', 'warn', `Cannot test ES6 modules: ${error.message}`);
        }
        
        // Test 4: Test Canvas and WebGL support
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (gl) {
                addResult('WebGL Support', 'pass', 'WebGL is supported');
                
                // Test WebGL extensions
                const extensions = [
                    'WEBGL_depth_texture',
                    'OES_texture_float',
                    'WEBGL_draw_buffers'
                ];
                
                extensions.forEach(ext => {
                    if (gl.getExtension(ext)) {
                        addResult(`WebGL ${ext}`, 'pass', `${ext} extension available`);
                    } else {
                        addResult(`WebGL ${ext}`, 'warn', `${ext} extension not available`);
                    }
                });
            } else {
                addResult('WebGL Support', 'fail', 'WebGL is not supported');
            }
        } catch (error) {
            addResult('WebGL Support', 'fail', `WebGL test failed: ${error.message}`);
        }
        
        // Test 5: Test performance APIs
        if (typeof performance !== 'undefined' && performance.now) {
            addResult('Performance API', 'pass', 'Performance API is available');
        } else {
            addResult('Performance API', 'warn', 'Performance API not available');
        }
        
        // Test 6: Test local storage
        try {
            localStorage.setItem('test', 'value');
            if (localStorage.getItem('test') === 'value') {
                addResult('Local Storage', 'pass', 'Local storage is working');
                localStorage.removeItem('test');
            } else {
                addResult('Local Storage', 'fail', 'Local storage read/write failed');
            }
        } catch (error) {
            addResult('Local Storage', 'warn', `Local storage may be restricted: ${error.message}`);
        }
        
        // Test 7: Test fetch API
        if (typeof fetch !== 'undefined') {
            addResult('Fetch API', 'pass', 'Fetch API is available');
        } else {
            addResult('Fetch API', 'warn', 'Fetch API not available');
        }
        
        // Test 8: Test development server capabilities
        try {
            // Test if we can load resources (this indicates the dev server is working)
            const testUrl = window.location.origin + '/package.json';
            fetch(testUrl, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        addResult('Dev Server', 'pass', 'Development server is serving files correctly');
                    } else {
                        addResult('Dev Server', 'warn', 'Development server may have issues');
                    }
                })
                .catch(error => {
                    addResult('Dev Server', 'warn', `Cannot test dev server: ${error.message}`);
                });
        } catch (error) {
            addResult('Dev Server', 'warn', `Dev server test failed: ${error.message}`);
        }
        
        // Test 9: Test browser compatibility
        const browserFeatures = [
            { name: 'Arrow Functions', test: () => { const f = () => true; return f(); } },
            { name: 'Promises', test: () => typeof Promise !== 'undefined' },
            { name: 'Async/Await', test: () => { try { eval('(async () => {})'); return true; } catch { return false; } } },
            { name: 'Classes', test: () => { try { eval('class Test {}'); return true; } catch { return false; } } },
            { name: 'Template Literals', test: () => { try { eval('`test`'); return true; } catch { return false; } } }
        ];
        
        browserFeatures.forEach(feature => {
            try {
                if (feature.test()) {
                    addResult(`Browser ${feature.name}`, 'pass', `${feature.name} supported`);
                } else {
                    addResult(`Browser ${feature.name}`, 'fail', `${feature.name} not supported`);
                }
            } catch (error) {
                addResult(`Browser ${feature.name}`, 'fail', `${feature.name} test failed`);
            }
        });
        
        return results;
        
    } catch (error) {
        addResult('General Environment Test', 'fail', `Unexpected error: ${error.message}`);
        return results;
    }
}

// Run development environment test when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("=== Development Environment Test ===");
    
    const results = testDevelopmentEnvironment();
    
    // Wait a bit for async tests to complete
    setTimeout(() => {
        console.log(`\n=== Environment Test Results ===`);
        console.log(`✓ Passed: ${results.passed}`);
        console.log(`⚠ Warnings: ${results.warnings}`);
        console.log(`✗ Failed: ${results.failed}`);
        
        console.log(`\n=== Detailed Results ===`);
        results.details.forEach(result => {
            const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
            console.log(`${icon} ${result.test}: ${result.message}`);
        });
        
        if (results.failed === 0) {
            console.log("\n✓ Development environment is ready!");
        } else {
            console.log(`\n✗ ${results.failed} critical issues found in development environment`);
        }
    }, 2000);
});