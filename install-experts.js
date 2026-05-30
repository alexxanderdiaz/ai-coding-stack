#!/usr/bin/env node
/**
 * install-experts — render catalog experts to each selected tool's native format
 * and write them into the right location. Bundled specs only (no network).
 * Targets: claude -> <projectDir>/.claude ; antigravity -> <projectDir>/.agent ;
 *          codex -> <os.homedir()>/.codex (global; documented).
 * Approval gate: nothing is written unless --yes is passed (otherwise preview only).
 * Usage:
 *   node install-experts.js [dir] --tools claude,codex --experts id1,id2 [--dry-run] [--yes] [--force]
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseSpec, renderExpert, TOOLS } = require(path.join(__dirname, "lib", "render-expert.js"));

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes("--dry-run");
const YES = ARGV.includes("--yes");
const FORCE = ARGV.includes("--force");
const PREVIEW = DRY || !YES;                 // approval gate: never write unless --yes
const CATALOG_DIR = path.join(__dirname, "catalog");
const ALL_TOOLS = Object.keys(TOOLS);

function flagList(name) {
  const i = ARGV.indexOf(name);
  if (i < 0) return [];
  const v = ARGV[i + 1];
  if (!v || v.startsWith("--")) return [];
  return v.split(",").map(s => s.trim()).filter(Boolean);
}
function baseDir(tool, projectDir) {
  const t = TOOLS[tool];
  if (!t) throw new Error(`unknown tool: ${tool}`);
  return t.scope === "global" ? path.join(os.homedir(), t.dirName) : path.join(projectDir, t.dirName);
}
// resolve subpath under base and refuse anything that escapes it (defense-in-depth vs traversal)
function safeJoin(base, subpath) {
  const root = path.resolve(base);
  const dest = path.resolve(root, subpath);
  if (dest !== root && !dest.startsWith(root + path.sep)) throw new Error(`path traversal blocked: ${subpath}`);
  return dest;
}
// catalog spec paths are trusted today, but contain them too (future-proof for external catalogs)
function safeCatalogSpec(spec) {
  const root = path.resolve(CATALOG_DIR);
  const dest = path.resolve(root, spec);
  if (dest !== root && !dest.startsWith(root + path.sep)) throw new Error(`catalog spec escapes CATALOG_DIR: ${spec}`);
  return dest;
}
function main() {
  const projectDir = path.resolve(ARGV.find((a, i) => !a.startsWith("--") && ARGV[i - 1] !== "--tools" && ARGV[i - 1] !== "--experts") || process.cwd());
  if (!fs.existsSync(projectDir)) { console.error(`install-experts: directory not found: ${projectDir}`); process.exit(1); }
  let tools = flagList("--tools");
  if (!tools.length || tools.includes("all")) tools = ALL_TOOLS;
  tools = [...new Set(tools)].filter(t => ALL_TOOLS.includes(t));
  const ids = flagList("--experts");
  const catalog = require(path.join(CATALOG_DIR, "catalog.json"));
  const byId = Object.fromEntries(catalog.experts.map(e => [e.id, e]));
  if (!ids.length) { console.log("No experts selected. Pass --experts id1,id2"); return; }
  console.log(`install-experts -> tools: ${tools.join(", ")} | experts: ${ids.join(", ")}${DRY ? " (dry-run)" : (PREVIEW ? " (preview; pass --yes to write)" : "")}`);
  if (tools.includes("codex")) console.log("  ! codex writes to GLOBAL ~/.codex — affects every project on this machine.");
  for (const id of ids) {
    const entry = byId[id];
    if (!entry) { console.log(`  ! unknown expert: ${id}`); continue; }
    if (!entry.source || entry.source.type !== "bundled") { console.log(`  ! ${id}: only bundled specs supported in this version`); continue; }
    const spec = parseSpec(fs.readFileSync(safeCatalogSpec(entry.spec), "utf8"));
    for (const tool of tools) {
      const { subpath, content } = renderExpert(spec, tool);
      const dest = safeJoin(baseDir(tool, projectDir), subpath);
      const where = TOOLS[tool].scope === "global" ? "~/" + TOOLS[tool].dirName : TOOLS[tool].dirName;
      if (PREVIEW) { console.log(`  would write [${tool}] ${where}/${subpath}`); continue; }
      if (fs.existsSync(dest) && !FORCE) { console.log(`  = [${tool}] ${subpath} exists (kept; --force to overwrite)`); continue; }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
      console.log(`  + [${tool}] ${where}/${subpath}`);
    }
  }
  if (PREVIEW && !DRY) console.log("Preview only — re-run with --yes to write the files above.");
  else if (!PREVIEW) console.log("Done. Review the generated files before relying on them.");
}

if (require.main === module) main();
