#!/usr/bin/env node
/**
 * Smoke tests — cross-platform (Node only). Run: npm test
 * Validates: every script parses, detect-stack works, project-init writes the
 * four files with real commands, ensure-tools --check runs. Exits non-zero on failure.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); pass++; };
const bad = (m) => { console.log(`  ✗ ${m}`); fail++; };

function nodeCheck(rel) {
  try { execFileSync("node", ["-c", path.join(ROOT, rel)], { stdio: "ignore" }); ok(`parses: ${rel}`); }
  catch { bad(`parse error: ${rel}`); }
}

console.log("ai-coding-stack smoke tests\n");

// 1. All scripts parse
console.log("Syntax:");
for (const f of ["setup.js", "ensure-tools.js", "project-init.js", "lib/detect-stack.js", "hooks/state-snapshot.js", "skills/project-init/project-init.js"]) {
  nodeCheck(f);
}

// 2. detect-stack on a Go fixture
console.log("\ndetect-stack:");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aics-"));
try {
  fs.writeFileSync(path.join(tmp, "go.mod"), "module demo\ngo 1.22\n");
  const { detectStack } = require(path.join(ROOT, "lib", "detect-stack.js"));
  const d = detectStack(tmp);
  d.languages.includes("Go") ? ok("detects Go") : bad("Go not detected");
  d.commands.test === "go test ./..." ? ok("real test command") : bad("test command wrong");
} catch (e) { bad("detect-stack threw: " + e.message); }

// 3. project-init writes the four files
console.log("\nproject-init:");
try {
  execFileSync("node", [path.join(ROOT, "project-init.js"), tmp, "--about", "smoke test", "--force"], { stdio: "ignore" });
  for (const f of ["AGENTS.md", "CLAUDE.md", "GEMINI.md", "STATE.md"]) {
    fs.existsSync(path.join(tmp, f)) ? ok(`wrote ${f}`) : bad(`missing ${f}`);
  }
  const agents = fs.readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
  agents.includes("go test ./...") ? ok("AGENTS.md has real command") : bad("AGENTS.md missing command");
  agents.includes("smoke test") ? ok("AGENTS.md has --about goal") : bad("AGENTS.md missing goal");
  fs.readFileSync(path.join(tmp, "CLAUDE.md"), "utf8").includes("AGENTS.md") ? ok("CLAUDE.md points to AGENTS.md") : bad("CLAUDE.md not a pointer");
} catch (e) { bad("project-init threw: " + e.message); }
fs.rmSync(tmp, { recursive: true, force: true });

// 4. ensure-tools --check runs (no install)
console.log("\nensure-tools:");
try { execFileSync("node", [path.join(ROOT, "ensure-tools.js"), "all", "--check"], { stdio: "ignore" }); ok("ensure-tools --check runs"); }
catch { bad("ensure-tools --check failed"); }

// 5. ensure-tools accepts a comma list (CHECK only, no install)
console.log("\nensure-tools selection:");
try {
  const out = execFileSync("node", [path.join(ROOT, "ensure-tools.js"), "claude,codex", "--check"], { encoding: "utf8" });
  out.includes("== claude ==") ? ok("selects claude") : bad("claude not selected");
  out.includes("== codex ==") ? ok("selects codex") : bad("codex not selected");
  !out.includes("== antigravity ==") ? ok("excludes antigravity") : bad("antigravity wrongly included");
} catch (e) { bad("ensure-tools list threw: " + e.message); }

// 6. setup.js --tools <list> forwards the selection to ensure-tools
console.log("\nsetup selection:");
try {
  const out = execFileSync("node", [path.join(ROOT, "setup.js"), "--tools", "claude", "--check-tools"], { encoding: "utf8" });
  out.includes("== claude ==") ? ok("setup forwards claude") : bad("setup did not forward claude");
  !out.includes("== antigravity ==") ? ok("setup limits to selection") : bad("setup forwarded extra tools");
} catch (e) { bad("setup --tools threw: " + e.message); }

// 4b. catalog integrity: parses, ids unique, spec files exist, kinds valid
console.log("\ncatalog:");
try {
  const catalog = require(path.join(ROOT, "catalog", "catalog.json"));
  Array.isArray(catalog.experts) && catalog.experts.length > 0 ? ok("catalog has experts") : bad("catalog empty");
  const ids = catalog.experts.map(e => e.id);
  new Set(ids).size === ids.length ? ok("ids unique") : bad("duplicate ids");
  const kindsOk = catalog.experts.every(e => e.kind === "agent" || e.kind === "skill");
  kindsOk ? ok("kinds valid") : bad("invalid kind in catalog");
  const specsOk = catalog.experts.every(e => fs.existsSync(path.join(ROOT, "catalog", e.spec)));
  specsOk ? ok("all spec files exist") : bad("missing spec file");
} catch (e) { bad("catalog threw: " + e.message); }

// 7. match-experts ranks experts by stack + about text
console.log("\nmatch-experts:");
try {
  const catalog = require(path.join(ROOT, "catalog", "catalog.json"));
  const { matchExperts } = require(path.join(ROOT, "lib", "match-experts.js"));
  const goDet = { suggestedProfile: "backend", languages: ["Go"], frameworks: [] };
  const goIds = matchExperts(catalog, goDet, "build a REST api").map(e => e.id);
  goIds.includes("api-backend-pro") ? ok("Go backend -> api-backend-pro") : bad("missed api-backend-pro");
  goIds.includes("code-reviewer") ? ok("always includes code-reviewer (*)") : bad("missed code-reviewer");
  !goIds.includes("frontend-pro") ? ok("excludes frontend-pro for Go") : bad("frontend-pro wrongly matched");
  const feDet = { suggestedProfile: "frontend", languages: ["TypeScript"], frameworks: ["React"] };
  matchExperts(catalog, feDet, "").map(e => e.id).includes("frontend-pro") ? ok("React -> frontend-pro") : bad("missed frontend-pro");
} catch (e) { bad("match-experts threw: " + e.message); }

// 8. render-expert produces per-tool native formats
console.log("\nrender-expert:");
try {
  const { parseSpec, renderExpert } = require(path.join(ROOT, "lib", "render-expert.js"));
  const spec = parseSpec(fs.readFileSync(path.join(ROOT, "catalog", "specs", "code-reviewer.md"), "utf8"));
  spec.meta.id === "code-reviewer" && spec.meta.kind === "agent" ? ok("parseSpec reads frontmatter") : bad("parseSpec frontmatter wrong");
  const cl = renderExpert(spec, "claude");
  cl.subpath === "agents/code-reviewer.md" && cl.content.startsWith("---") && cl.content.includes("name: code-reviewer") ? ok("claude agent .md") : bad("claude render wrong");
  const cx = renderExpert(spec, "codex");
  cx.subpath === "agents/code-reviewer.toml" && cx.content.includes('name = "code-reviewer"') && cx.content.includes('instructions = """') ? ok("codex agent .toml") : bad("codex render wrong");
  const ag = renderExpert(spec, "antigravity");
  ag.subpath === "workflows/code-reviewer.md" ? ok("antigravity workflow .md") : bad("antigravity render wrong");
  const skillSpec = parseSpec(fs.readFileSync(path.join(ROOT, "catalog", "specs", "python-pro.md"), "utf8"));
  renderExpert(skillSpec, "claude").subpath === "skills/python-pro/SKILL.md" ? ok("skill -> SKILL.md") : bad("skill subpath wrong");
  try { renderExpert({ meta: { id: "../evil", kind: "agent" }, body: "x" }, "claude"); bad("id traversal not blocked"); }
  catch { ok("rejects traversal id"); }
  try { renderExpert({ meta: { id: "ok", kind: "bogus" }, body: "x" }, "claude"); bad("bad kind not rejected"); }
  catch { ok("rejects bad kind"); }
  parseSpec("---\r\nid: x\r\nkind: skill\r\n---\r\nbody").meta.id === "x" ? ok("parseSpec handles CRLF") : bad("CRLF parse failed");
} catch (e) { bad("render-expert threw: " + e.message); }
try {
  const specsDir = path.join(ROOT, "catalog", "specs");
  const bad3 = fs.readdirSync(specsDir).filter(f => fs.readFileSync(path.join(specsDir, f), "utf8").includes("'''"));
  bad3.length === 0 ? ok("no spec contains triple-quote") : bad("specs with triple-quote: " + bad3.join(","));
} catch (e) { bad("spec scan threw: " + e.message); }

// 9. install-experts writes rendered experts into a temp project (claude/antigravity local)
console.log("\ninstall-experts:");
const itmp = fs.mkdtempSync(path.join(os.tmpdir(), "aics-exp-"));
try {
  const dry = execFileSync("node", [path.join(ROOT, "install-experts.js"), itmp, "--tools", "claude", "--experts", "code-reviewer", "--dry-run"], { encoding: "utf8" });
  dry.includes("agents/code-reviewer.md") ? ok("dry-run lists claude agent path") : bad("dry-run path missing");
  !fs.existsSync(path.join(itmp, ".claude", "agents", "code-reviewer.md")) ? ok("dry-run writes nothing") : bad("dry-run wrote files");
  execFileSync("node", [path.join(ROOT, "install-experts.js"), itmp, "--tools", "claude", "--experts", "code-reviewer"], { stdio: "ignore" });
  !fs.existsSync(path.join(itmp, ".claude", "agents", "code-reviewer.md")) ? ok("no write without --yes") : bad("wrote without --yes");
  execFileSync("node", [path.join(ROOT, "install-experts.js"), itmp, "--tools", "claude,antigravity", "--experts", "code-reviewer,python-pro", "--yes"], { stdio: "ignore" });
  fs.existsSync(path.join(itmp, ".claude", "agents", "code-reviewer.md")) ? ok("claude agent written") : bad("claude agent missing");
  fs.existsSync(path.join(itmp, ".agent", "workflows", "code-reviewer.md")) ? ok("antigravity workflow written") : bad("antigravity workflow missing");
  fs.existsSync(path.join(itmp, ".claude", "skills", "python-pro", "SKILL.md")) ? ok("claude skill written") : bad("claude skill missing");
  fs.existsSync(path.join(itmp, ".agent", "skills", "python-pro", "SKILL.md")) ? ok("antigravity skill written") : bad("antigravity skill missing");
} catch (e) { bad("install-experts threw: " + e.message); }
fs.rmSync(itmp, { recursive: true, force: true });

// 10. project-init --with-experts prints stack-matched suggestions
console.log("\nproject-init --with-experts:");
const ptmp = fs.mkdtempSync(path.join(os.tmpdir(), "aics-pi-"));
try {
  fs.writeFileSync(path.join(ptmp, "go.mod"), "module demo\ngo 1.22\n");
  const out = execFileSync("node", [path.join(ROOT, "project-init.js"), ptmp, "--about", "rest api", "--with-experts", "--force"], { encoding: "utf8" });
  out.includes("Suggested experts for this stack:") ? ok("prints suggestions") : bad("no suggestions printed");
  out.includes("api-backend-pro") ? ok("suggests api-backend-pro for Go") : bad("missed api-backend-pro");
  out.includes("code-reviewer") ? ok("suggests code-reviewer") : bad("missed code-reviewer");
} catch (e) { bad("project-init --with-experts threw: " + e.message); }
fs.rmSync(ptmp, { recursive: true, force: true });

// 11. sources allowlist integrity
console.log("\nsources:");
try {
  const s = require(path.join(ROOT, "catalog", "sources.json"));
  const ALLOW = new Set(["github.com"]);
  (Array.isArray(s.sources) && s.sources.length) ? ok("has sources") : bad("no sources");
  const ids = s.sources.map(x => x.id);
  new Set(ids).size === ids.length ? ok("source ids unique") : bad("dup source ids");
  s.sources.every(x => ALLOW.has(x.host)) ? ok("hosts allowlisted") : bad("host not allowlisted");
  s.sources.every(x => { try { return new URL(x.repo).hostname === x.host; } catch { return false; } }) ? ok("repo host matches") : bad("repo/host mismatch");
  s.sources.every(x => ["skills-dir","agents-dir","claude-plugin-marketplace"].includes(x.layout)) ? ok("layouts valid") : bad("bad layout");
  s.sources.every(x => x.license) ? ok("licenses recorded") : bad("missing license");
} catch (e) { bad("sources threw: " + e.message); }

// 12. fetch-source guards (host allowlist + symlink rejection) — no network
console.log("\nfetch-source:");
try {
  const { isAllowedHost, rejectSymlinks } = require(path.join(ROOT, "lib", "fetch-source.js"));
  isAllowedHost("https://github.com/a/b", "github.com") ? ok("allows github.com") : bad("github rejected");
  !isAllowedHost("https://github.com.evil.com/a/b", "github.com") ? ok("rejects look-alike host") : bad("look-alike allowed");
  !isAllowedHost("https://gitlab.com/a/b", "gitlab.com") ? ok("rejects non-allowlisted host") : bad("non-allowlisted allowed");
  !isAllowedHost("/local/path", "github.com") ? ok("rejects non-URL") : bad("non-URL allowed");
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "aics-sym-"));
  fs.mkdirSync(path.join(d, "sub")); fs.writeFileSync(path.join(d, "sub", "ok.txt"), "x");
  rejectSymlinks(d); ok("clean tree passes rejectSymlinks");
  let made = true; try { fs.symlinkSync("/etc/passwd", path.join(d, "evil")); } catch { made = false; }
  if (made) { let threw = false; try { rejectSymlinks(d); } catch { threw = true; } threw ? ok("symlink rejected") : bad("symlink not rejected"); }
  else { ok("symlink rejected (skipped: no symlink perm)"); }
  fs.rmSync(d, { recursive: true, force: true });
  isAllowedHost("https://github.com:22/a/b", "github.com") === false ? ok("rejects explicit port") : bad("port not rejected");
  isAllowedHost("http://github.com/a/b", "github.com") === false ? ok("rejects http (https only)") : bad("http allowed");
  let trav = false; try { require(path.join(ROOT, "lib", "fetch-source.js")).fetchSource({ id: "../evil", repo: "https://github.com/a/b", host: "github.com" }, fs.mkdtempSync(path.join(os.tmpdir(), "aics-fc-"))); } catch { trav = true; }
  trav ? ok("fetchSource rejects traversal id") : bad("traversal id not rejected");
} catch (e) { bad("fetch-source threw: " + e.message); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
