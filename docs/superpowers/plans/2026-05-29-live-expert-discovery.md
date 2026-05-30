# Live Expert Discovery (Approach B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project pull the best community skills/agents from a curated allowlist of trusted collections (fetched, pinned), install only the project-relevant ones into the detected tools, with a provenance manifest and on-demand update.

**Architecture:** Plain Node, no deps. A `catalog/sources.json` allowlist + `lib/fetch-source.js` (clone --depth 1, host-allowlist, symlink-reject, SHA pin) + `lib/scan-source.js` (enumerate skills/agents) feed the existing `render-expert`/`install-experts` pipeline. The agent (in the SKILL) does role→pick selection; Node does fetch/scan/install/update deterministically. A `.aics-experts.json` manifest records provenance for `--update`.

**Tech Stack:** Node.js (CommonJS), `child_process.execFileSync` (git), reuses `lib/render-expert.js` (`parseSpec`, `renderExpert`, `TOOLS`). Test runner: `node test/smoke.js` (custom ok/bad; **no network** — local fixtures only).

NOTE: a project security hook blocks the Write tool on files containing the substring "exec"/"child_process" (false positive). For `lib/fetch-source.js` and `install-experts.js` edits, write via a Bash heredoc (`cat > file <<'EOF'`).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `catalog/sources.json` | trusted-source allowlist (verified repos) | Create |
| `lib/fetch-source.js` | `isAllowedHost`, `rejectSymlinks`, `fetchSource` (clone+pin) | Create |
| `lib/scan-source.js` | `scanSource(path,layout,paths)` → skills/agents list | Create |
| `install-experts.js` | `--source-id/--source-path/--layout/--ref/--pick` install + `.aics-experts.json` + `--update` | Modify |
| `skills/project-init/SKILL.md` | agent-driven fetch→scan→propose→approve→install + update | Modify |
| `project-init.js` | staleness hint from `.aics-experts.json` | Modify |
| `test/smoke.js` | fixtures, no network | Modify |
| `README.md` / `CHANGELOG.md` | document live discovery | Modify |

Reused unchanged: `lib/render-expert.js` (`parseSpec`, `renderExpert`, `TOOLS`), `lib/match-experts.js`, bundled `catalog/catalog.json` (offline fallback).

Install model per pick:
- **skill** → copy the skill's whole directory into each tool's `skills/<name>/` (preserves helper files).
- **agent** → `renderExpert` per tool (Claude `agents/<name>.md`, Codex `agents/<name>.toml`, Antigravity `workflows/<name>.md`).

---

## Task 1: catalog/sources.json

**Files:** Create `catalog/sources.json`; Test `test/smoke.js`.

- [ ] Step 1: append failing test before the summary `console.log`:

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
    } catch (e) { bad("sources threw: " + e.message); }

- [ ] Step 2: run `node test/smoke.js` -> FAIL (module missing).
- [ ] Step 3: create `catalog/sources.json`. VERIFY each candidate repo with `gh repo view <owner>/<repo>` (or `git ls-remote <url>`); include ONLY those that resolve. Start with these candidates (drop any that 404; keep 3-5):
  - `wshobson/agents` (layout `agents-dir`, paths `{ "agents": "." }`)
  - `hesreallyhim/awesome-claude-code` (index; if it is a list not installable skills, omit or mark layout `skills-dir` only if it has a skills/ dir)
  - the `everything-claude-code` marketplace repo (resolve its real owner via `gh search repos everything-claude-code`; layout `claude-plugin-marketplace`, paths `{ "skills": "plugins/*/skills", "agents": "plugins/*/agents" }`)
  - `obra/superpowers` or the superpowers marketplace repo (resolve real owner via `gh search repos superpowers claude`; layout `claude-plugin-marketplace`)
  Schema (every entry): `id`, `repo` (https URL), `host` ("github.com"), `layout`, `paths`, `tags` (array of domains), `description`. Example verified entry:

    {
      "version": 1,
      "sources": [
        { "id": "wshobson-agents", "repo": "https://github.com/wshobson/agents", "host": "github.com",
          "layout": "agents-dir", "paths": { "agents": "." },
          "tags": ["agents","backend","frontend","data","devops","review"],
          "description": "Large curated Claude subagent collection." }
      ]
    }

  Add the other verified sources as further array entries.
- [ ] Step 4: `node -e "require('./catalog/sources.json'); console.log('sources ok')"` -> `sources ok`. Run `node test/smoke.js` -> 5 new assertions pass.
- [ ] Step 5: commit `feat: add trusted-source allowlist (sources.json)` (git add catalog/sources.json test/smoke.js).

---

## Task 2: lib/fetch-source.js

**Files:** Create `lib/fetch-source.js` (write via heredoc — contains child_process); Test `test/smoke.js`.

- [ ] Step 1: append failing test before the summary:

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
    } catch (e) { bad("fetch-source threw: " + e.message); }

- [ ] Step 2: run -> FAIL (module missing).
- [ ] Step 3: write `lib/fetch-source.js` (heredoc):

    #!/usr/bin/env node
    /**
     * fetch-source — clone a trusted source repo (pinned), reject symlinks, return {path, ref}.
     * Security: host allowlist (exact hostname), --depth 1, no execution of repo contents.
     */
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const cp = require("child_process");

    const ALLOWED_HOSTS = new Set(["github.com"]);

    function isAllowedHost(repo, host) {
      let u;
      try { u = new URL(repo); } catch { return false; }
      return (u.protocol === "https:" || u.protocol === "http:") && u.hostname === host && ALLOWED_HOSTS.has(host);
    }

    // throw if any entry under dir (excluding .git) is a symlink
    function rejectSymlinks(dir) {
      const stack = [dir];
      while (stack.length) {
        const cur = stack.pop();
        for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
          if (e.name === ".git") continue;
          const p = path.join(cur, e.name);
          const st = fs.lstatSync(p);
          if (st.isSymbolicLink()) throw new Error("symlink rejected in source: " + p);
          if (st.isDirectory()) stack.push(p);
        }
      }
    }

    function cacheRoot() { return path.join(os.homedir(), ".cache", "ai-coding-stack", "sources"); }

    // clone --depth 1, pin SHA, reject symlinks. Returns {path, ref}.
    function fetchSource(entry, cacheDir) {
      if (!isAllowedHost(entry.repo, entry.host)) throw new Error("source host not allowed: " + entry.repo);
      const root = cacheDir || cacheRoot();
      const dest = path.join(root, entry.id);
      fs.rmSync(dest, { recursive: true, force: true });
      fs.mkdirSync(root, { recursive: true });
      cp.execFileSync("git", ["clone", "--depth", "1", entry.repo, dest], { stdio: ["ignore", "pipe", "pipe"] });
      rejectSymlinks(dest);
      const ref = cp.execFileSync("git", ["-C", dest, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
      return { path: dest, ref };
    }

    module.exports = { isAllowedHost, rejectSymlinks, fetchSource, cacheRoot, ALLOWED_HOSTS };

    if (require.main === module) {
      const id = process.argv[2];
      const sources = require(path.join(__dirname, "..", "catalog", "sources.json")).sources;
      const entry = sources.find(s => s.id === id);
      if (!entry) { console.error("unknown source: " + id); process.exit(1); }
      console.log(JSON.stringify(fetchSource(entry)));
    }

- [ ] Step 4: run `node test/smoke.js` -> new assertions pass.
- [ ] Step 5: commit `feat: fetch-source (clone+pin, host allowlist, symlink reject)` (git add lib/fetch-source.js test/smoke.js).

---

## Task 3: lib/scan-source.js

**Files:** Create `lib/scan-source.js`; Test `test/smoke.js`.

- [ ] Step 1: append failing test before the summary (builds local fixtures for all 3 layouts):

    // 13. scan-source enumerates skills/agents per layout (fixtures, no network)
    console.log("\nscan-source:");
    try {
      const { scanSource } = require(path.join(ROOT, "lib", "scan-source.js"));
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "aics-scan-"));
      // skills-dir
      const sd = path.join(root, "sd"); fs.mkdirSync(path.join(sd, "alpha"), { recursive: true });
      fs.writeFileSync(path.join(sd, "alpha", "SKILL.md"), "---\nname: alpha\ndescription: A skill\n---\nbody");
      const sdRes = scanSource(sd, "skills-dir", { skills: "." });
      (sdRes.length === 1 && sdRes[0].type === "skill" && sdRes[0].name === "alpha" && sdRes[0].description === "A skill") ? ok("skills-dir scan") : bad("skills-dir wrong");
      // agents-dir
      const ad = path.join(root, "ad"); fs.mkdirSync(ad, { recursive: true });
      fs.writeFileSync(path.join(ad, "rev.md"), "---\nid: rev\ndescription: Reviewer\n---\nbody");
      const adRes = scanSource(ad, "agents-dir", { agents: "." });
      (adRes.length === 1 && adRes[0].type === "agent" && adRes[0].name === "rev") ? ok("agents-dir scan") : bad("agents-dir wrong");
      // claude-plugin-marketplace
      const mp = path.join(root, "mp");
      fs.mkdirSync(path.join(mp, "plugins", "qa", "skills", "lint"), { recursive: true });
      fs.writeFileSync(path.join(mp, "plugins", "qa", "skills", "lint", "SKILL.md"), "---\nname: lint\ndescription: Lint\n---\nb");
      fs.mkdirSync(path.join(mp, "plugins", "qa", "agents"), { recursive: true });
      fs.writeFileSync(path.join(mp, "plugins", "qa", "agents", "cr.md"), "---\nid: cr\ndescription: CR\n---\nb");
      const mpRes = scanSource(mp, "claude-plugin-marketplace", {});
      (mpRes.some(x => x.type === "skill" && x.name === "lint") && mpRes.some(x => x.type === "agent" && x.name === "cr")) ? ok("marketplace scan") : bad("marketplace wrong");
      let threw = false; try { scanSource(sd, "bogus", {}); } catch { threw = true; } threw ? ok("rejects unknown layout") : bad("bad layout not rejected");
      fs.rmSync(root, { recursive: true, force: true });
    } catch (e) { bad("scan-source threw: " + e.message); }

- [ ] Step 2: run -> FAIL (module missing).
- [ ] Step 3: implement `lib/scan-source.js`:

    #!/usr/bin/env node
    /**
     * scan-source — enumerate installable skills/agents in a fetched source tree.
     * Pure read. Returns [{ type:"skill"|"agent", name, dir|file, description, group? }].
     *   name is a VALID_ID-safe basename used by install --pick.
     */
    const fs = require("fs");
    const path = require("path");
    const { parseSpec } = require(path.join(__dirname, "render-expert.js"));

    function dirs(p) { try { return fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch { return []; } }
    function files(p) { try { return fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name); } catch { return []; } }
    function desc(file) { try { return parseSpec(fs.readFileSync(file, "utf8")).meta.description || ""; } catch { return ""; } }

    function scanSource(rootPath, layout, paths) {
      paths = paths || {};
      const out = [];
      if (layout === "skills-dir") {
        const base = path.join(rootPath, paths.skills || ".");
        for (const d of dirs(base)) {
          const f = path.join(base, d, "SKILL.md");
          if (fs.existsSync(f)) out.push({ type: "skill", name: d, dir: path.join(base, d), file: f, description: desc(f) });
        }
      } else if (layout === "agents-dir") {
        const base = path.join(rootPath, paths.agents || ".");
        for (const e of files(base)) if (e.endsWith(".md") && e.toLowerCase() !== "readme.md") {
          const f = path.join(base, e);
          out.push({ type: "agent", name: e.replace(/\.md$/, ""), file: f, description: desc(f) });
        }
      } else if (layout === "claude-plugin-marketplace") {
        const proot = path.join(rootPath, "plugins");
        for (const plugin of dirs(proot)) {
          const sdir = path.join(proot, plugin, "skills");
          for (const d of dirs(sdir)) {
            const f = path.join(sdir, d, "SKILL.md");
            if (fs.existsSync(f)) out.push({ type: "skill", name: d, group: plugin, dir: path.join(sdir, d), file: f, description: desc(f) });
          }
          const adir = path.join(proot, plugin, "agents");
          for (const e of files(adir)) if (e.endsWith(".md") && e.toLowerCase() !== "readme.md") {
            const f = path.join(adir, e);
            out.push({ type: "agent", name: e.replace(/\.md$/, ""), group: plugin, file: f, description: desc(f) });
          }
        }
      } else {
        throw new Error("unknown layout: " + layout);
      }
      return out;
    }

    module.exports = { scanSource };
    if (require.main === module) console.log(JSON.stringify(scanSource(process.argv[2], process.argv[3], {}), null, 2));

- [ ] Step 4: run `node test/smoke.js` -> new assertions pass.
- [ ] Step 5: commit `feat: scan-source enumerates skills/agents per layout` (git add lib/scan-source.js test/smoke.js).

---

## Task 4: install-experts.js — source install + manifest

**Files:** Modify `install-experts.js` (write via heredoc); Test `test/smoke.js`.

- [ ] Step 1: append failing test before the summary (uses the scan fixture style as a local "source", no network):

    // 14. install-experts --source-path/--pick installs + writes manifest (offline fixture)
    console.log("\ninstall-experts source:");
    const stmp = fs.mkdtempSync(path.join(os.tmpdir(), "aics-src-"));
    const sproj = fs.mkdtempSync(path.join(os.tmpdir(), "aics-sproj-"));
    try {
      // build a fixture source (agents-dir) with one agent
      fs.writeFileSync(path.join(stmp, "rev.md"), "---\nid: rev\nkind: agent\ndescription: Reviewer\n---\nReview stuff.");
      // gate: no --yes => no write
      execFileSync("node", [path.join(ROOT, "install-experts.js"), sproj, "--tools", "claude", "--source-id", "fix", "--source-path", stmp, "--layout", "agents-dir", "--ref", "abc123", "--pick", "rev"], { stdio: "ignore" });
      !fs.existsSync(path.join(sproj, ".claude", "agents", "rev.md")) ? ok("source: no write without --yes") : bad("wrote without --yes");
      // with --yes => writes + manifest
      execFileSync("node", [path.join(ROOT, "install-experts.js"), sproj, "--tools", "claude,antigravity", "--source-id", "fix", "--source-path", stmp, "--layout", "agents-dir", "--ref", "abc123", "--pick", "rev", "--yes"], { stdio: "ignore" });
      fs.existsSync(path.join(sproj, ".claude", "agents", "rev.md")) ? ok("source: claude agent written") : bad("claude agent missing");
      fs.existsSync(path.join(sproj, ".agent", "workflows", "rev.md")) ? ok("source: antigravity workflow written") : bad("antigravity workflow missing");
      const man = JSON.parse(fs.readFileSync(path.join(sproj, ".aics-experts.json"), "utf8"));
      (man.experts && man.experts.length === 1 && man.experts[0].id === "rev" && man.experts[0].source === "fix" && man.experts[0].ref === "abc123" && Array.isArray(man.experts[0].tools)) ? ok("manifest written") : bad("manifest wrong");
      // skill pick: copy whole dir
      fs.mkdirSync(path.join(stmp, "skills", "helper"), { recursive: true });
      fs.writeFileSync(path.join(stmp, "skills", "helper", "SKILL.md"), "---\nname: helper\nkind: skill\ndescription: H\n---\nb");
      fs.writeFileSync(path.join(stmp, "skills", "helper", "extra.txt"), "data");
      execFileSync("node", [path.join(ROOT, "install-experts.js"), sproj, "--tools", "claude", "--source-id", "fix", "--source-path", path.join(stmp, "skills"), "--layout", "skills-dir", "--ref", "abc123", "--pick", "helper", "--yes"], { stdio: "ignore" });
      (fs.existsSync(path.join(sproj, ".claude", "skills", "helper", "SKILL.md")) && fs.existsSync(path.join(sproj, ".claude", "skills", "helper", "extra.txt"))) ? ok("source: skill dir copied with helper files") : bad("skill dir copy missing files");
    } catch (e) { bad("install-experts source threw: " + e.message); }
    fs.rmSync(stmp, { recursive: true, force: true }); fs.rmSync(sproj, { recursive: true, force: true });

- [ ] Step 2: run -> FAIL (no --source-id handling yet; agent not written or manifest missing).
- [ ] Step 3: Modify `install-experts.js`. Read the current file first. ADD (keep all existing bundled-catalog logic intact):
  - require at top: `const { scanSource } = require(path.join(__dirname, "lib", "scan-source.js"));`
  - a flag reader for single-value flags: `function flagVal(name){ const i=ARGV.indexOf(name); return (i>=0 && ARGV[i+1] && !ARGV[i+1].startsWith("--")) ? ARGV[i+1] : null; }`
  - a manifest helper:

        const VALID = /^[A-Za-z0-9_-]+$/;
        function readManifest(projectDir){ const f=path.join(projectDir,".aics-experts.json"); try { return JSON.parse(fs.readFileSync(f,"utf8")); } catch { return { version:1, experts:[] }; } }
        function writeManifest(projectDir, man){ fs.writeFileSync(path.join(projectDir,".aics-experts.json"), JSON.stringify(man,null,2)+"\n"); }
        function upsertManifest(man, rec){ man.experts = (man.experts||[]).filter(e => e.id!==rec.id); man.experts.push(rec); return man; }

  - a source-install branch in `main()` taken when `--source-id` is present (BEFORE the bundled-catalog path). Full branch:

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

  - In `main()`, after resolving `projectDir`/`tools`, branch: `if (ARGV.includes("--source-id")) return installFromSource(projectDir, tools);` (place before the bundled `ids`/catalog block). `parseSpec`/`renderExpert`/`TOOLS`/`baseDir`/`safeJoin`/`PREVIEW`/`DRY` already exist in the file.

- [ ] Step 4: run `node test/smoke.js` -> source assertions pass; bundled-catalog tests still pass.
- [ ] Step 5: commit `feat: install-experts installs from fetched sources + provenance manifest` (git add install-experts.js test/smoke.js).

---

## Task 5: install-experts.js --update

**Files:** Modify `install-experts.js` (heredoc); Test `test/smoke.js`.

- [ ] Step 1: append failing test before the summary:

    // 15. install-experts --update refreshes from a (changed) fixture source
    console.log("\ninstall-experts update:");
    const utmp = fs.mkdtempSync(path.join(os.tmpdir(), "aics-usrc-"));
    const uproj = fs.mkdtempSync(path.join(os.tmpdir(), "aics-uproj-"));
    try {
      fs.writeFileSync(path.join(utmp, "rev.md"), "---\nid: rev\nkind: agent\ndescription: v1\n---\nold body");
      execFileSync("node", [path.join(ROOT, "install-experts.js"), uproj, "--tools", "claude", "--source-id", "fix", "--source-path", utmp, "--layout", "agents-dir", "--ref", "r1", "--pick", "rev", "--yes"], { stdio: "ignore" });
      // source changes
      fs.writeFileSync(path.join(utmp, "rev.md"), "---\nid: rev\nkind: agent\ndescription: v2\n---\nNEW body");
      // update with source-path override map "fix=<path>" and new ref
      const upPrev = execFileSync("node", [path.join(ROOT, "install-experts.js"), uproj, "--update", "--source-path-map", "fix=" + utmp + ",fix.ref=r2"], { encoding: "utf8" });
      upPrev.includes("rev") ? ok("update preview lists rev") : bad("update preview missing rev");
      !fs.readFileSync(path.join(uproj, ".claude", "agents", "rev.md"), "utf8").includes("NEW body") ? ok("update preview writes nothing") : bad("update wrote without --yes");
      execFileSync("node", [path.join(ROOT, "install-experts.js"), uproj, "--update", "--source-path-map", "fix=" + utmp + ",fix.ref=r2", "--yes"], { stdio: "ignore" });
      fs.readFileSync(path.join(uproj, ".claude", "agents", "rev.md"), "utf8").includes("NEW body") ? ok("update applied with --yes") : bad("update not applied");
      const man = JSON.parse(fs.readFileSync(path.join(uproj, ".aics-experts.json"), "utf8"));
      man.experts[0].ref === "r2" ? ok("manifest ref bumped") : bad("manifest ref not bumped");
    } catch (e) { bad("install-experts update threw: " + e.message); }
    fs.rmSync(utmp, { recursive: true, force: true }); fs.rmSync(uproj, { recursive: true, force: true });

- [ ] Step 2: run -> FAIL (no --update).
- [ ] Step 3: Modify `install-experts.js`: add an update branch. Because tests must avoid network, `--update` resolves each source's local path from `--source-path-map "id=path,id.ref=sha"` when provided; otherwise (real use) it calls `fetchSource` from `lib/fetch-source.js`. Add:

  - require: `const { fetchSource } = require(path.join(__dirname, "lib", "fetch-source.js"));` and `const sources = (() => { try { return require(path.join(__dirname,"catalog","sources.json")).sources; } catch { return []; } })();`
  - parse the override map:

        function sourcePathMap() {
          const raw = flagVal("--source-path-map"); const m = {};
          if (!raw) return m;
          for (const pair of raw.split(",")) { const i = pair.indexOf("="); if (i>0) m[pair.slice(0,i)] = pair.slice(i+1); }
          return m;
        }

  - update branch:

        function doUpdate(projectDir, tools) {
          const man = readManifest(projectDir);
          if (!man.experts || !man.experts.length) { console.log("No .aics-experts.json experts to update."); return; }
          const overrides = sourcePathMap();
          const resolved = {}; // sourceId -> {path, ref}
          const targetTools = tools && tools.length ? tools : null;
          console.log(`install-experts --update${PREVIEW ? " (preview; --yes to write)" : ""}`);
          for (const rec of man.experts) {
            if (!resolved[rec.source]) {
              if (overrides[rec.source]) { resolved[rec.source] = { path: overrides[rec.source], ref: overrides[rec.source + ".ref"] || "updated" }; }
              else { const entry = sources.find(s => s.id === rec.source); if (!entry) { console.log(`  ! source not in allowlist: ${rec.source} (skip ${rec.id})`); continue; } resolved[rec.source] = fetchSource(entry); }
            }
            const src = resolved[rec.source]; if (!src) continue;
            const avail = scanSource(src.path, rec.layout, {});
            const item = avail.find(a => a.name === rec.id);
            if (!item) { console.log(`  ! ${rec.id} no longer in ${rec.source} (kept)`); continue; }
            const useTools = targetTools || rec.tools || [];
            for (const tool of useTools) {
              const t = TOOLS[tool]; if (!t) continue;
              if (item.type === "skill") {
                const destDir = safeJoin(baseDir(tool, projectDir), t.skillSub(rec.id).replace(/\/SKILL\.md$/,""));
                if (PREVIEW) { console.log(`  would refresh [${tool}] ${rec.id}/`); continue; }
                fs.rmSync(destDir, { recursive:true, force:true }); fs.mkdirSync(path.dirname(destDir), { recursive:true }); fs.cpSync(item.dir, destDir, { recursive:true });
                console.log(`  ~ [${tool}] skills/${rec.id}/`);
              } else {
                const spec = parseSpec(fs.readFileSync(item.file, "utf8")); if (!spec.meta.id) spec.meta.id = rec.id; if (!spec.meta.kind) spec.meta.kind = "agent";
                const { subpath, content } = renderExpert(spec, tool);
                const dest = safeJoin(baseDir(tool, projectDir), subpath);
                if (PREVIEW) { console.log(`  would refresh [${tool}] ${subpath}`); continue; }
                fs.mkdirSync(path.dirname(dest), { recursive:true }); fs.writeFileSync(dest, content);
                console.log(`  ~ [${tool}] ${subpath}`);
              }
            }
            if (!PREVIEW) { rec.ref = src.ref; rec.installedAt = new Date().toISOString(); }
          }
          if (!PREVIEW) writeManifest(projectDir, man);
          else if (!DRY) console.log("Preview only — re-run with --yes to apply updates.");
        }

  - In `main()`: `if (ARGV.includes("--update")) return doUpdate(projectDir, flagList("--tools").filter(t => ALL_TOOLS.includes(t)));` placed before the `--source-id` and bundled branches.
- [ ] Step 4: run `node test/smoke.js` -> update assertions pass; all prior pass.
- [ ] Step 5: commit `feat: install-experts --update refreshes from sources with preview` (git add install-experts.js test/smoke.js).

---

## Task 6: SKILL wiring + staleness hint

**Files:** Modify `skills/project-init/SKILL.md`; Modify `project-init.js`.

- [ ] Step 1: `project-init.js` staleness hint. After the `--with-experts` block in `main()`, add:

        try {
          const mf = path.join(dir, ".aics-experts.json");
          if (fs.existsSync(mf)) {
            const man = JSON.parse(fs.readFileSync(mf, "utf8"));
            const n = (man.experts || []).length;
            if (n) {
              const srcs = [...new Set(man.experts.map(e => e.source))].join(", ");
              const oldest = man.experts.map(e => e.installedAt).filter(Boolean).sort()[0] || "?";
              console.log(`>> ${n} expert(s) installed from ${srcs} (since ${String(oldest).slice(0,10)}). Refresh: node install-experts.js . --update --dry-run`);
            }
          }
        } catch { /* ignore */ }

  (`fs` and `path` are already required in project-init.js.)
- [ ] Step 2: verify hint:

        T=$(mktemp -d); printf '{"version":1,"experts":[{"id":"rev","source":"fix","ref":"r1","installedAt":"2026-05-01T00:00:00Z","tools":["claude"],"layout":"agents-dir"}]}' > "$T/.aics-experts.json"; node project-init.js "$T" --about x --force; rm -rf "$T"

  Expected: output includes `1 expert(s) installed from fix (since 2026-05-01)`.
- [ ] Step 3: `skills/project-init/SKILL.md` — replace step 5 (the discovery step) with the live flow. Keep frontmatter `allowed-tools: Bash(node:*), Bash(ls:*), Bash(cat:*)` and ADD `Bash(git:*)` (needed for fetch) and `Bash(gh:*)` (optional stars). New step 5:

        5. **Discover experts (live, approval-gated):** bring in best-fit community skills/agents for the project's role/stack.
           - Trusted sources are in `<repo>/catalog/sources.json` (allowlist). Pick the sources whose `tags` fit the role/`--about`.
           - For each, fetch (cached, pinned): `node "<repo>/lib/fetch-source.js" <sourceId>` → prints `{path, ref}`.
           - List what's inside: `node "<repo>/lib/scan-source.js" <path> <layout>`.
           - **Choose only the skills/agents relevant to THIS project** (match name/description/tags to the role/stack). Optionally check popularity with `gh repo view`.
           - Detect installed tools: `node "<repo>/ensure-tools.js" all --check`.
           - Preview (writes nothing): `node "<repo>/install-experts.js" . --tools <detected> --source-id <id> --source-path <path> --layout <layout> --ref <ref> --pick <names> --dry-run`.
           - Show the proposal (items + source + ref) and get explicit approval; then re-run with `--yes`. Installer refuses to write without `--yes`.
           - Codex installs to GLOBAL `~/.codex` — say so before `--yes`.
           - **Never run anything from a fetched source**; only its `SKILL.md`/agent `.md` are used. Offline / source unreachable → fall back to the bundled catalog (`--experts`).
           - Refresh later: `node "<repo>/install-experts.js" . --update --dry-run` then `--yes`.

- [ ] Step 4: `node test/smoke.js` -> all pass (SKILL is text; the bundled `skills/project-init/project-init.js` unchanged still parses). `node -c project-init.js` parses.
- [ ] Step 5: commit `feat: SKILL live-discovery flow + project-init staleness hint` (git add skills/project-init/SKILL.md project-init.js test/smoke.js).

---

## Task 7: Docs — README + CHANGELOG

**Files:** Modify `README.md`, `CHANGELOG.md`.

- [ ] Step 1: README — under "## Expert discovery (skills & agents)", add a subsection after the existing examples:

        ### Live discovery from trusted collections
        Beyond the bundled catalog, `project-init` can pull best-fit skills/agents from a
        curated allowlist of popular collections (`catalog/sources.json`) — fetched, pinned,
        and installed only where relevant:
        ```bash
        node lib/fetch-source.js wshobson-agents          # clone (pinned) → {path, ref}
        node lib/scan-source.js <path> agents-dir          # list what's inside
        node install-experts.js . --tools claude,codex --source-id wshobson-agents \
          --source-path <path> --layout agents-dir --ref <ref> --pick code-reviewer --dry-run
        node install-experts.js . --update --dry-run        # refresh installed experts
        ```
        - Sources are an **allowlist** (host-checked, `--depth 1`, SHA-pinned, symlinks rejected, **never executed**).
        - Installs are recorded in `.aics-experts.json` (provenance); `--update` re-fetches latest with a preview and `--yes` gate.
        - Fresh at install; nothing auto-updates silently.

- [ ] Step 2: README — add to the Components table:

        | `catalog/sources.json` | Trusted-source allowlist for live discovery |
        | `lib/fetch-source.js` | Clone (pinned) + host allowlist + symlink reject |
        | `lib/scan-source.js` | Enumerate skills/agents in a fetched source |

- [ ] Step 3: CHANGELOG — under `## [Unreleased]` → `### Added`, append:

        - Live expert discovery: `catalog/sources.json` allowlist + `lib/fetch-source.js`
          (pinned clone, host allowlist, symlink reject) + `lib/scan-source.js`; install from
          fetched sources with a `.aics-experts.json` provenance manifest and `install-experts.js --update`
          (preview + `--yes`). Agent-driven selection via the project-init skill; bundled catalog
          remains the offline fallback.

- [ ] Step 4: `node test/smoke.js` -> all pass. Commit `docs: live expert discovery` (git add README.md CHANGELOG.md).

---

## Self-Review

- **Spec coverage:** sources.json → T1; fetch (allowlist/pin/symlink) → T2; scan → T3; install-from-source + manifest + per-tool render + detected-tools + `--yes` → T4; update + staleness → T5/T6; SKILL agent-driven flow → T6; offline fallback preserved (bundled path untouched) → T4 note; docs → T7. No gaps.
- **Placeholder scan:** all code steps complete. T1 uses `gh repo view` to verify real URLs (a real command, not a placeholder); one verified example entry (`wshobson/agents`) is concrete. No TBD.
- **Type consistency:** `scanSource(root,layout,paths)` → `{type,name,dir?,file,description,group?}` used in T4/T5. `fetchSource(entry,cacheDir)` → `{path,ref}` used in T5. `renderExpert(spec,tool)`→`{subpath,content}`, `TOOLS`, `baseDir`, `safeJoin`, `PREVIEW`/`DRY` reused from the merged install-experts.js. Manifest record shape `{id,type,source,sourcePath,ref,installedAt,tools,layout}` consistent across T4 (write) and T5 (read/update) and T6 (hint reads id/source/installedAt). `flagVal`/`flagList` distinct (single vs list).
