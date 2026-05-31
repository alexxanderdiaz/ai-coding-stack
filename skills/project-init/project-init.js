#!/usr/bin/env node
/**
 * project-init-agents — self-contained project scaffolder for AI coding tools.
 * No external deps, no ~/.claude requirement.
 *
 * Detects stack from repo files and writes, at the project root: a tailored
 * AGENTS.md (cross-tool source of truth) + CLAUDE.md (pointer, for Claude Code)
 * + STATE.md (continuity log); GEMINI.md too with --gemini (Antigravity). Fills
 * real build/test/lint commands. If the stack is unrecognized, prints a hint to
 * run online skill/agent discovery.
 *
 * Usage:
 *   node project-init-agents.js [dir] [--gemini] [--force] [--about "..."]
 */
const fs = require("fs");
const path = require("path");

const ARGV = process.argv.slice(2);
const GEMINI = ARGV.includes("--gemini");
const FORCE = ARGV.includes("--force");
const ABOUT = (() => { const i = ARGV.indexOf("--about"); return i >= 0 ? (ARGV[i + 1] || "") : ""; })();
const dir = ARGV.find((a, i) => !a.startsWith("--") && ARGV[i - 1] !== "--about") || process.cwd();
const has = (f) => { try { return fs.existsSync(path.join(dir, f)); } catch { return false; } };
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return null; } };
const readText = (f) => { try { return fs.readFileSync(path.join(dir, f), "utf8"); } catch { return ""; } };
// True if any file ending in one of `exts` exists within `maxDepth` levels (skips dot/vendor dirs).
const hasExt = (exts, maxDepth) => {
  const skip = new Set(["node_modules", ".git", ".terraform", "vendor", "dist", "build"]);
  let found = false;
  const walk = (d, depth) => {
    if (found || depth > maxDepth) return;
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      if (found) return;
      if (e.isFile()) { if (exts.some((x) => e.name.endsWith(x))) found = true; }
      else if (e.isDirectory() && !e.name.startsWith(".") && !skip.has(e.name)) walk(path.join(d, e.name), depth + 1);
    }
  };
  walk(dir, 0);
  return found;
};

function detect() {
  const langs = new Set(), fw = new Set(), cmds = {};
  const pkg = has("package.json") ? readJSON("package.json") : null;
  if (pkg) {
    langs.add(has("tsconfig.json") ? "TypeScript" : "JavaScript");
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }, s = pkg.scripts || {};
    for (const k of ["build", "test", "lint", "dev"]) if (s[k]) cmds[k] = `npm run ${k}`;
    if (deps.next) fw.add("Next.js"); else if (deps.react) fw.add("React"); else if (deps.vue) fw.add("Vue");
    if (deps.express || deps.fastify || deps["@nestjs/core"]) fw.add("Node backend");
  }
  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py")) {
    langs.add("Python");
    const py = readText("pyproject.toml") + readText("requirements.txt");
    if (/django/i.test(py)) fw.add("Django"); if (/flask/i.test(py)) fw.add("Flask");
    if (/fastapi/i.test(py)) fw.add("FastAPI"); if (/torch|tensorflow|scikit-learn|pandas/i.test(py)) fw.add("ML/Data");
    cmds.test = cmds.test || "pytest"; cmds.lint = cmds.lint || (/ruff/i.test(py) ? "ruff check ." : "flake8");
  }
  if (has("go.mod")) { langs.add("Go"); cmds.build = cmds.build || "go build ./..."; cmds.test = cmds.test || "go test ./..."; cmds.lint = cmds.lint || "go vet ./..."; }
  if (has("Cargo.toml")) { langs.add("Rust"); cmds.build = "cargo build"; cmds.test = "cargo test"; cmds.lint = "cargo clippy"; }
  if (has("pom.xml")) { langs.add("Java"); cmds.build = "mvn package"; cmds.test = "mvn test"; }
  else if (has("build.gradle") || has("build.gradle.kts")) { langs.add(has("build.gradle.kts") ? "Kotlin" : "Java"); cmds.build = "./gradlew build"; cmds.test = "./gradlew test"; }
  if (has("Dockerfile") || has("docker-compose.yml")) fw.add("Docker");
  if (hasExt([".tf"], 3)) { langs.add("Terraform"); fw.add("Terraform"); cmds.build = cmds.build || "terraform init"; cmds.test = cmds.test || "terraform validate"; cmds.lint = cmds.lint || "terraform fmt -check -recursive"; cmds.dev = cmds.dev || "terraform plan"; }
  if (hasExt([".bicep"], 3)) { langs.add("Bicep"); fw.add("Bicep (Azure)"); cmds.build = cmds.build || "az bicep build --file main.bicep"; cmds.lint = cmds.lint || "az bicep lint --file main.bicep"; }
  if (has("azure.yaml") || has("azure.yml") || has(".azure")) fw.add("Azure (azd)");
  if (hasExt([".sh"], 3)) { langs.add("Shell"); cmds.lint = cmds.lint || "find . -name '*.sh' -exec shellcheck {} +"; }
  return { languages: [...langs], frameworks: [...fw], commands: cmds, isEmpty: langs.size === 0 };
}

function isoDate() { const d = new Date(); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

function main() {
  const pname = path.basename(path.resolve(dir));
  const det = detect();
  const stackList = [...new Set([...det.languages, ...det.frameworks])];
  const stack = stackList.length ? stackList.join(", ") : "(no recognized stack)";
  const cmdLines = Object.entries(det.commands).map(([k, v]) => `- **${k}:** \`${v}\``).join("\n")
    || "<!-- No commands detected; fill in the repo's real build/test/lint -->";

  // Lean, agents.md-2026 best practice: concise (<150 lines), critical rules first,
  // pair each prohibition with an alternative, omit inferable defaults.
  const foot = `\n\n---\nGenerated by project-init (${isoDate()}). Keep it concise (<150 lines) — bloated context lowers agent performance.`;
  const goal = ABOUT ? `\n## Goal\n${ABOUT}\n` : `\n## Goal\n<!-- What is the project and what should it achieve? Fill this in — it's the highest-value context. -->\n`;
  const body = `# ${pname}
> **${pname}** · Stack: ${stack}
${goal}
## Commands
${cmdLines}

## Structure (high level)
<!-- Fill in: key directories and their role. High level — the agent discovers the files. -->

## Non-obvious patterns
<!-- Highest-signal section. Document ONLY what's counterintuitive about this repo (1 real example > 3 paragraphs).
     Pair each prohibition with an alternative: "Don't instantiate X directly → use Y from lib/...". -->

## Permissions / boundaries
- Autonomous: read files, lint, run tests.
- Needs approval: install packages, commit/push, delete files, network or external actions.

## Conventions
- Follow existing patterns, helpers and style before introducing new ones.
- Explicit errors; validate input at boundaries; no hardcoded secrets (env / secret manager).
- Surgical changes; run the repo's checks and report real results.

## Commits / PR
- Conventional commits. Small, focused PRs with a test plan.

## Session continuity
- **"catchup"**: read \`STATE.md\` + \`git log --oneline -15\` + \`git status\`; summarize the last state and propose the next step. Don't change anything until confirmed.
- **"wrapup"**: fully update \`STATE.md\` (Done / In progress / Next / Decisions / Open threads), suggest a commit, confirm. Use before closing.${foot}`;

  const geminiMd = `# ${pname} — Antigravity\n> 📌 **Full context is in \`AGENTS.md\` — read it.** Only Antigravity-specific overrides go here (they take priority over AGENTS.md).\n\n## Antigravity-specific\n<!-- Overrides/preferences only for Antigravity (planning, browser/agent tools). Empty = inherit from AGENTS.md. -->${foot}`;
  const claudeMd = `# CLAUDE.md — ${pname}\n> 📌 **Full project context is in \`AGENTS.md\` — read it first** (goal, commands, structure, patterns, conventions, continuity). Single source of truth; don't duplicate here.${foot}`;

  // CLAUDE.md (Claude Code) + AGENTS.md (cross-tool source) always; GEMINI.md only with --gemini.
  const targets = [["AGENTS.md", body], ["CLAUDE.md", claudeMd]];
  if (GEMINI) targets.push(["GEMINI.md", geminiMd]);

  for (const [name, content] of targets) {
    const f = path.join(dir, name);
    if (fs.existsSync(f) && !FORCE) { console.log(`>> ${name} already exists (left untouched; --force to overwrite)`); continue; }
    fs.writeFileSync(f, content); console.log(`>> ${name} written`);
  }
  // Seed STATE.md (continuity log) if missing.
  const st = path.join(dir, "STATE.md");
  if (!fs.existsSync(st)) {
    fs.writeFileSync(st, `# STATE — ${pname}\n> Continuity log. When you return, type **catchup** and the agent reads this + git and brings you up to speed.\n\n## Current state\nProject just started${ABOUT ? ": " + ABOUT : ""}.\n\n## Done\n-\n\n## In progress\n-\n\n## Next\n-\n\n## Decisions / key context\n-\n\n## Open threads / questions\n-\n\n---\nUpdate this at the end of each work block.\n`);
    console.log(">> STATE.md (continuity log) written");
  }
  if (stackList.length) console.log(`>> Detected stack: ${stackList.join(", ")} | commands: ${Object.keys(det.commands).join(",") || "none"}`);
  if (det.isEmpty) console.log(`>> Stack not recognized — run discovery (see SKILL.md): search online for skills/agents for this domain and propose them.`);
}

main();
