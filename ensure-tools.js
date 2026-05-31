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
 *   node ensure-tools.js opencode      # CLI only
 *   node ensure-tools.js cursor        # GUI only
 *   node ensure-tools.js windsurf      # GUI only
 *   node ensure-tools.js all
 *   node ensure-tools.js claude,codex   # a subset (comma list)
 *   node ensure-tools.js <tool> --check   # detect only, install nothing
 *   node ensure-tools.js <tool> --no-deps # skip package-manager bootstrap (Node/brew)
 *
 * Prereqs: bootstraps the package managers the selected tools need (Node.js/npm
 * on all OSes; notes Homebrew on macOS, winget on Windows). Disable with --no-deps.
 */
const os = require("os");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const ARGV = process.argv.slice(2);
const CHECK = ARGV.includes("--check");
const NO_DEPS = ARGV.includes("--no-deps");
const log = (m) => console.log(m);

function run(cmd, args) {
  try { execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }); return true; }
  catch { return false; }
}
function runLoud(cmd, args) {
  try { execFileSync(cmd, args, { stdio: "inherit" }); return true; } catch { return false; }
}
function runArgv(argv) { return runLoud(argv[0], argv.slice(1)); }
// Prefix sudo on Linux when not already root (and sudo exists).
function withSudo(argv) {
  const isRoot = process.getuid && process.getuid() === 0;
  return (!isRoot && hasCmd("sudo")) ? ["sudo", ...argv] : argv;
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
  // opencode (SST) — CLI only. npm pkg `opencode-ai`, binary `opencode`. No verified winget.
  opencode: {
    cli: {
      detect: () => hasCmd("opencode"),
      win32: ["npm", "install", "-g", "opencode-ai"],
      darwin: ["npm", "install", "-g", "opencode-ai"],
      linux: ["npm", "install", "-g", "opencode-ai"],
    },
  },
  // Cursor (Anysphere) — GUI IDE. `which cursor` is unreliable (opt-in shell cmd) → detect app bundle / winget.
  cursor: {
    gui: {
      detect: () => process.platform === "win32" ? wingetHas("Anysphere.Cursor") : process.platform === "darwin" ? macApp("Cursor.app") : false,
      win32: ["winget", "install", "--id", "Anysphere.Cursor", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"],
      darwin: ["brew", "install", "--cask", "cursor"],
      linux: null,
    },
  },
  // Windsurf (Codeium) — GUI IDE. Detect app bundle / winget (CLI is opt-in, like VS Code's `code`).
  windsurf: {
    gui: {
      detect: () => process.platform === "win32" ? wingetHas("Codeium.Windsurf") : process.platform === "darwin" ? macApp("Windsurf.app") : false,
      win32: ["winget", "install", "--id", "Codeium.Windsurf", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"],
      darwin: ["brew", "install", "--cask", "windsurf"],
      linux: null,
    },
  },
};

// Where to get each tool when there's no automatic installer on this OS.
const MANUAL_URLS = {
  claude: "https://claude.com/claude-code",
  codex: "https://openai.com/codex",
  antigravity: "https://antigravity.google",
  opencode: "https://opencode.ai",
  cursor: "https://cursor.com",
  windsurf: "https://windsurf.com",
};

// --- Prerequisite bootstrap: install the package managers the tools rely on ---
function installNodeLinux() {
  if (hasCmd("apt-get")) { runArgv(withSudo(["apt-get", "update"])); return runArgv(withSudo(["apt-get", "install", "-y", "nodejs", "npm"])); }
  if (hasCmd("dnf"))    return runArgv(withSudo(["dnf", "install", "-y", "nodejs", "npm"]));
  if (hasCmd("pacman")) return runArgv(withSudo(["pacman", "-Sy", "--noconfirm", "nodejs", "npm"]));
  if (hasCmd("zypper")) return runArgv(withSudo(["zypper", "install", "-y", "nodejs", "npm"]));
  if (hasCmd("apk"))    return runArgv(withSudo(["apk", "add", "nodejs", "npm"]));
  return false;
}
function ensureNode() {
  if (hasCmd("npm")) return true;
  log("  → Node.js/npm missing; installing …");
  if (process.platform === "linux") {
    if (!installNodeLinux()) log("  ! couldn't auto-install Node.js — install it from https://nodejs.org and re-run");
  } else if (process.platform === "darwin") {
    if (ensureBrew()) runArgv(["brew", "install", "node"]);
  } else if (process.platform === "win32") {
    runArgv(["winget", "install", "--id", "OpenJS.NodeJS.LTS", "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"]);
  }
  return hasCmd("npm");
}
function ensureBrew() {
  if (hasCmd("brew")) return true;
  // brew's installer is interactive (asks for sudo) — instruct rather than pipe curl|bash blindly.
  log("  ! Homebrew required but missing. Install it, then re-run setup:");
  log('    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
  return false;
}
// Ensure the package managers needed by the selected tools exist on this OS.
function ensurePrereqs(tools) {
  if (NO_DEPS || CHECK) return;
  const need = new Set();
  for (const t of tools) for (const kind of ["gui", "cli"]) {
    const argv = REG[t] && REG[t][kind] && REG[t][kind][process.platform];
    if (argv) need.add(argv[0]);
  }
  if (!need.size) return;
  log("== prerequisites ==");
  if (need.has("npm") && !hasCmd("npm")) ensureNode();
  if (need.has("brew") && !hasCmd("brew")) ensureBrew();
  if (need.has("winget") && !hasCmd("winget")) log("  ! winget missing — install 'App Installer' from the Microsoft Store, then re-run");
  log("");
}

function ensureComponent(tool, kind) {
  const c = REG[tool][kind];
  const present = c.detect();
  const tag = `${tool} ${kind.toUpperCase()}`;
  if (present) { log(`  ✓ ${tag} already installed`); return; }
  if (CHECK) { log(`  ✗ ${tag} MISSING`); return; }
  const argv = c[process.platform];
  const url = MANUAL_URLS[tool] ? ` — get it at ${MANUAL_URLS[tool]}` : "";
  if (!argv) { log(`  ! ${tag} missing — no automatic installer on ${process.platform}; install manually${url}`); return; }
  const pm = argv[0];
  if (!hasCmd(pm)) { log(`  ! ${tag}: '${pm}' not available — install ${pm} first (run without --no-deps to bootstrap it) or install manually${url}`); return; }
  log(`  → installing ${tag}: ${argv.join(" ")}`);
  const ok = runLoud(argv[0], argv.slice(1));
  log(ok ? `  ✓ ${tag} installed` : `  ! ${tag} failed — install manually${url}`);
}

function ensureTool(tool) {
  if (!REG[tool]) { log(`unknown tool: ${tool} (${Object.keys(REG).join("|")}|all)`); return; }
  log(`== ${tool} ==`);
  // Only process components this tool actually defines (some are CLI-only or GUI-only).
  for (const kind of ["gui", "cli"]) if (REG[tool][kind]) ensureComponent(tool, kind);
}

const positional = ARGV.filter(a => !a.startsWith("--"));
let tools = positional.flatMap(a => a.split(",")).map(s => s.trim()).filter(Boolean);
if (!tools.length || tools.includes("all")) tools = Object.keys(REG);  // "all" or empty -> full set
tools = [...new Set(tools)];
log(`ensure-tools (${process.platform}) — ${CHECK ? "CHECK only" : "install missing"}`);
ensurePrereqs(tools);
for (const t of tools) ensureTool(t);
