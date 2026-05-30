#!/usr/bin/env node
/**
 * ensure-tools — detect and (if missing) install the GUI + CLI for each AI tool,
 * then the caller applies config. Cross-platform; Windows fully automated via
 * verified winget IDs, macOS via brew/npm, Linux via npm (GUIs = manual note).
 *
 * Usage:
 *   node ensure-tools.js claude        # ensure Claude GUI + CLI
 *   node ensure-tools.js codex
 *   node ensure-tools.js antigravity
 *   node ensure-tools.js all
 *   node ensure-tools.js <tool> --check   # detect only, install nothing
 */
const os = require("os");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const ARGV = process.argv.slice(2);
const CHECK = ARGV.includes("--check");
const log = (m) => console.log(m);

function run(cmd, args) {
  try { execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }); return true; }
  catch { return false; }
}
function runLoud(cmd, args) {
  try { execFileSync(cmd, args, { stdio: "inherit" }); return true; } catch { return false; }
}
function hasCmd(bin) {
  return run(process.platform === "win32" ? "where" : "which", [bin]);
}
function wingetHas(id) { return run("winget", ["list", "--id", id, "-e"]); }
function macApp(name) { return fs.existsSync(path.join("/Applications", name)); }

// Registry: each tool has gui + cli with per-OS detect + install.
// install: array argv for the platform, or null = manual (print note).
const REG = {
  claude: {
    cli: {
      detect: () => hasCmd("claude"),
      win32: ["winget", "install", "--id", "Anthropic.ClaudeCode", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"],
      darwin: ["npm", "install", "-g", "@anthropic-ai/claude-code"],
      linux: ["npm", "install", "-g", "@anthropic-ai/claude-code"],
    },
    gui: {
      detect: () => process.platform === "win32" ? wingetHas("Anthropic.Claude") : process.platform === "darwin" ? macApp("Claude.app") : false,
      win32: ["winget", "install", "--id", "Anthropic.Claude", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"],
      darwin: ["brew", "install", "--cask", "claude"],
      linux: null,
    },
  },
  codex: {
    cli: {
      detect: () => hasCmd("codex"),
      win32: ["winget", "install", "--id", "OpenAI.Codex", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"],
      darwin: ["npm", "install", "-g", "@openai/codex"],
      linux: ["npm", "install", "-g", "@openai/codex"],
    },
    gui: {
      // OpenAI Codex desktop is macOS-first (Codex.app); no verified winget/Linux GUI.
      detect: () => process.platform === "darwin" ? macApp("Codex.app") : process.platform === "win32" ? wingetHas("OpenAI.Codex") : false,
      win32: null,        // no verified standalone Codex GUI on winget — CLI covers it
      darwin: null,     // install Codex.app from openai.com / App Store manually
      linux: null,
    },
  },
  antigravity: {
    cli: {
      detect: () => hasCmd("agy") || hasCmd("antigravity"),
      win32: ["winget", "install", "--id", "Google.AntigravityCLI", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"],
      darwin: ["brew", "install", "--cask", "antigravity-cli"],
      linux: null,
    },
    gui: {
      detect: () => process.platform === "win32" ? wingetHas("Google.Antigravity") : process.platform === "darwin" ? (macApp("Antigravity.app") || macApp("Antigravity IDE.app")) : false,
      win32: ["winget", "install", "--id", "Google.Antigravity", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"],
      darwin: ["brew", "install", "--cask", "antigravity"],
      linux: null,
    },
  },
};

function ensureComponent(tool, kind) {
  const c = REG[tool][kind];
  const present = c.detect();
  const tag = `${tool} ${kind.toUpperCase()}`;
  if (present) { log(`  ✓ ${tag} ya instalado`); return; }
  if (CHECK) { log(`  ✗ ${tag} FALTA`); return; }
  const argv = c[process.platform];
  if (!argv) { log(`  ! ${tag} falta — instálalo manual (sin instalador automático en ${process.platform})`); return; }
  // winget GUI installs / npm need the package manager present
  const pm = argv[0];
  if (!hasCmd(pm)) { log(`  ! ${tag}: '${pm}' no disponible — instala ${pm} o el tool manualmente`); return; }
  log(`  → instalando ${tag}: ${argv.join(" ")}`);
  const ok = runLoud(argv[0], argv.slice(1));
  log(ok ? `  ✓ ${tag} instalado` : `  ! ${tag} falló — instálalo manual`);
}

function ensureTool(tool) {
  if (!REG[tool]) { log(`tool desconocido: ${tool} (claude|codex|antigravity|all)`); return; }
  log(`== ${tool} ==`);
  ensureComponent(tool, "gui");
  ensureComponent(tool, "cli");
}

const positional = ARGV.filter(a => !a.startsWith("--"));
let tools = positional.flatMap(a => a.split(",")).map(s => s.trim()).filter(Boolean);
if (!tools.length || tools.includes("all")) tools = Object.keys(REG);
tools = [...new Set(tools)];
log(`ensure-tools (${process.platform}) — ${CHECK ? "CHECK only" : "install missing"}`);
for (const t of tools) ensureTool(t);
