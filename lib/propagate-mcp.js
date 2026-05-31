#!/usr/bin/env node
/**
 * propagate-mcp — write shared MCP servers into each AI tool's native MCP config,
 * referencing API keys via the tool's env-interpolation syntax so NO secret is
 * ever written to disk. Idempotent (merges; preserves existing servers).
 *
 * Usage:
 *   node lib/propagate-mcp.js                 # all known tools
 *   node lib/propagate-mcp.js cursor,opencode # a subset
 *   node lib/propagate-mcp.js --dry-run       # show plan, write nothing
 *
 * Keys live ONLY in the environment (e.g. CONTEXT7_API_KEY). The configs written
 * here contain the interpolation token, never the value. The user must export the
 * env var for the tool to resolve it at runtime.
 */
const os = require("os");
const path = require("path");
const fs = require("fs");

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes("--dry-run");
const HOME = os.homedir();
const log = (m) => console.log(m);

// Shared servers to propagate. Add an entry here to roll it out to every tool.
const SERVERS = {
  context7: { url: "https://mcp.context7.com/mcp", headerName: "CONTEXT7_API_KEY" },
};

// Per-tool MCP descriptor: config file, top-level key, env-interpolation token, and
// the server entry shape (each tool spells remote-HTTP servers differently).
const TARGETS = {
  opencode: {
    file: path.join(HOME, ".config", "opencode", "opencode.json"),
    key: "mcp",
    envTok: (name) => `{env:${name}}`,                 // opencode uses {env:VAR}
    entry: (s, tok) => ({ type: "remote", url: s.url, enabled: true, headers: { [s.headerName]: tok } }),
  },
  cursor: {
    file: path.join(HOME, ".cursor", "mcp.json"),
    key: "mcpServers",
    envTok: (name) => `\${env:${name}}`,               // cursor uses ${env:VAR}
    entry: (s, tok) => ({ url: s.url, headers: { [s.headerName]: tok } }),
  },
  windsurf: {
    file: path.join(HOME, ".codeium", "windsurf", "mcp_config.json"),
    key: "mcpServers",
    envTok: (name) => `\${env:${name}}`,               // windsurf uses ${env:VAR}, remote field is serverUrl
    entry: (s, tok) => ({ serverUrl: s.url, headers: { [s.headerName]: tok } }),
  },
};

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; }
}

function propagate(tool) {
  const t = TARGETS[tool];
  if (!t) { log(`  ! tool desconocido para MCP: ${tool}`); return; }
  const cfg = readJson(t.file);
  if (!cfg[t.key] || typeof cfg[t.key] !== "object") cfg[t.key] = {};
  const added = [];
  for (const [name, s] of Object.entries(SERVERS)) {
    cfg[t.key][name] = t.entry(s, t.envTok(s.headerName));
    added.push(name);
  }
  if (DRY) { log(`  would write ${t.file} (${t.key}: ${added.join(", ")})`); return; }
  fs.mkdirSync(path.dirname(t.file), { recursive: true });
  fs.writeFileSync(t.file, JSON.stringify(cfg, null, 2) + "\n");
  log(`  ✓ ${tool}: ${added.join(", ")} -> ${t.file}`);
}

if (require.main === module) {
  const positional = ARGV.filter((a) => !a.startsWith("--"));
  let tools = positional.flatMap((a) => a.split(",")).map((s) => s.trim()).filter(Boolean);
  if (!tools.length || tools.includes("all")) tools = Object.keys(TARGETS);
  tools = [...new Set(tools)];
  log(`propagate-mcp — ${DRY ? "DRY RUN" : "writing"} (${Object.keys(SERVERS).join(", ")})`);
  log("Keys via env interpolation — set the env vars (e.g. CONTEXT7_API_KEY); no secret is written.");
  for (const t of tools) propagate(t);
}

module.exports = { SERVERS, TARGETS, propagate };
