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
const { scanSource } = require(path.join(__dirname, "lib", "scan-source.js"));
const { rejectSymlinks } = require(path.join(__dirname, "lib", "fetch-source.js"));

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
const VALID = /^[A-Za-z0-9_-]+$/;
function flagVal(name){ const i=ARGV.indexOf(name); return (i>=0 && ARGV[i+1] && !ARGV[i+1].startsWith("--")) ? ARGV[i+1] : null; }
function readManifest(projectDir){ try { return JSON.parse(fs.readFileSync(path.join(projectDir,".aics-experts.json"),"utf8")); } catch { return { version:1, experts:[] }; } }
function writeManifest(projectDir, man){ fs.writeFileSync(path.join(projectDir,".aics-experts.json"), JSON.stringify(man,null,2)+"\n"); }
function upsertManifest(man, rec){ man.experts = (man.experts||[]).filter(e => e.id!==rec.id); man.experts.push(rec); return man; }

function installFromSource(projectDir, tools) {
  const sourceId = flagVal("--source-id");
  const sourcePath = flagVal("--source-path");
  const layout = flagVal("--layout");
  const ref = flagVal("--ref") || "unknown";
  const picks = (flagVal("--pick") || "").split(",").map(s=>s.trim()).filter(Boolean);
  if (!sourcePath || !layout) { console.error("install-experts: --source-id needs --source-path and --layout"); process.exit(1); }
  if (!picks.length) { console.log("No picks. Pass --pick name1,name2"); return; }
  const avail = scanSource(sourcePath, layout, {});
  const byName = Object.fromEntries(avail.map(a => [a.name, a]));
  const man = readManifest(projectDir);
  console.log(`install-experts (source ${sourceId}@${ref.slice(0,7)}) -> tools: ${tools.join(", ")} | picks: ${picks.join(", ")}${PREVIEW ? " (preview; --yes to write)" : ""}`);
  if (tools.includes("codex") && !PREVIEW) console.log("  ! codex writes to GLOBAL ~/.codex — affects every project.");
  for (const name of picks) {
    if (!VALID.test(name)) { console.log(`  ! invalid pick name: ${name}`); continue; }
    const item = byName[name];
    if (!item) { console.log(`  ! not found in source: ${name}`); continue; }
    const installedTools = [];
    for (const tool of tools) {
      const t = TOOLS[tool]; if (!t) continue;
      if (item.type === "skill") {
        const destDir = safeJoin(baseDir(tool, projectDir), t.skillSub(name).replace(/\/SKILL\.md$/,""));
        if (PREVIEW) { console.log(`  would copy [${tool}] ${name}/ (skill dir)`); continue; }
        rejectSymlinks(item.dir);
        fs.rmSync(destDir, { recursive:true, force:true });
        fs.mkdirSync(path.dirname(destDir), { recursive:true });
        fs.cpSync(item.dir, destDir, { recursive:true });
        installedTools.push(tool); console.log(`  + [${tool}] skills/${name}/`);
      } else {
        const spec = parseSpec(fs.readFileSync(item.file, "utf8"));
        if (!spec.meta.id) spec.meta.id = name;
        if (!spec.meta.kind) spec.meta.kind = "agent";
        const { subpath, content } = renderExpert(spec, tool);
        const dest = safeJoin(baseDir(tool, projectDir), subpath);
        if (PREVIEW) { console.log(`  would write [${tool}] ${subpath}`); continue; }
        fs.mkdirSync(path.dirname(dest), { recursive:true });
        fs.writeFileSync(dest, content);
        installedTools.push(tool); console.log(`  + [${tool}] ${subpath}`);
      }
    }
    if (!PREVIEW && installedTools.length) {
      upsertManifest(man, { id:name, type:item.type, source:sourceId, sourcePath:item.dir||item.file, ref, installedAt:new Date().toISOString(), tools:installedTools, layout });
    }
  }
  if (!PREVIEW) writeManifest(projectDir, man);
  if (PREVIEW && !DRY) console.log("Preview only — re-run with --yes to write.");
}

function main() {
  const projectDir = path.resolve(ARGV.find((a, i) => !a.startsWith("--") && ARGV[i - 1] !== "--tools" && ARGV[i - 1] !== "--experts") || process.cwd());
  if (!fs.existsSync(projectDir)) { console.error(`install-experts: directory not found: ${projectDir}`); process.exit(1); }
  let tools = flagList("--tools");
  if (!tools.length || tools.includes("all")) tools = ALL_TOOLS;
  tools = [...new Set(tools)].filter(t => ALL_TOOLS.includes(t));
  if (ARGV.includes("--source-id")) return installFromSource(projectDir, tools);
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
