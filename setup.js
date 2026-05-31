#!/usr/bin/env node
/**
 * ai-coding-stack — setup menu.
 * Installs the AI coding tools (GUI+CLI) and/or scaffolds the current project.
 * No personal config; you authenticate each tool with your own account.
 *
 * Usage:
 *   node setup.js                 # interactive menu
 *   node setup.js --tools claude,codex   # install/verify a subset (or 'all')
 *   node setup.js --init          # scaffold the current directory (project-init)
 *   node setup.js --all           # tools + scaffold
 *   (pass --about "..." to seed the project goal)
 */
const path = require("path");
const { execFileSync } = require("child_process");

const HERE = __dirname;
const ARGV = process.argv.slice(2);

function run(script, args = []) {
  try { execFileSync("node", [path.join(HERE, script), ...args], { stdio: "inherit" }); }
  catch { console.error(`  ${script} exited with error.`); }
}

const ALL_TOOLS = ["claude", "codex", "antigravity", "opencode", "cursor", "windsurf"];

function parseToolList() {
  const i = ARGV.indexOf("--tools");
  if (i < 0) return "all";
  const v = ARGV[i + 1];
  if (!v || v.startsWith("--")) { console.warn('  --tools needs a value (e.g. --tools claude,codex); defaulting to "all".'); return "all"; }
  return v;
}
function selectedKeys(list) {
  return (list === "all" ? ALL_TOOLS : list.split(",")).map(s => s.trim());
}

function doTools(list) {
  const args = [list];
  if (ARGV.includes("--check-tools")) args.push("--check");
  run("ensure-tools.js", args);
}
function authNotes(list) {
  const keys = selectedKeys(list);
  const lines = {
    claude: "  • Claude Code : run `claude` → `/login`",
    codex: "  • Codex       : run `codex login`",
    antigravity: "  • Antigravity : open the app → sign in with Google",
    opencode: "  • opencode    : run `opencode auth login`",
    cursor: "  • Cursor      : open the app → sign in",
    windsurf: "  • Windsurf    : open the app → sign in",
  };
  console.log("\nNext — authenticate each tool with YOUR account:");
  for (const k of keys) if (lines[k]) console.log(lines[k]);
  console.log("");
}

function dispatch(choice, toolList) {
  const list = toolList || "all";
  if (choice === "tools") { doTools(list); authNotes(list); }
  else if (choice === "init") { run("project-init.js", ["."].concat(passInit())); }
  else if (choice === "all") { doTools(list); run("project-init.js", ["."].concat(passInit())); authNotes(list); }
  else { console.error("unknown option"); process.exit(1); }
}
function passInit() {
  const out = [];
  const i = ARGV.indexOf("--about");
  if (i >= 0) out.push("--about", ARGV[i + 1] || "");
  if (ARGV.includes("--force")) out.push("--force");
  if (ARGV.includes("--with-experts")) out.push("--with-experts");
  return out;
}

if (ARGV.includes("--tools")) dispatch("tools", parseToolList());
else if (ARGV.includes("--init")) dispatch("init");
else if (ARGV.includes("--all")) dispatch("all", parseToolList());
else {
  const { selectOne, selectMany } = require(path.join(HERE, "lib", "tui.js"));
  (async () => {
    const choice = await selectOne("ai-coding-stack — what do you want to do?", [
      { label: "Install AI coding tools", value: "tools", hint: "detect & install agents (auto-installs Node.js/Homebrew if missing)" },
      { label: "Scaffold this project", value: "init", hint: "write AGENTS.md/CLAUDE.md/GEMINI.md/STATE.md in this folder" },
      { label: "Both", value: "all", hint: "install tools, then scaffold this folder" },
    ]);
    if (choice === "init") { dispatch("init"); return; }
    const picked = await selectMany("Which tools to install?", [
      { label: "Claude Code", value: "claude", hint: "CLI + app" },
      { label: "Codex", value: "codex", hint: "CLI" },
      { label: "Antigravity", value: "antigravity", hint: "IDE" },
      { label: "opencode", value: "opencode", hint: "CLI" },
      { label: "Cursor", value: "cursor", hint: "IDE" },
      { label: "Windsurf", value: "windsurf", hint: "IDE" },
    ]);
    const list = picked.length === ALL_TOOLS.length ? "all" : (picked.join(",") || "all");
    dispatch(choice, list);
  })();
}
