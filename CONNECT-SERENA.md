# Connect Serena MCP - Quick Start

## ✅ Setup Complete

Your Serena MCP configuration is ready at `.kiro/settings/mcp.json`

## 🚀 Activate Serena (Choose One Method)

### Method 1: Command Palette (Recommended)
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `MCP: Reconnect All Servers`
3. Press Enter
4. Wait for connection confirmation

### Method 2: Restart Kiro
- Close and reopen Kiro
- Serena will auto-connect on startup

### Method 3: MCP Server View
1. Open Kiro feature panel (sidebar)
2. Navigate to "MCP Server" view
3. Find "serena" in the list
4. Click reconnect button

## ✓ Verify Connection

Once connected, you'll see Serena tools available. Test with:

```
"List available MCP tools"
```

Or try a real analysis:

```
"Use Serena to analyze the zombie pathfinding system"
```

## 📖 Demo Analysis Available

I've created `serena-demo-analysis.md` showing what Serena would discover about your agent architecture:

- Three-layer pattern analysis
- State machine documentation
- Dependency graphs
- Performance metrics
- Refactoring opportunities
- TypeScript migration priorities

## 🎯 First Commands to Try

Once Serena is connected:

1. **Analyze Agent Architecture**:
   ```
   "Use Serena to analyze MyHavokSimCode/Agents/Zombies/"
   ```

2. **Find State Machines**:
   ```
   "Use Serena to find all state machine implementations"
   ```

3. **Check TypeScript Migration**:
   ```
   "Use Serena to show TypeScript migration status in core/"
   ```

4. **Performance Analysis**:
   ```
   "Use Serena to analyze the performance monitoring system"
   ```

5. **Generate Documentation**:
   ```
   "Use Serena to generate documentation for the level system"
   ```

## 🔧 Troubleshooting

### If Serena doesn't connect:

**Check uvx is working**:
```powershell
uvx --version
```
Should show: `uvx 0.9.18` ✓

**Test Serena manually**:
```powershell
uvx serena-mcp
```

**Check configuration**:
```powershell
type .kiro\settings\mcp.json
```

Should show the Serena configuration.

### Common Issues:

1. **"uvx not found"**:
   - Install uv: `pip install uv`
   - Or use installer: https://docs.astral.sh/uv/getting-started/installation/

2. **"Connection timeout"**:
   - Check firewall settings
   - Try manual test: `uvx serena-mcp`

3. **"Tools not available"**:
   - Verify connection in MCP Server view
   - Check Kiro output panel for errors

## 📚 Resources

- **Demo Analysis**: `serena-demo-analysis.md` - See what Serena can do
- **Quick Reference**: `serena-quick-reference.md` - Command examples
- **Full Guide**: `demo-serena-mcp.md` - Complete documentation

## 🎉 Ready to Go!

Your configuration is complete. Just reconnect MCP servers and start analyzing your codebase!
