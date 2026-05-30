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
const readline = require("readline");
const { execFileSync } = require("child_process");

const HERE = __dirname;
const ARGV = process.argv.slice(2);

function run(script, args = []) {
  try { execFileSync("node", [path.join(HERE, script), ...args], { stdio: "inherit" }); }
  catch { console.error(`  ${script} exited with error.`); }
}

const TOOL_NAMES = { "1": "claude", "2": "codex", "3": "antigravity" };

function parseToolList() {
  const i = ARGV.indexOf("--tools");
  if (i < 0) return "all";
  const v = ARGV[i + 1];
  if (!v || v.startsWith("--")) { console.warn('  --tools needs a value (e.g. --tools claude,codex); defaulting to "all".'); return "all"; }
  return v;
}
function numbersToTools(answer) {
  const a = answer.trim();
  if (!a || a.toLowerCase() === "all" || a === "4") return "all";
  const keys = a.split(",").map(s => TOOL_NAMES[s.trim()] || s.trim()).filter(Boolean);
  return keys.length ? [...new Set(keys)].join(",") : "all";
}
function selectedKeys(list) {
  return (list === "all" ? ["claude", "codex", "antigravity"] : list.split(",")).map(s => s.trim());
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
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nai-coding-stack\n  1) Install AI coding tools\n  2) Scaffold this project (project-init)\n  3) Both");
  rl.question("Option [1-3]: ", (a) => {
    const choice = { "1": "tools", "2": "init", "3": "all" }[a.trim()] || "tools";
    if (choice === "init") { rl.close(); dispatch("init"); return; }
    console.log("\nWhich tools? (comma list, or 'all')\n  1) Claude Code   2) Codex   3) Antigravity\n  e.g. \"1,3\" or \"all\"");
    rl.question("Tools: ", (t) => { rl.close(); dispatch(choice, numbersToTools(t)); });
  });
}
