# Serena MCP Quick Reference

## Quick Commands for Your Codebase

### Agent System Analysis
```
"Analyze the zombie pathfinding implementation"
"Explain how villager behavior state machines work"
"Find all agent communication patterns"
"Show dependencies between agent types"
```

### Performance System
```
"Analyze the performance monitoring architecture"
"Find all LOD (Level of Detail) implementations"
"Explain the adaptive quality system"
"Show how memory management works"
```

### TypeScript Migration
```
"Show TypeScript migration status in core/"
"Analyze type definitions in ErrorHandling.ts"
"Find JavaScript files that need migration"
"Compare SimulationSetup.ts with its .js version"
```

### Level System
```
"Explain the level configuration system"
"Show how levels are loaded and initialized"
"Find all level-specific features"
"Analyze level selector logic"
```

### Physics & Environment
```
"Analyze the Havok physics integration"
"Explain the water simulation system"
"Show how the day/night cycle works"
"Find all environmental awareness systems"
```

### Architecture Patterns
```
"Identify all state machine implementations"
"Find decorator pattern usage"
"Show component-based architecture patterns"
"Analyze error handling strategies"
```

## Common Workflows

### 1. Before Modifying Code
```
"Use Serena to analyze [filename] before I make changes"
```

### 2. Understanding Dependencies
```
"Show me what depends on [class/module name]"
```

### 3. Finding Similar Code
```
"Find code similar to [description]"
```

### 4. Documentation
```
"Generate documentation for [module/class]"
```

### 5. Refactoring
```
"Suggest refactoring opportunities in [directory]"
```

## Integration with Your Workflow

### During TypeScript Migration
- Analyze .js files before converting
- Verify type definitions after conversion
- Find type-related issues
- Compare migrated vs original files

### During Performance Optimization
- Identify performance bottlenecks
- Find optimization opportunities
- Analyze system resource usage
- Track performance monitoring coverage

### During Feature Development
- Understand existing patterns
- Find similar implementations
- Verify architectural consistency
- Generate documentation

## Pro Tips

1. **Be Specific**: "Analyze zombie pathfinding" is better than "analyze agents"
2. **Use Context**: Reference specific files or directories
3. **Combine Tools**: Use Serena analysis before making changes
4. **Document Findings**: Ask Serena to generate docs for complex systems
5. **Track Patterns**: Use Serena to ensure consistency across similar components

## Your Codebase Structure

Key areas where Serena excels:

- `MyHavokSimCode/Agents/` - 6 agent types with complex behaviors
- `MyHavokSimCode/core/` - Core infrastructure and error handling
- `MyHavokSimCode/Performance/` - 20+ performance optimization modules
- `MyHavokSimCode/LevelSystem/` - Level configuration and loading
- `MyHavokSimCode/Environment/` - Environmental systems
- `MyHavokSimCode/Navigation/` - Pathfinding and navigation mesh

## Status

✓ Serena MCP configured in `.kiro/settings/mcp.json`
✓ uvx installed and ready (v0.9.18)
⏳ Waiting for MCP server connection

**Next**: Reconnect MCP servers to activate Serena tools
