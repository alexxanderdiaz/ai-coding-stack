#!/usr/bin/env node
/**
 * scan-source — enumerate installable skills/agents in a fetched source tree.
 * Glob/recursive-aware. Pure read. Returns [{ type, name, dir?, file, description, group? }].
 *   name is a VALID_ID-safe basename used by install --pick.
 */
const fs = require("fs");
const path = require("path");
const { parseSpec } = require(path.join(__dirname, "render-expert.js"));

function dirNames(p) { try { return fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch { return []; } }
function desc(file) { try { return parseSpec(fs.readFileSync(file, "utf8")).meta.description || ""; } catch { return ""; } }

// recursively collect files matching predicate(name); skip .git
function walkFiles(base, predicate, acc) {
  acc = acc || [];
  let ents; try { ents = fs.readdirSync(base, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (e.name === ".git") continue;
    const p = path.join(base, e.name);
    if (e.isDirectory()) walkFiles(p, predicate, acc);
    else if (e.isFile() && predicate(e.name)) acc.push(p);
  }
  return acc;
}
// path prefix up to the first segment containing "*" (so "skills/*/*" -> "skills", "." -> ".")
function globPrefix(p) {
  const keep = [];
  for (const seg of String(p || ".").split("/")) { if (seg.includes("*")) break; keep.push(seg); }
  return keep.join("/") || ".";
}
function isAgentMd(name) { return name.endsWith(".md") && name.toLowerCase() !== "readme.md" && name !== "SKILL.md"; }

// a skill = any directory directly containing a SKILL.md (found recursively)
function collectSkills(base, group) {
  return walkFiles(base, n => n === "SKILL.md").map(f => {
    const dir = path.dirname(f);
    return { type: "skill", name: path.basename(dir), group, dir, file: f, description: desc(f) };
  });
}
// an agent = any *.md (not README/SKILL.md) found recursively under base
function collectAgents(base, group) {
  return walkFiles(base, isAgentMd).map(f => ({ type: "agent", name: path.basename(f).replace(/\.md$/, ""), group, file: f, description: desc(f) }));
}

function scanSource(rootPath, layout, paths) {
  paths = paths || {};
  let out = [];
  if (layout === "skills-dir") {
    out = collectSkills(path.join(rootPath, globPrefix(paths.skills || ".")));
  } else if (layout === "agents-dir") {
    out = collectAgents(path.join(rootPath, globPrefix(paths.agents || ".")));
  } else if (layout === "claude-plugin-marketplace") {
    // only LOCAL plugins are scannable; remote-url marketplaces yield nothing here
    const proot = path.join(rootPath, "plugins");
    for (const plugin of dirNames(proot)) {
      out = out.concat(collectSkills(path.join(proot, plugin, "skills"), plugin));
      out = out.concat(collectAgents(path.join(proot, plugin, "agents"), plugin));
    }
  } else {
    throw new Error("unknown layout: " + layout);
  }
  // dedup by name (first wins)
  const seen = new Set();
  return out.filter(x => (seen.has(x.name) ? false : seen.add(x.name)));
}

module.exports = { scanSource };
if (require.main === module) {
  const extra = process.argv[4] ? JSON.parse(process.argv[4]) : {};
  console.log(JSON.stringify(scanSource(process.argv[2], process.argv[3], extra), null, 2));
}
