#!/usr/bin/env node
/**
 * ai-coding-stack — setup menu.
 * Installs the AI coding tools (GUI+CLI) and/or scaffolds the current project.
 * No personal config; you authenticate each tool with your own account.
 *
 * Usage:
 *   node setup.js                 # interactive menu
 *   node setup.js --tools         # install/verify Claude Code, Codex, Antigravity
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

function authNotes() {
  console.log(`
Next — authenticate each tool with YOUR account:
  • Claude Code : run \`claude\` → \`/login\`
  • Codex       : run \`codex login\`
  • Antigravity : open the app → sign in with Google
`);
}

function doTools() { run("ensure-tools.js", ["all"]); }

function dispatch(choice) {
  if (choice === "tools") { doTools(); authNotes(); }
  else if (choice === "init") { run("project-init.js", ["."].concat(passInit())); }
  else if (choice === "all") { doTools(); run("project-init.js", ["."].concat(passInit())); authNotes(); }
  else { console.error("unknown option"); process.exit(1); }
}
function passInit() {
  const out = [];
  const i = ARGV.indexOf("--about");
  if (i >= 0) out.push("--about", ARGV[i + 1] || "");
  if (ARGV.includes("--force")) out.push("--force");
  return out;
}

if (ARGV.includes("--tools")) dispatch("tools");
else if (ARGV.includes("--init")) dispatch("init");
else if (ARGV.includes("--all")) dispatch("all");
else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nai-coding-stack\n  1) Install AI coding tools (Claude Code · Codex · Antigravity)\n  2) Scaffold this project (project-init)\n  3) Both");
  rl.question("Option [1-3]: ", (a) => {
    rl.close();
    dispatch({ "1": "tools", "2": "init", "3": "all" }[a.trim()] || "tools");
  });
}
