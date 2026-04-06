# ArcaneClaude Installer

> **Drop this file into a Claude Code prompt to auto-install, or read it for manual setup.**

This installs ArcaneClaude — 180+ MCP tools for Docker management via [Arcane](https://github.com/getarcaneapp/arcane), with an optional companion skill for workflow guidance.

---

## What Gets Installed

| Component | What it does | Install method |
|-----------|-------------|----------------|
| **MCP Server** | 180 Docker management tools Claude can call | `claude mcp add` |
| **Skill** | Teaches Claude deployment workflows, safety guardrails, troubleshooting patterns | Copy to `~/.claude/skills/` |
| **Plugin** | Bundles MCP + Skill as one unit with auto-config | `claude plugin install` (when available) |

---

## Prerequisites

Before installing, you need:

1. **An Arcane instance** running and accessible (see [getarcane.app](https://getarcane.app) to set one up)
2. **An API key** from your Arcane instance (Settings > API Keys)
3. **Node.js 18+** installed
4. **Claude Code** CLI installed

---

## Automated Installation (Claude Code Prompt)

If you're reading this inside Claude Code, I will now guide you through installation. If you're reading this as documentation, skip to the [Manual Installation](#manual-installation) section below.

### Step 1: Choose what to install

Use the AskUserQuestion tool to ask the user:

**Question:** "What would you like to install?"
**Options:**
- **Everything (Recommended)** — MCP server + companion skill. Full Docker management with workflow guidance.
- **MCP Server only** — Just the 180 tools, no skill. You'll call tools directly.
- **Skill only** — Just the workflow guidance skill. Requires MCP server already installed.

### Step 2: Get connection details

Use AskUserQuestion to ask:

**Question:** "What is your Arcane instance URL?"
- Example: `https://arcane.example.com:3552`
- The user must provide this — there is no default.

Then ask:

**Question:** "What is your Arcane API key?"
- This is found in Arcane under Settings > API Keys
- The user must provide this.

### Step 3: Install MCP Server

If the user chose "Everything" or "MCP Server only", run these commands:

```bash
# Install the MCP server globally
npm install -g @randomsynergy/arcane-mcp-server

# Add to Claude Code with the user's credentials
claude mcp add --transport stdio \
  --env ARCANE_API_KEY={user_api_key} \
  --env ARCANE_BASE_URL={user_base_url} \
  arcane -- npx @randomsynergy/arcane-mcp-server
```

Verify it was added:
```bash
claude mcp list
```

### Step 4: Install Companion Skill

If the user chose "Everything" or "Skill only", run these commands:

```bash
# Clone the repo to get the skill file
git clone --depth 1 https://github.com/RandomSynergy17/ArcaneClaude.git /tmp/arcane-claude-install

# Create skills directory if it doesn't exist
mkdir -p ~/.claude/skills/arcane-docker

# Copy the skill
cp /tmp/arcane-claude-install/skills/arcane-docker/SKILL.md ~/.claude/skills/arcane-docker/SKILL.md

# Clean up
rm -rf /tmp/arcane-claude-install
```

Verify the skill is in place:
```bash
ls -la ~/.claude/skills/arcane-docker/SKILL.md
```

### Step 5: Verify Installation

Run a quick test to confirm everything works:

```bash
# Test the MCP server starts correctly
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | ARCANE_BASE_URL={user_base_url} ARCANE_API_KEY={user_api_key} npx @randomsynergy/arcane-mcp-server 2>/dev/null | head -1
```

If you see a JSON response with `"result"`, the server is working.

### Step 6: Report Results

Tell the user what was installed and provide a quick-start example:

> **Installation complete!** Here's what's ready:
>
> - **MCP Server**: 180 tools connected to your Arcane instance at `{url}`
> - **Skill**: Workflow guidance active in `~/.claude/skills/arcane-docker/`
>
> **Try it out** — ask Claude:
> - "What's running in my Docker environment?"
> - "Deploy this compose file"
> - "Run a security audit"
> - "What needs attention?"

---

## Manual Installation

### Option A: MCP Server + Skill (Recommended)

**1. Install the MCP server:**

```bash
npm install -g @randomsynergy/arcane-mcp-server
```

**2. Add to Claude Code:**

```bash
claude mcp add --transport stdio \
  --env ARCANE_API_KEY=your-api-key \
  --env ARCANE_BASE_URL=https://arcane.example.com:3552 \
  arcane -- npx @randomsynergy/arcane-mcp-server
```

**3. Install the companion skill:**

```bash
git clone --depth 1 https://github.com/RandomSynergy17/ArcaneClaude.git /tmp/arcane-install
mkdir -p ~/.claude/skills/arcane-docker
cp /tmp/arcane-install/skills/arcane-docker/SKILL.md ~/.claude/skills/arcane-docker/SKILL.md
rm -rf /tmp/arcane-install
```

### Option B: MCP Server Only

```bash
npm install -g @randomsynergy/arcane-mcp-server

claude mcp add --transport stdio \
  --env ARCANE_API_KEY=your-api-key \
  --env ARCANE_BASE_URL=https://arcane.example.com:3552 \
  arcane -- npx @randomsynergy/arcane-mcp-server
```

### Option C: Claude Desktop

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arcane": {
      "command": "npx",
      "args": ["@randomsynergy/arcane-mcp-server"],
      "env": {
        "ARCANE_BASE_URL": "https://arcane.example.com:3552",
        "ARCANE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Option D: Plugin (when marketplace is available)

```
/plugin marketplace add RandomSynergy17/ArcaneClaude
/plugin install arcane-docker@arcane-tools
```

---

## Configuration Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ARCANE_BASE_URL` | Yes | Your Arcane instance URL |
| `ARCANE_API_KEY` | Yes | API key (recommended) |
| `ARCANE_USERNAME` | Alt | Username for JWT auth |
| `ARCANE_PASSWORD` | Alt | Password for JWT auth |
| `ARCANE_TIMEOUT_MS` | No | Request timeout (default: 30000) |
| `ARCANE_SKIP_SSL_VERIFY` | No | Skip SSL verification (default: false) |
| `ARCANE_DEFAULT_ENVIRONMENT_ID` | No | Default environment to use |
| `LOG_LEVEL` | No | debug, info, warn, error (default: info) |

---

## What You Get

### 180 MCP Tools across 25 modules:
- Containers, Images, Volumes, Networks (CRUD + lifecycle)
- Docker Compose Projects (deploy, redeploy, destroy)
- Docker Swarm (cluster management, services, scaling)
- Vulnerability Scanning (image scans, severity filtering)
- Image Builds (Dockerfile, Git context, workspace)
- GitOps (git-based deployments with auto-sync)
- Auto-Updater (container image updates)
- Dashboard (consolidated status in one call)
- Webhooks, Jobs, Notifications, Events
- Registries (Docker Hub, GHCR, ECR, GCR, ACR)
- Users, Settings, Authentication (JWT + API key + OIDC)

### 4 MCP Prompts (workflow templates):
- `/deploy-stack` — Guided Docker Compose deployment
- `/troubleshoot-container` — Systematic diagnostics
- `/security-audit` — Vulnerability scanning workflow
- `/cleanup-environment` — Safe resource cleanup

### 2 MCP Resources (context data):
- `arcane://environments` — Available environments
- `arcane://version` — Server configuration

### Companion Skill:
- Intent mapping (natural language to tool sequences)
- Safety guardrails (pre-flight checks before destructive ops)
- Workflow chains (deployment, rollback, troubleshooting)
- Gotchas section (common pitfalls and how to avoid them)

---

## Troubleshooting

**"Cannot connect to Arcane"**
- Verify your `ARCANE_BASE_URL` is correct and the instance is running
- Check if SSL is required (`https://` vs `http://`)
- Try `ARCANE_SKIP_SSL_VERIFY=true` for self-signed certs

**"Authentication failed"**
- Verify your API key is correct and active
- API keys can be regenerated in Arcane > Settings > API Keys

**"MCP server not found"**
- Run `npm list -g @randomsynergy/arcane-mcp-server` to verify installation
- Try `npx @randomsynergy/arcane-mcp-server --version` to test

**"Skill not loading"**
- Verify the file exists: `ls ~/.claude/skills/arcane-docker/SKILL.md`
- Restart Claude Code after installing skills

---

## Links

- [ArcaneClaude GitHub](https://github.com/RandomSynergy17/ArcaneClaude)
- [Arcane Docker Management](https://github.com/getarcaneapp/arcane)
- [Arcane Setup Docs](https://getarcane.app/docs)
- [MCP Protocol](https://modelcontextprotocol.io)
