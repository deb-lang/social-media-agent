# Vibe Marketing Skills v2 — Platform Integration Guide

**How to install and use these skills across Claude Code, Claude Code Desktop, Terminal, and Cursor.**

---

## Quick Reference

| Platform | Install Method | Skills Location | Invoke With |
|----------|----------------|-----------------|-------------|
| **Claude Code** (CLI) | `./install.sh` | `~/.claude/skills/` | `/start-here`, `/brand-voice`, etc. |
| **Claude Code Desktop** | Same as Claude Code | Same directory | Same slash commands |
| **Terminal** | Same as Claude Code | Same directory | `claude` then `/start-here` |
| **Cursor** | `./install.sh --cursor` or copy to `~/.claude/skills/` | `~/.claude/skills/` or `~/.cursor/skills/` | Type `/` in Agent chat, search for skill |
| **Claude Desktop** (web app) | Upload ZIP via Settings | Managed by app | Via Skills section |

---

## 1. Claude Code (CLI) & Claude Code Desktop & Terminal

**Claude Code** is Anthropic's official CLI and desktop app for developers. It runs in the terminal (`claude`) or as a desktop app. Both use the **same skills directory**.

### Installation

```bash
cd /path/to/skills-v2
./_system/scripts/install.sh
```

This copies all 11 skills + `_system` to `~/.claude/skills/`.

### Verify

```bash
ls ~/.claude/skills/
# Should show: _system, start-here, brand-voice, positioning-angles, etc.
```

### Usage

1. Open Claude Code: `claude` (terminal) or launch Claude Code Desktop app
2. Navigate to your project directory (where you want `./brand/` and `./campaigns/`)
3. Type `/start-here` to begin, or invoke any skill directly: `/brand-voice`, `/keyword-research`, etc.

### Optional: Add Exa MCP for Web Search

Several skills (SEO content, positioning angles, lead magnet) benefit from live web search. Add Exa MCP:

```bash
claude mcp add --transport http exa https://mcp.exa.ai/mcp
```

Exa provides `web_search_exa`, `get_code_context_exa`, and `company_research_exa` for SERP analysis, competitive research, and real-time data.

---

## 2. Cursor

**Cursor** supports the same Agent Skills standard. Skills are loaded from:

- `~/.claude/skills/` — shared with Claude Code (recommended)
- `~/.cursor/skills/` — Cursor-specific global skills
- `.cursor/skills/` or `.claude/skills/` — project-specific

### Option A: Install to Shared Location (Recommended)

If you've already run `./install.sh` for Claude Code, Cursor will **automatically discover** skills in `~/.claude/skills/`. No extra step needed.

### Option B: Cursor-Only Install

```bash
cd /path/to/skills-v2
./_system/scripts/install.sh --cursor
```

This installs to `~/.cursor/skills/vibe-marketing/` (or `~/.claude/skills/` depending on script — see install.sh `--help`).

### Option C: Project-Specific (Version-Controlled)

Copy skills into your project for team sharing:

```bash
mkdir -p .cursor/skills
cp -R /path/to/skills-v2/* .cursor/skills/
# Or use .claude/skills/ for Claude compatibility
```

### Usage in Cursor

1. Open Cursor and your project
2. Open Agent chat (Cmd+L or Ctrl+L)
3. Type `/` and search for a skill (e.g., "start-here", "brand-voice")
4. Or describe your task — the agent will auto-apply relevant skills

### Viewing Skills

- **Cursor Settings** → Rules → Agent Decides
- Skills appear when the agent determines they're relevant

---

## 3. Claude Desktop (Web App)

**Claude Desktop** is the chat-focused app at claude.ai. It uses a different skill system: **upload via Settings**.

### Installation

1. **Package the skills** (if you don't have a zip):

   ```bash
   cd /path/to/skills-v2
   ./_system/scripts/package.sh
   # Creates vibe-skills-v2-YYYYMMDD.zip
   ```

2. **Upload in Claude Desktop:**
   - Go to **Settings** → **Capabilities**
   - Enable **Code execution and file creation**
   - In **Skills**, click **Upload skill**
   - Select the ZIP file (or a single-skill ZIP — see note below)

### Important Notes for Claude Desktop

- Claude Desktop's "Upload skill" may expect a **single skill per ZIP** (one folder with `SKILL.md`). The Vibe Marketing suite has 11 interdependent skills plus `_system`.
- **Recommended:** Use **Claude Code** or **Cursor** for the full suite. Claude Desktop is best for individual, self-contained skills.
- If you need the full suite in Claude Desktop, you may need to upload the entire `skills-v2` folder as one "skill bundle" — check Claude Help Center for current upload format.

---

## 4. Platform Comparison

| Feature | Claude Code | Cursor | Claude Desktop |
|---------|-------------|--------|----------------|
| Full 11-skill suite | ✅ | ✅ | ⚠️ Upload format may vary |
| Brand memory (`./brand/`) | ✅ | ✅ | Depends on file access |
| Slash commands | ✅ | ✅ (via `/`) | Via Skills UI |
| Auto-invocation | ✅ | ✅ | ✅ |
| Terminal output format | ✅ Optimized | Rendered in chat | Rendered in chat |
| MCP (Exa, etc.) | ✅ | Via Cursor MCPs | Via app integrations |

---

## 5. Exa MCP (Optional Enhancement)

**Exa** is an AI-powered search MCP that improves skills that need live web data:

- **`/seo-content`** — SERP analysis, PAA questions, Featured Snippets
- **`/positioning-angles`** — Competitive messaging research
- **`/lead-magnet`** — Competitor lead magnet research

### Add Exa to Claude Code

```bash
claude mcp add --transport http exa https://mcp.exa.ai/mcp
```

### Add Exa to Cursor

1. Open Cursor Settings → MCP
2. Add a new MCP server with URL: `https://mcp.exa.ai/mcp` (if Cursor supports HTTP MCP)
3. Or install the Exa MCP plugin from the Cursor marketplace if available

---

## 6. Troubleshooting

### Skills not appearing in Claude Code

- Ensure `~/.claude/skills/` exists and contains skill folders with `SKILL.md`
- Run `./_system/scripts/doctor.sh` to verify installation
- Restart Claude Code

### Skills not appearing in Cursor

- Cursor reads `~/.claude/skills/` and `~/.cursor/skills/`
- Ensure skills are in one of those locations
- Restart Cursor or reload the window

### Brand memory not persisting

- Skills expect a `./brand/` directory at your **project root**
- Run Claude Code or Cursor from the directory that contains (or will contain) `./brand/`
- The first `/start-here` run creates `./brand/`

### Exa / web search not working

- Verify MCP is configured: `claude mcp list` (Claude Code)
- Some skills show "Data quality: ESTIMATED" when web tools are unavailable — they still work with fallback logic

---

## 7. Summary: One Command to Rule Them All

For **Claude Code + Cursor** (shared install):

```bash
cd /Users/patrickfrank/Desktop/skills-v2
./_system/scripts/install.sh
```

Then use Claude Code or Cursor — both will see the skills. Run from a project directory where you want `./brand/` and `./campaigns/` to live.
