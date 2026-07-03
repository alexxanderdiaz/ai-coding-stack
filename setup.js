#!/usr/bin/env node
/**
 * ai-coding-stack — setup.
 * No-flags runs a first-run WIZARD: detect installed tools → install the missing
 * ones AND apply the ready-to-use config (Context7 MCP) to every selected tool
 * (new + already-installed), without clobbering prior config (merge or fresh+backup).
 * No personal config; you authenticate each tool with your own account.
 * Per-project scaffolding (AGENTS.md…) is a SEPARATE later step: `node setup.js --init`.
 *
 * Usage:
 *   node setup.js                 # interactive wizard (detect → install + config)
 *   node setup.js --tools all     # non-interactive: set up all tools (or a subset list)
 *   node setup.js --tools claude,opencode --fresh   # fresh+backup existing MCP config
 *   node setup.js --init          # scaffold the current directory (project-init)
 *   node setup.js --all           # tools setup + scaffold
 *   (pass --about "..." to seed the project goal; --no-deps to skip Node/brew bootstrap)
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

const HERE = __dirname;
const ARGV = process.argv.slice(2);

// Tools that read GLOBAL skills/commands → where to install the project-init skill
// so it's available inside the tool on load. (Cursor/Windsurf use per-project rules, no global skill.)
const GLOBAL_SKILL_DIR = {
  claude: [".claude", "skills"],
  opencode: [".config", "opencode", "skills"],
  codex: [".codex", "skills"],
  antigravity: [".gemini", "skills"],
  zcode: [".zcode", "skills"],
  kimi: [".kimi", "daimon", "skills"],
};

const TOOL_META = {
  claude: { label: "Claude Code", hint: "CLI + app" },
  codex: { label: "Codex", hint: "CLI" },
  antigravity: { label: "Antigravity", hint: "IDE" },
  opencode: { label: "opencode", hint: "CLI" },
  cursor: { label: "Cursor", hint: "IDE" },
  windsurf: { label: "Windsurf", hint: "IDE" },
  zcode: { label: "ZAI Code", hint: "IDE (ZCode)" },
  kimi: { label: "Kimi", hint: "app (Moonshot)" },
};
const ALL_TOOLS = Object.keys(TOOL_META);

function run(script, args = []) {
  try { execFileSync("node", [path.join(HERE, script), ...args], { stdio: "inherit" }); }
  catch { console.error(`  ${script} exited with error.`); }
}
function parseToolList() {
  const i = ARGV.indexOf("--tools");
  if (i < 0 || !ARGV[i + 1] || ARGV[i + 1].startsWith("--")) return "all";
  return ARGV[i + 1];
}
function selectedKeys(list) {
  return (list === "all" ? ALL_TOOLS : list.split(",")).map(s => s.trim()).filter(k => TOOL_META[k]);
}
function passInit() {
  const out = [];
  const i = ARGV.indexOf("--about");
  if (i >= 0) out.push("--about", ARGV[i + 1] || "");
  if (ARGV.includes("--force")) out.push("--force");
  if (ARGV.includes("--with-experts")) out.push("--with-experts");
  return out;
}

// Install the bundled project-init skill into each compatible tool's GLOBAL skills dir,
// so "project-init" is available inside the tool on load. SKILL.md paths are pinned to
// this repo clone so the in-tool command runs the real scripts (scaffold + expert discovery).
function installProjectInitSkill(keys) {
  const src = path.join(HERE, "skills", "project-init");
  if (!fs.existsSync(src)) return;
  const skipped = [];
  for (const t of keys) {
    const seg = GLOBAL_SKILL_DIR[t];
    if (!seg) { skipped.push(t); continue; }
    const dest = path.join(os.homedir(), ...seg, "project-init");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
    const skillMd = path.join(dest, "SKILL.md");
    if (fs.existsSync(skillMd)) {
      let txt = fs.readFileSync(skillMd, "utf8");
      txt = txt.split("<this-skill-dir>").join(dest).split("<repo>").join(HERE);
      fs.writeFileSync(skillMd, txt);
    }
    console.log(`  ✓ project-init available in ${TOOL_META[t].label} → ${dest}`);
  }
  if (skipped.length) console.log(`  ⓘ ${skipped.map(t => TOOL_META[t].label).join(", ")}: no global skills — run project-init per project (\`node setup.js --init\`)`);
}

// Install missing tools + apply ready-to-use config (Context7 MCP) + the in-tool project-init skill.
function setupTools(keys, opts = {}) {
  const { isInstalled, ensureTool, ensurePrereqs } = require(path.join(HERE, "ensure-tools.js"));
  const { propagate, TARGETS } = require(path.join(HERE, "lib", "propagate-mcp.js"));
  ensurePrereqs(keys);
  for (const t of keys) {
    if (!isInstalled(t)) ensureTool(t); else console.log(`  ✓ ${TOOL_META[t].label} already installed`);
    if (TARGETS[t]) propagate(t, { fresh: opts.fresh });
  }
  console.log("\nInstalling the in-tool project-init command …");
  installProjectInitSkill(keys);
}
function authNotes(keys) {
  const lines = {
    claude: "  • Claude Code : run `claude` → `/login`  (Context7: `claude mcp add --transport http --scope user context7 https://mcp.context7.com/mcp --header \"CONTEXT7_API_KEY: $CONTEXT7_API_KEY\"`)",
    codex: "  • Codex       : run `codex login`",
    antigravity: "  • Antigravity : open the app → sign in with Google",
    opencode: "  • opencode    : run `opencode login`",
    cursor: "  • Cursor      : open the app → sign in",
    windsurf: "  • Windsurf    : open the app → sign in",
  };
  console.log("\nNext — authenticate each tool with YOUR account:");
  for (const k of keys) if (lines[k]) console.log(lines[k]);
  if (!process.env.CONTEXT7_API_KEY) console.log("\n  ⓘ Set CONTEXT7_API_KEY in your environment so the configured Context7 MCP resolves.");
  console.log("\nPer project: open the tool in a project folder and say “project-init” (or “set up this project”) —");
  console.log("it scaffolds AGENTS.md and downloads/configures the experts that project needs.");
  console.log("CLI alternative: `node setup.js --init`\n");
}

async function wizard() {
  const { selectOne, selectMany } = require(path.join(HERE, "lib", "tui.js"));
  const { isInstalled } = require(path.join(HERE, "ensure-tools.js"));
  const { configInfo } = require(path.join(HERE, "lib", "propagate-mcp.js"));

  const installed = {};
  ALL_TOOLS.forEach(t => { installed[t] = isInstalled(t); });
  console.log("\nDetected on this machine:");
  ALL_TOOLS.forEach(t => console.log(`  ${installed[t] ? "✓" : "·"} ${TOOL_META[t].label}${installed[t] ? "" : "   (not installed)"}`));

  const items = ALL_TOOLS.map(t => ({ label: TOOL_META[t].label, value: t, hint: installed[t] ? "installed — add config" : "install + config" }));
  const picked = await selectMany("Set up which tools? (installs missing + configures all selected)", items, { preselect: ALL_TOOLS });
  if (!picked.length) { console.log("Nothing selected — done."); return; }

  // Don't clobber prior MCP config: ask once if any selected tool already has other servers.
  const withExisting = picked.filter(t => { const i = configInfo(t); return i.known && i.exists && i.otherServers.length; });
  let fresh = false;
  if (withExisting.length) {
    const mode = await selectOne(`Existing MCP config found for: ${withExisting.join(", ")} — how to add Context7?`, [
      { label: "Merge", value: "merge", hint: "keep your servers, add Context7 (non-destructive)" },
      { label: "Fresh + backup", value: "fresh", hint: "back up to .bak, then write a clean config" },
    ]);
    fresh = mode === "fresh";
  }

  console.log("");
  setupTools(picked, { fresh });
  authNotes(picked);

  // Optional: scaffold the current folder now (project-init). Default No (safe in non-TTY).
  const scaffold = await selectOne(`Scaffold the current folder as a project now?  (${process.cwd()})`, [
    { label: "No", value: false, hint: "all set — say “project-init” in a tool later, or `node setup.js --init`" },
    { label: "Yes", value: true, hint: "run project-init here now (AGENTS.md + experts)" },
  ]);
  if (scaffold) run("project-init.js", ["."].concat(passInit()));
  console.log("\n✓ Setup complete — tools installed/configured and the project-init command is available in them.");
}

if (ARGV.includes("--tools")) { const keys = selectedKeys(parseToolList()); setupTools(keys, { fresh: ARGV.includes("--fresh") }); authNotes(keys); }
else if (ARGV.includes("--init")) { run("project-init.js", ["."].concat(passInit())); }
else if (ARGV.includes("--all")) { const keys = selectedKeys(parseToolList()); setupTools(keys, { fresh: ARGV.includes("--fresh") }); run("project-init.js", ["."].concat(passInit())); authNotes(keys); }
else { wizard(); }
