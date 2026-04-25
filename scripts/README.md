# AI Bulk Fix for Biome Errors

This directory contains tools for automated fixing of Biome lint errors using AI.

## How It Works

1. **Extract Errors**: Script runs Biome to get list of files with errors
2. **Generate Prompts**: Creates AI prompts with file content + error list
3. **AI Processing**: Send prompts to LLM (ChatGPT, Claude, etc.)
4. **Apply Fixes**: AI returns fixed code, script applies it
5. **Validate**: Run Biome again to verify fixes

## Quick Start

```bash
# 1. Generate fix prompts for files with errors
node scripts/biome-ai-fix.js

# 2. Review generated .fix-prompt.txt files

# 3. Send to AI, save response as .ai-fixed.ts

# 4. Re-run script to apply fixes
node scripts/biome-ai-fix.js
```

## Manual AI Fix Pattern

For a file like `ZombieModel.ts` with these errors:
- `useIterableCallbackReturn` (forEach without return)
- `useExponentiationOperator` (Math.pow instead of **)
- `noExplicitAny` (using `as any`)

### AI Prompt Template:

```
Fix these Biome errors in ZombieModel.ts:

ERRORS:
- lint/suspicious/useIterableCallbackReturn at line 147: forEach callback should return a value
- lint/style/useExponentiationOperator at line 610: Use ** instead of Math.pow
- lint/suspicious/noExplicitAny at line 153: Don't use 'as any'

CODE SECTIONS TO FIX:

Line 147:
this.arms.left?.getChildMeshes().forEach(m => (m as BABYLON.Mesh).material = zombieSkinMaterial);

Line 610:
let height = -Math.pow(distFromCenter / radius, 1.2) * bowlDepth;

Line 153:
(this.mesh as any).animationGroups = this.animationGroups;

FIXES NEEDED:
1. forEach: Change arrow function to use explicit return: `m => { (m as BABYLON.Mesh).material = zombieSkinMaterial; }`
2. Math.pow: Replace with `(distFromCenter / radius) ** 1.2`
3. as any: Use `as unknown as { animationGroups: ZombieAnimationGroups }`

Provide the complete fixed file.
```

## Common Fix Patterns

### 1. Magic Numbers → Constants
```typescript
// Before
const isMoving = speed > 0.5;
this.legs.left.rotation.x = (cycle + irregular) * 0.9;

// After
const MOVEMENT_THRESHOLD = 0.5;
const LEG_ROTATION_AMPLITUDE = 0.9;
const isMoving = speed > MOVEMENT_THRESHOLD;
this.legs.left.rotation.x = (cycle + irregular) * LEG_ROTATION_AMPLITUDE;
```

### 2. forEach Without Return
```typescript
// Before (error: useIterableCallbackReturn)
array.forEach(m => (m as Mesh).material = mat);

// After
array.forEach(m => { (m as Mesh).material = mat; });
```

### 3. Math.pow → **
```typescript
// Before (info: useExponentiationOperator)
Math.pow(x, 1.2)

// After
x ** 1.2
```

### 4. noExplicitAny
```typescript
// Before (warning: noExplicitAny)
(mesh as any).property = value;

// After
(mesh as unknown as { property: Type }).property = value;
```

## Integration with IDE

### Cursor/Windsurf Workflow:
1. Open file with Biome errors
2. Select all code (Ctrl+A)
3. Ask AI: "Fix all Biome errors in this file"
4. Review changes
5. Save and run `npm run lint` to verify

### VS Code + GitHub Copilot:
1. Install Biome extension
2. Run `Biome: Check` command
3. Use Copilot's "Fix all" feature on error panel

## Batch Processing Script

```bash
# Fix all files with more than 10 errors
for file in $(npx @biomejs/biome check . --reporter=summary 2>&1 | grep -E '\.ts$' | head -20); do
  echo "Fixing $file..."
  node scripts/biome-ai-fix.js "$file"
done
```

## Troubleshooting

- **"File ignored"**: Check biome.json `files.includes`
- **Parse errors**: Ensure TypeScript is valid before running Biome
- **AI doesn't understand**: Provide more context in prompt, include file purpose
