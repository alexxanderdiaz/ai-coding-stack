# Tool Selector + Expert Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users install any subset of the three AI tools, and have `project-init` discover + install best-fit skills/agents (rendered to each tool's native format) based on the project's stack and purpose.

**Architecture:** Plain Node, no deps. `ensure-tools.js`/`setup.js` gain multi-tool selection. A bundled `catalog/` of canonical expert specs is matched against the detected stack + `--about` text by `lib/match-experts.js`, rendered per-tool by `lib/render-expert.js`, and installed by `install-experts.js` into the selected tools (Claude/Antigravity project-local, Codex global). Discovery is opt-in and always confirmed.

**Tech Stack:** Node.js (CommonJS), execFileSync, JSON catalog, Markdown/TOML rendering. Test runner: `node test/smoke.js` (custom `ok`/`bad` assertions, no framework).

See the design spec: `docs/superpowers/specs/2026-05-29-tool-selector-and-expert-discovery-design.md`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `ensure-tools.js` | accept tool list (`claude,codex` / multiple positionals) | Modify |
| `setup.js` | tool sub-prompt + `--tools <list>`; pass `--with-experts` to init | Modify |
| `setup.ps1` | `-Tools <list>` passthrough | Modify |
| `catalog/catalog.json` | expert registry | Create |
| `catalog/specs/*.md` | 6 canonical expert specs | Create |
| `lib/match-experts.js` | (catalog, detection, about) -> ranked experts | Create |
| `lib/render-expert.js` | spec -> per-tool {subpath, content} | Create |
| `install-experts.js` | render + write experts into selected tools | Create |
| `project-init.js` | `--with-experts` passthrough hint | Modify |
| `skills/project-init/SKILL.md` | wire discovery with approval | Modify |
| `test/smoke.js` | extended coverage | Modify |
| `README.md` / `CHANGELOG.md` | document the feature | Modify |
| (private) `claude-win-migration/ensure-tools.js`, `setup.js` | multi-tool selection | Modify |

Tool base dirs (used by install-experts.js):
- claude -> <projectDir>/.claude (subdirs agents/, skills/)
- antigravity -> <projectDir>/.agent (subdirs workflows/, skills/)
- codex -> <os.homedir()>/.codex (subdirs agents/, skills/)

---

## Task 1: ensure-tools.js -- accept a tool list

Files: Modify `ensure-tools.js:107-110`; Test `test/smoke.js`.

- [ ] Step 1: append failing test to test/smoke.js before the summary line:

    // 5. ensure-tools accepts a comma list (CHECK only, no install)
    console.log("\nensure-tools selection:");
    try {
      const out = execFileSync("node", [path.join(ROOT, "ensure-tools.js"), "claude,codex", "--check"], { encoding: "utf8" });
      out.includes("== claude ==") ? ok("selects claude") : bad("claude not selected");
      out.includes("== codex ==") ? ok("selects codex") : bad("codex not selected");
      !out.includes("== antigravity ==") ? ok("excludes antigravity") : bad("antigravity wrongly included");
    } catch (e) { bad("ensure-tools list threw: " + e.message); }

- [ ] Step 2: run `node test/smoke.js` -> FAIL (claude,codex is one unknown tool).
- [ ] Step 3: replace ensure-tools.js:107-110 with:

    const positional = ARGV.filter(a => !a.startsWith("--"));
    let tools = positional.flatMap(a => a.split(",")).map(s => s.trim()).filter(Boolean);
    if (!tools.length || tools.includes("all")) tools = Object.keys(REG);
    tools = [...new Set(tools)];
    log(`ensure-tools (${process.platform}) -- ${CHECK ? "CHECK only" : "install missing"}`);
    for (const t of tools) ensureTool(t);

  Keep the log line exactly once (remove old duplicate at line 108).
- [ ] Step 4: run `node test/smoke.js` -> PASS.
- [ ] Step 5: commit `feat: ensure-tools accepts a comma-separated tool list` (git add ensure-tools.js test/smoke.js).

---

## Task 2: setup.js -- tool sub-prompt and --tools <list>

Files: Modify setup.js (lines 26-61); Test test/smoke.js.

- [ ] Step 1: append failing test before the summary:

    // 6. setup.js --tools <list> forwards the selection to ensure-tools
    console.log("\nsetup selection:");
    try {
      const out = execFileSync("node", [path.join(ROOT, "setup.js"), "--tools", "claude", "--check-tools"], { encoding: "utf8" });
      out.includes("== claude ==") ? ok("setup forwards claude") : bad("setup did not forward claude");
      !out.includes("== antigravity ==") ? ok("setup limits to selection") : bad("setup forwarded extra tools");
    } catch (e) { bad("setup --tools threw: " + e.message); }

- [ ] Step 2: run -> FAIL (--tools value ignored; no --check-tools).
- [ ] Step 3: replace setup.js from `function authNotes()` (line 26) to EOF with:

    const TOOL_NAMES = { "1": "claude", "2": "codex", "3": "antigravity" };
    function parseToolList() {
      const i = ARGV.indexOf("--tools");
      if (i < 0) return "all";
      const v = ARGV[i + 1];
      return (v && !v.startsWith("--")) ? v : "all";
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
        claude: "  - Claude Code : run `claude` -> `/login`",
        codex: "  - Codex       : run `codex login`",
        antigravity: "  - Antigravity : open the app -> sign in with Google",
      };
      console.log("\nNext -- authenticate each tool with YOUR account:");
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
    else if (ARGV.includes("--all")) dispatch("all", "all");
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

  Remove the original authNotes/doTools/dispatch/passInit and old menu (lines 26-61). Keep HERE/ARGV/run() (lines 18-24).
- [ ] Step 4: run -> PASS.
- [ ] Step 5: commit `feat: setup.js tool selection (menu sub-prompt + --tools list)`.

---

## Task 3: setup.ps1 -- -Tools <list>

Files: Modify setup.ps1.

- [ ] Step 1: replace lines 1-3 with a header + `param([string]$Tools)` + ErrorActionPreference + `$Here`. Replace final line `node "$Here\setup.js" $args` with:

    $forward = @($args)
    if ($Tools) { $forward = @("--tools", $Tools) + $forward }
    node "$Here\setup.js" @forward

- [ ] Step 2: Windows-only manual parse check; macOS/Linux visual confirm.
- [ ] Step 3: commit `feat: setup.ps1 -Tools parameter for subset install`.

---

## Task 4: catalog/catalog.json + 6 specs

Files: Create catalog/catalog.json + catalog/specs/{code-reviewer,frontend-pro,api-backend-pro,python-pro,ml-data-pro,devops-infra-pro}.md.

- [ ] Step 1: write catalog/catalog.json (version 1; experts array). Each entry: id, kind(agent|skill), profiles[], languages[], frameworks[], keywords[], description, spec, source{type:"bundled"}. Values:
  - code-reviewer: agent, profiles ["*"], keywords [review,quality,security,audit]
  - frontend-pro: skill, profiles [frontend], frameworks [React,Next.js,Vue], keywords [frontend,ui,component,css,accessibility]
  - api-backend-pro: skill, profiles [backend], languages [Go], frameworks [Node backend,Django,Flask,FastAPI], keywords [api,backend,endpoint,rest,server,database]
  - python-pro: skill, profiles [python], languages [Python], keywords [python,pytest,typing,packaging]
  - ml-data-pro: skill, profiles [data], frameworks [ML/Data], keywords [ml,data,training,model,pandas,notebook]
  - devops-infra-pro: skill, profiles [devops], frameworks [Docker,Terraform,GitHub Actions], keywords [devops,infra,ci,deploy,docker,terraform,pipeline]
- [ ] Step 2: write the 6 spec files. Full bodies are in the design spec (Feature 2 -> Catalog -> Step 2). Frontmatter per file: id, kind, description, optional tools. code-reviewer has tools `Read, Grep, Glob, Bash`.
- [ ] Step 3: verify `node -e "require('./catalog/catalog.json'); console.log('catalog ok')"` -> `catalog ok`.
- [ ] Step 4: commit `feat: add expert catalog and 6 canonical specs`.

---

## Task 5: lib/match-experts.js

Files: Create lib/match-experts.js; Test test/smoke.js.

- [ ] Step 1: append failing test before summary:

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

- [ ] Step 2: run -> FAIL (module missing).
- [ ] Step 3: implement lib/match-experts.js:

    function matchExperts(catalog, detection, aboutText) {
      const det = detection || {};
      const profile = det.suggestedProfile || "generic";
      const langs = (det.languages || []).map(s => s.toLowerCase());
      const fws = (det.frameworks || []).map(s => s.toLowerCase());
      const about = (aboutText || "").toLowerCase();
      const out = [];
      for (const e of (catalog.experts || [])) {
        let score = 0;
        const profiles = e.profiles || [];
        if (profiles.includes("*")) score += 1;
        if (profiles.includes(profile)) score += 3;
        for (const l of (e.languages || [])) if (langs.includes(l.toLowerCase())) score += 2;
        for (const f of (e.frameworks || [])) if (fws.includes(f.toLowerCase())) score += 2;
        for (const k of (e.keywords || [])) if (about.includes(k.toLowerCase())) score += 1;
        if (score > 0) out.push({ ...e, score });
      }
      const seen = new Set();
      return out.sort((a, b) => b.score - a.score).filter(e => (seen.has(e.id) ? false : seen.add(e.id)));
    }
    module.exports = { matchExperts };
    if (require.main === module) {
      const path = require("path");
      const catalog = require(path.join(__dirname, "..", "catalog", "catalog.json"));
      const { detectStack } = require(path.join(__dirname, "detect-stack.js"));
      const det = detectStack(process.argv[2]);
      const about = process.argv.slice(3).join(" ");
      console.log(JSON.stringify(matchExperts(catalog, det, about).map(e => ({ id: e.id, kind: e.kind, score: e.score })), null, 2));
    }

- [ ] Step 4: run -> PASS.
- [ ] Step 5: commit `feat: match-experts ranks catalog by stack and purpose`.

---

## Task 6: lib/render-expert.js

Files: Create lib/render-expert.js; Test test/smoke.js.

- [ ] Step 1: append failing test before summary:

    // 8. render-expert produces per-tool native formats
    console.log("\nrender-expert:");
    try {
      const { parseSpec, renderExpert } = require(path.join(ROOT, "lib", "render-expert.js"));
      const spec = parseSpec(fs.readFileSync(path.join(ROOT, "catalog", "specs", "code-reviewer.md"), "utf8"));
      spec.meta.id === "code-reviewer" && spec.meta.kind === "agent" ? ok("parseSpec reads frontmatter") : bad("parseSpec frontmatter wrong");
      const cl = renderExpert(spec, "claude");
      cl.subpath === "agents/code-reviewer.md" && cl.content.startsWith("---") && cl.content.includes("name: code-reviewer") ? ok("claude agent .md") : bad("claude render wrong");
      const cx = renderExpert(spec, "codex");
      cx.subpath === "agents/code-reviewer.toml" && cx.content.includes('name = "code-reviewer"') && cx.content.includes("instructions = '''") ? ok("codex agent .toml") : bad("codex render wrong");
      const ag = renderExpert(spec, "antigravity");
      ag.subpath === "workflows/code-reviewer.md" ? ok("antigravity workflow .md") : bad("antigravity render wrong");
      const skillSpec = parseSpec(fs.readFileSync(path.join(ROOT, "catalog", "specs", "python-pro.md"), "utf8"));
      renderExpert(skillSpec, "claude").subpath === "skills/python-pro/SKILL.md" ? ok("skill -> SKILL.md") : bad("skill subpath wrong");
    } catch (e) { bad("render-expert threw: " + e.message); }

- [ ] Step 2: run -> FAIL (module missing).
- [ ] Step 3: implement lib/render-expert.js:

    function parseSpec(text) {
      const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
      if (!m) return { meta: {}, body: text.trim() };
      const meta = {};
      for (const line of m[1].split("\n")) {
        const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
        if (kv) meta[kv[1]] = kv[2].trim();
      }
      return { meta, body: m[2].trim() };
    }
    function tomlString(s) {
      return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").trim() + '"';
    }
    function skillFile(meta, body) {
      return `---\nname: ${meta.id}\ndescription: ${meta.description || ""}\n---\n\n${body}\n`;
    }
    function renderExpert(spec, tool) {
      const { meta, body } = spec;
      const id = meta.id;
      const isAgent = meta.kind === "agent";
      if (!isAgent) return { subpath: `skills/${id}/SKILL.md`, content: skillFile(meta, body) };
      if (tool === "claude") {
        const fm = ["---", `name: ${id}`, `description: ${meta.description || ""}`];
        if (meta.tools) fm.push(`tools: ${meta.tools}`);
        fm.push("---");
        return { subpath: `agents/${id}.md`, content: `${fm.join("\n")}\n\n${body}\n` };
      }
      if (tool === "codex") {
        const lines = [`name = ${tomlString(id)}`, `description = ${tomlString(meta.description || "")}`, `instructions = '''\n${body}\n'''`];
        return { subpath: `agents/${id}.toml`, content: lines.join("\n") + "\n" };
      }
      if (tool === "antigravity") {
        return { subpath: `workflows/${id}.md`, content: `---\ndescription: ${meta.description || ""}\n---\n\n${body}\n` };
      }
      throw new Error(`unknown tool: ${tool}`);
    }
    module.exports = { parseSpec, renderExpert, tomlString };

- [ ] Step 4: run -> PASS.
- [ ] Step 5: commit `feat: render-expert converts specs to per-tool native formats`.

---

## Task 7: install-experts.js

Files: Create install-experts.js; Test test/smoke.js.

- [ ] Step 1: append failing test before summary:

    // 9. install-experts writes rendered experts into a temp project (claude/antigravity local)
    console.log("\ninstall-experts:");
    const itmp = fs.mkdtempSync(path.join(os.tmpdir(), "aics-exp-"));
    try {
      const dry = execFileSync("node", [path.join(ROOT, "install-experts.js"), itmp, "--tools", "claude", "--experts", "code-reviewer", "--dry-run"], { encoding: "utf8" });
      dry.includes("agents/code-reviewer.md") ? ok("dry-run lists claude agent path") : bad("dry-run path missing");
      !fs.existsSync(path.join(itmp, ".claude", "agents", "code-reviewer.md")) ? ok("dry-run writes nothing") : bad("dry-run wrote files");
      execFileSync("node", [path.join(ROOT, "install-experts.js"), itmp, "--tools", "claude,antigravity", "--experts", "code-reviewer,python-pro"], { stdio: "ignore" });
      fs.existsSync(path.join(itmp, ".claude", "agents", "code-reviewer.md")) ? ok("claude agent written") : bad("claude agent missing");
      fs.existsSync(path.join(itmp, ".agent", "workflows", "code-reviewer.md")) ? ok("antigravity workflow written") : bad("antigravity workflow missing");
      fs.existsSync(path.join(itmp, ".claude", "skills", "python-pro", "SKILL.md")) ? ok("claude skill written") : bad("claude skill missing");
      fs.existsSync(path.join(itmp, ".agent", "skills", "python-pro", "SKILL.md")) ? ok("antigravity skill written") : bad("antigravity skill missing");
    } catch (e) { bad("install-experts threw: " + e.message); }
    fs.rmSync(itmp, { recursive: true, force: true });

- [ ] Step 2: run -> FAIL (module missing).
- [ ] Step 3: implement install-experts.js:

    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const { parseSpec, renderExpert } = require(path.join(__dirname, "lib", "render-expert.js"));
    const ARGV = process.argv.slice(2);
    const DRY = ARGV.includes("--dry-run");
    const FORCE = ARGV.includes("--force");
    const CATALOG_DIR = path.join(__dirname, "catalog");
    const ALL_TOOLS = ["claude", "codex", "antigravity"];
    function flagList(name) {
      const i = ARGV.indexOf(name);
      if (i < 0) return [];
      const v = ARGV[i + 1];
      if (!v || v.startsWith("--")) return [];
      return v.split(",").map(s => s.trim()).filter(Boolean);
    }
    function baseDir(tool, projectDir) {
      if (tool === "claude") return path.join(projectDir, ".claude");
      if (tool === "antigravity") return path.join(projectDir, ".agent");
      if (tool === "codex") return path.join(os.homedir(), ".codex");
      throw new Error(`unknown tool: ${tool}`);
    }
    function main() {
      const projectDir = path.resolve(ARGV.find((a, i) => !a.startsWith("--") && ARGV[i - 1] !== "--tools" && ARGV[i - 1] !== "--experts") || process.cwd());
      let tools = flagList("--tools");
      if (!tools.length || tools.includes("all")) tools = ALL_TOOLS;
      tools = [...new Set(tools)].filter(t => ALL_TOOLS.includes(t));
      const ids = flagList("--experts");
      const catalog = require(path.join(CATALOG_DIR, "catalog.json"));
      const byId = Object.fromEntries(catalog.experts.map(e => [e.id, e]));
      if (!ids.length) { console.log("No experts selected. Pass --experts id1,id2"); return; }
      console.log(`install-experts -> tools: ${tools.join(", ")} | experts: ${ids.join(", ")}${DRY ? " (dry-run)" : ""}`);
      for (const id of ids) {
        const entry = byId[id];
        if (!entry) { console.log(`  ! unknown expert: ${id}`); continue; }
        if (!entry.source || entry.source.type !== "bundled") { console.log(`  ! ${id}: only bundled specs supported in this version`); continue; }
        const spec = parseSpec(fs.readFileSync(path.join(CATALOG_DIR, entry.spec), "utf8"));
        for (const tool of tools) {
          const { subpath, content } = renderExpert(spec, tool);
          const dest = path.join(baseDir(tool, projectDir), subpath);
          const where = tool === "codex" ? "~/.codex" : (tool === "claude" ? ".claude" : ".agent");
          if (DRY) { console.log(`  would write [${tool}] ${where}/${subpath}`); continue; }
          if (fs.existsSync(dest) && !FORCE) { console.log(`  = [${tool}] ${subpath} exists (kept; --force to overwrite)`); continue; }
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, content);
          console.log(`  + [${tool}] ${where}/${subpath}`);
        }
      }
      console.log("Done. Review the generated files before relying on them.");
    }
    if (require.main === module) main();

- [ ] Step 4: run -> PASS.
- [ ] Step 5: commit `feat: install-experts renders + installs experts per selected tool`.

---

## Task 8: project-init --with-experts hint + skill wiring

Files: Modify project-init.js (inside main, after the Ready log); modify skills/project-init/SKILL.md.

- [ ] Step 1: insert in project-init.js after the Ready console.log and before main()'s closing brace:

    if (ARGV.includes("--with-experts")) {
      const ids = (() => {
        try {
          const catalog = require(path.join(__dirname, "catalog", "catalog.json"));
          const { matchExperts } = require(path.join(__dirname, "lib", "match-experts.js"));
          return matchExperts(catalog, det, ABOUT).map(e => e.id);
        } catch { return []; }
      })();
      if (ids.length) {
        console.log(`>> Suggested experts for this stack: ${ids.join(", ")}`);
        console.log(`>> Install (after review): node install-experts.js . --tools <claude,codex,antigravity> --experts ${ids.join(",")}`);
      }
    }

- [ ] Step 2: verify hint:

    T=$(mktemp -d); printf 'module demo\ngo 1.22\n' > "$T/go.mod"; node project-init.js "$T" --about "rest api" --with-experts --force; rm -rf "$T"

  Expected: includes `Suggested experts for this stack:` with api-backend-pro + code-reviewer.
- [ ] Step 3: SKILL.md -> set `allowed-tools: Bash(node:*), Bash(ls:*), Bash(cat:*)` and replace step 5 with the approval-gated discovery flow (get ids via --with-experts or match-experts.js; refine from --about; pick installed tools via ensure-tools --check; dry-run; show plan + confirm; install; never install unvetted third-party without approval).
- [ ] Step 4: run `node test/smoke.js` -> PASS.
- [ ] Step 5: commit `feat: project-init --with-experts suggestions + skill discovery flow`.

---

## Task 9: Docs -- README + CHANGELOG

Files: Modify README.md, CHANGELOG.md.

- [ ] Step 1: README Quickstart "Direct, no menu" add: `node setup.js --tools claude,codex   # install only a subset`.
- [ ] Step 2: README new "## Expert discovery (skills & agents)" section after project-init-in-detail: the 3 example commands (--with-experts, install --dry-run, install) + 4 bullets (bundled vetted catalog offline; per-tool render paths; claude/antigravity project-local vs codex global; review files / --dry-run / --force).
- [ ] Step 3: README Components table add rows: catalog/, lib/match-experts.js, lib/render-expert.js, install-experts.js.
- [ ] Step 4: CHANGELOG Unreleased -> Added: tool selection (subset install across setup/ensure-tools/ps1) + expert discovery (catalog + match/render/install + project-init --with-experts + approval-gated skill).
- [ ] Step 5: run `node test/smoke.js` -> PASS; commit `docs: tool selection and expert discovery`.

---

## Task 10: Private repo -- multi-tool selection

Files: Modify /Users/adiaz/claude-win-migration/ensure-tools.js and setup.js.

- [ ] Step 1: ensure-tools (private): if tail matches public single-target form, apply same replacement as Task 1 Step 3. Verify `node /Users/adiaz/claude-win-migration/ensure-tools.js claude,codex --check` prints claude+codex, not antigravity.
- [ ] Step 2: setup.js (private): replace dispatch + menu (lines 54-70) with list-accepting dispatch + numbersToTools + comma-list menu:

    function dispatch(choice) {
      const keys = choice === "all" ? Object.keys(TOOLS) : choice.split(",").map(s => s.trim());
      const valid = keys.filter(k => TOOLS[k]);
      if (!valid.length) { console.error(`tool desconocido: ${choice} (claude | codex | antigravity | all | lista)`); process.exit(1); }
      for (const k of valid) runTool(k);
    }
    function numbersToTools(ans) {
      const map = { "1": "claude", "2": "codex", "3": "antigravity", "4": "all" };
      const a = ans.trim();
      if (!a) return "claude";
      if (a === "4" || a.toLowerCase() === "all") return "all";
      const keys = a.split(",").map(s => map[s.trim()] || s.trim()).filter(k => k && k !== "all");
      return keys.length ? keys.join(",") : "claude";
    }
    const tool = getFlag("--tool");
    if (tool) { dispatch(tool); }
    else {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      console.log("\n¿Qué quieres configurar? (lista separada por comas o 4=Todos)\n  1) Claude Code\n  2) Codex\n  3) Antigravity\n  4) Todos\n  ej: \"1,2\"");
      rl.question("Opción: ", (ans) => { rl.close(); dispatch(numbersToTools(ans)); });
    }

  Update top usage comment to mention `--tool claude,codex`.
- [ ] Step 3: verify `node /Users/adiaz/claude-win-migration/setup.js --tool claude,codex --no-tools --dry-run` dispatches claude then codex, never antigravity (installer errors OK).
- [ ] Step 4: commit in private repo `feat: select a subset of tools to configure (--tool list / menu)`.

---

## Self-Review

- Spec coverage: selector -> Tasks 1,2,3,10; discovery -> 4,5,6,7,8; security (opt-in/confirm/bundled-only/dry-run) -> 7,8; codex-global nuance -> 7 + README 9; testing -> every code task. No gaps.
- Placeholder scan: all code steps have full code. Task 4 Step 2 / Task 8 Step 3 reference the design spec for verbatim bodies but give exact structure; not TBD.
- Type consistency: matchExperts -> {id,kind,score} (5,7,8); renderExpert -> {subpath,content} (6,7); parseSpec -> {meta,body} (6,7); frontmatter keys id/kind/description/tools consistent (4,6).
