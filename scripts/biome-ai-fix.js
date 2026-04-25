#!/usr/bin/env node
/**
 * AI Bulk Fix Script for Biome Errors
 * 
 * This script automates fixing common Biome errors by:
 * 1. Running Biome to get error list
 * 2. Using AI to generate fixes for each file
 * 3. Applying fixes programmatically
 * 4. Validating with Biome
 * 
 * Usage: node biome-ai-fix.js [file-pattern]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
	// Error patterns that can be auto-fixed
	fixablePatterns: [
		{
			rule: 'no-magic-numbers',
			action: 'extract-constants',
			description: 'Extract magic numbers to a CONSTANTS object'
		},
		{
			rule: 'useExponentiationOperator',
			action: 'replace-math-pow',
			description: 'Replace Math.pow with ** operator'
		},
		{
			rule: 'noExplicitAny',
			action: 'fix-any-type',
			description: 'Replace any with unknown or specific type'
		},
		{
			rule: 'useIterableCallbackReturn',
			action: 'fix-foreach-return',
			description: 'Add explicit return to forEach callbacks'
		},
		{
			rule: 'noUselessSwitchCase',
			action: 'remove-default-case',
			description: 'Remove unnecessary default case'
		}
	],
	// Files to ignore
	ignorePatterns: [
		'node_modules',
		'dist',
		'.git'
	]
};

/**
 * Get Biome errors for a file
 */
function getBiomeErrors(filePath) {
	try {
		const result = execSync(
			`npx @biomejs/biome check "${filePath}" --reporter=json 2>&1`,
			{ encoding: 'utf-8', cwd: process.cwd() }
		);
		return JSON.parse(result);
	} catch (error) {
		// Biome exits with error code if there are violations
		try {
			return JSON.parse(error.stdout || error.message);
		} catch {
			return { diagnostics: [] };
		}
	}
}

/**
 * Extract magic numbers from file content
 */
function extractMagicNumbers(content, diagnostics) {
	const magicNumbers = new Set();
	const lines = content.split('\n');
	
	for (const diag of diagnostics) {
		if (diag.category === 'lint' && diag.ruleId?.includes('no-magic-numbers')) {
			const line = lines[diag.location?.span?.start?.line || 0];
			const match = line?.match(/(\d+\.?\d*)/g);
			if (match) {
				match.forEach(num => {
					const n = parseFloat(num);
					// Skip 0, 1, 2, -1, etc. (common non-magic numbers)
					if (n !== 0 && n !== 1 && n !== 2 && n !== -1 && n !== -2) {
						magicNumbers.add(n);
					}
				});
			}
		}
	}
	
	return Array.from(magicNumbers);
}

/**
 * Generate CONSTANTS object from magic numbers
 */
function generateConstants(magicNumbers, context) {
	const constants = {};
	
	for (const num of magicNumbers) {
		// Generate constant name based on context and value
		const name = generateConstantName(num, context);
		constants[name] = num;
	}
	
	return constants;
}

/**
 * Generate a semantic constant name
 */
function generateConstantName(value, context) {
	// Use context clues to generate meaningful names
	// This is a simplified version - real AI would be smarter
	const commonMappings = {
		0.5: 'HALF',
		0.25: 'QUARTER',
		0.1: 'TENTH',
		0.01: 'PERCENT',
		100: 'MAX_VALUE',
		1000: 'SCALE_FACTOR',
		3.14159: 'PI',
		6.28318: 'TWO_PI'
	};
	
	if (commonMappings[value]) {
		return commonMappings[value];
	}
	
	// Default: VALUE_XXX format
	return `VALUE_${value.toString().replace('.', '_')}`;
}

/**
 * Create AI prompt for fixing a file
 */
function createFixPrompt(filePath, content, diagnostics) {
	const magicNumbers = extractMagicNumbers(content, diagnostics);
	
	return `Fix Biome lint errors in this TypeScript file.

FILE: ${filePath}

CURRENT CODE:
\`\`\`typescript
${content}
\`\`\`

ERRORS TO FIX:
${diagnostics.map(d => `- ${d.ruleId} at line ${d.location?.span?.start?.line}: ${d.message}`).join('\n')}

MAGIC NUMBERS FOUND: ${magicNumbers.join(', ')}

INSTRUCTIONS:
1. Create a CONSTANTS object at the top of the file with ALL magic numbers extracted
2. Use descriptive names like ANIMATION_SPEED, BOB_AMPLITUDE, etc.
3. Replace all magic numbers with CONSTANTS.NAME
4. Fix forEach callbacks to use explicit returns: \`.forEach(m => { statement; })\`
5. Replace Math.pow(x, y) with (x ** y)
6. Fix any 'as any' to use proper types or 'as unknown'
7. Keep all existing functionality intact
8. Use consistent indentation (tabs)

Provide the COMPLETE fixed file content.`;
}

/**
 * Apply fixes to a file using AI
 */
async function fixFileWithAI(filePath) {
	console.log(`\n🔧 Fixing ${filePath}...`);
	
	const content = fs.readFileSync(filePath, 'utf-8');
	const biomeResult = getBiomeErrors(filePath);
	
	if (!biomeResult.diagnostics || biomeResult.diagnostics.length === 0) {
		console.log(`  ✓ No errors found`);
		return true;
	}
	
	// Create prompt for AI
	const prompt = createFixPrompt(filePath, content, biomeResult.diagnostics);
	
	// In real implementation, this would call an AI API
	// For now, save the prompt for manual review
	const promptPath = filePath.replace('.ts', '.fix-prompt.txt');
	fs.writeFileSync(promptPath, prompt);
	
	console.log(`  📝 Prompt saved to ${promptPath}`);
	console.log(`  ⏳ Waiting for AI fix...`);
	
	// Check if AI fix file exists
	const fixPath = filePath.replace('.ts', '.ai-fixed.ts');
	if (fs.existsSync(fixPath)) {
		console.log(`  📥 Applying AI fix from ${fixPath}`);
		const fixedContent = fs.readFileSync(fixPath, 'utf-8');
		fs.writeFileSync(filePath, fixedContent);
		fs.unlinkSync(fixPath); // Clean up
		fs.unlinkSync(promptPath);
		
		// Validate with Biome
		const newResult = getBiomeErrors(filePath);
		const remainingErrors = newResult.diagnostics?.length || 0;
		
		if (remainingErrors === 0) {
			console.log(`  ✅ All errors fixed!`);
			return true;
		} else {
			console.log(`  ⚠️  ${remainingErrors} errors remain`);
			return false;
		}
	}
	
	return false;
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2);
	const pattern = args[0] || '**/*.ts';
	
	console.log(`🔍 Finding files matching: ${pattern}`);
	
	// Get list of files with errors
	let filesToFix;
	try {
		const result = execSync(
			`npx @biomejs/biome check . --reporter=summary 2>&1`,
			{ encoding: 'utf-8' }
		);
		console.log('No files with errors found');
		return;
	} catch (error) {
		// Parse error output to find files
		const output = error.stdout || error.message;
		const fileMatches = output.match(/- ([^\n]+\.ts)/g);
		filesToFix = fileMatches?.map(m => m.replace('- ', '')) || [];
	}
	
	console.log(`Found ${filesToFix.length} files with errors`);
	
	let fixed = 0;
	let failed = 0;
	
	for (const file of filesToFix.slice(0, 10)) { // Limit to 10 files per run
		if (CONFIG.ignorePatterns.some(p => file.includes(p))) {
			continue;
		}
		
		if (fs.existsSync(file)) {
			const success = await fixFileWithAI(file);
			if (success) fixed++;
			else failed++;
		}
	}
	
	console.log(`\n📊 Results: ${fixed} fixed, ${failed} remaining`);
	
	if (failed > 0) {
		console.log('\n💡 Next steps:');
		console.log('1. Review .fix-prompt.txt files');
		console.log('2. Send prompts to AI (ChatGPT, Claude, etc.)');
		console.log('3. Save AI responses as .ai-fixed.ts files');
		console.log('4. Re-run this script to apply fixes');
	}
}

main().catch(console.error);
