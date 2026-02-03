# Serena MCP Demo Guide

## What is Serena MCP?

Serena is an MCP (Model Context Protocol) server that provides AI-powered code analysis and understanding capabilities. It helps with:

- **Code Understanding**: Analyze code structure, dependencies, and relationships
- **Documentation Generation**: Create comprehensive documentation from code
- **Code Search**: Semantic search across your codebase
- **Refactoring Suggestions**: Identify improvement opportunities
- **Architecture Analysis**: Understand system design and patterns

## Setup Complete ✓

Serena MCP has been configured in `.kiro/settings/mcp.json` and will automatically connect when Kiro restarts or when you reconnect MCP servers.

## How to Use Serena

### 1. Restart Kiro or Reconnect MCP Servers

You can reconnect MCP servers without restarting Kiro:
- Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
- Search for "MCP: Reconnect All Servers"
- Or navigate to the MCP Server view in the Kiro feature panel

### 2. Verify Connection

Once connected, Serena tools will be available. You can ask me to:

```
"Use Serena to analyze the VillageEngine class"
"Ask Serena to explain the agent architecture"
"Use Serena to find all state machine implementations"
```

### 3. Demo Scenarios for Your Codebase

#### Scenario 1: Analyze Agent Architecture
```
"Use Serena to analyze the agent system architecture in MyHavokSimCode/Agents/"
```

This will help understand:
- How different agent types (Villagers, Zombies, Fish, Birds, etc.) are structured
- Common patterns across agent implementations
- Dependencies between agent components

#### Scenario 2: Understand the TypeScript Migration
```
"Use Serena to analyze the TypeScript migration progress in MyHavokSimCode/core/"
```

This will show:
- Which files have been migrated (.ts vs .js)
- Type definitions and interfaces
- Migration patterns being used

#### Scenario 3: Performance System Analysis
```
"Use Serena to analyze the performance monitoring system in MyHavokSimCode/Performance/"
```

This will reveal:
- How performance tracking is implemented
- Integration points with the main engine
- Optimization strategies in use

#### Scenario 4: Level System Documentation
```
"Use Serena to generate documentation for the level system"
```

This will create:
- Overview of level configuration
- How levels are loaded and managed
- Available level types and their features

## Expected Serena Tools

Once connected, Serena typically provides tools like:

- `analyze_code`: Deep analysis of code structure and patterns
- `search_code`: Semantic search across the codebase
- `explain_code`: Natural language explanations of code functionality
- `generate_docs`: Automatic documentation generation
- `find_dependencies`: Trace code dependencies and relationships
- `suggest_refactoring`: Identify improvement opportunities

## Troubleshooting

### If Serena doesn't connect:

1. **Check uvx installation**:
   ```bash
   uvx --version
   ```

2. **Manually test Serena**:
   ```bash
   uvx serena-mcp
   ```

3. **Check MCP logs**:
   - Look for connection errors in the Kiro output panel
   - Check the MCP Server view for status

4. **Verify configuration**:
   - Ensure `.kiro/settings/mcp.json` is properly formatted
   - Check that `disabled` is set to `false`

### If you need to install uv/uvx:

Windows (PowerShell):
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

macOS/Linux:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Or use pip:
```bash
pip install uv
```

## Next Steps

1. **Reconnect MCP servers** to activate Serena
2. **Try the demo scenarios** above to explore capabilities
3. **Integrate into your workflow** for code analysis during development
4. **Auto-approve common tools** by adding them to the `autoApprove` array in mcp.json

## Benefits for Your Project

Given your 3D village simulation codebase, Serena can help with:

- **Understanding complex agent behaviors**: Analyze state machines and AI logic
- **TypeScript migration**: Track progress and ensure consistency
- **Performance optimization**: Identify bottlenecks and optimization opportunities
- **Documentation**: Generate docs for the extensive agent and system architecture
- **Onboarding**: Help new developers understand the codebase structure
- **Refactoring**: Identify code duplication and improvement opportunities

---

**Configuration Location**: `.kiro/settings/mcp.json`
**Status**: ✓ Configured and ready to connect
**Next Action**: Reconnect MCP servers to activate Serena
