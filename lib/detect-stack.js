#!/usr/bin/env node
/**
 * detect-stack — inspect a project dir and infer language, frameworks,
 * real build/test/lint/dev commands, and a suggested project-init profile.
 * Pure Node, cross-platform. Used by project-init.js (and standalone).
 *
 * Usage (standalone):  node detect-stack.js [projectDir]
 * Module:              const { detectStack } = require('./detect-stack.js'); detectStack(dir)
 */
const fs = require("fs");
const path = require("path");

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function readText(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }

function detectStack(dir) {
  dir = dir || process.cwd();
  const has = (f) => exists(path.join(dir, f));
  const langs = new Set();
  const frameworks = new Set();
  const cmds = {};
  let profile = "generic";

  // --- Node / JS / TS ---
  const pkg = has("package.json") ? readJSON(path.join(dir, "package.json")) : null;
  if (pkg) {
    langs.add(has("tsconfig.json") ? "TypeScript" : "JavaScript");
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const s = pkg.scripts || {};
    for (const k of ["build", "test", "lint", "dev", "start"]) if (s[k]) cmds[k === "start" ? "dev" : k] = `npm run ${k}`;
    if (deps.next) { frameworks.add("Next.js"); profile = "frontend"; }
    else if (deps.react) { frameworks.add("React"); profile = "frontend"; }
    else if (deps.vue) { frameworks.add("Vue"); profile = "frontend"; }
    else if (deps.express || deps.fastify || deps["@nestjs/core"]) { frameworks.add("Node backend"); profile = "backend"; }
  }

  // --- Python ---
  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py") || has("Pipfile")) {
    langs.add("Python");
    if (profile === "generic") profile = "python";
    const py = readText(path.join(dir, "pyproject.toml")) + readText(path.join(dir, "requirements.txt"));
    if (/django/i.test(py)) { frameworks.add("Django"); profile = "backend"; }
    if (/flask/i.test(py)) { frameworks.add("Flask"); profile = "backend"; }
    if (/fastapi/i.test(py)) { frameworks.add("FastAPI"); profile = "backend"; }
    if (/torch|tensorflow|scikit-learn|pandas/i.test(py)) { frameworks.add("ML/Data"); profile = "data"; }
    cmds.test = cmds.test || "pytest";
    cmds.lint = cmds.lint || (/ruff/i.test(py) ? "ruff check ." : "flake8");
  }

  // --- Go ---
  if (has("go.mod")) { langs.add("Go"); if (profile === "generic") profile = "backend"; cmds.build = cmds.build || "go build ./..."; cmds.test = cmds.test || "go test ./..."; cmds.lint = cmds.lint || "go vet ./..."; }
  // --- Rust ---
  if (has("Cargo.toml")) { langs.add("Rust"); if (profile === "generic") profile = "backend"; cmds.build = "cargo build"; cmds.test = "cargo test"; cmds.lint = "cargo clippy"; }
  // --- Java / Kotlin ---
  if (has("pom.xml")) { langs.add("Java"); profile = "backend"; cmds.build = "mvn package"; cmds.test = "mvn test"; }
  else if (has("build.gradle") || has("build.gradle.kts")) { langs.add(has("build.gradle.kts") ? "Kotlin" : "Java"); profile = "backend"; cmds.build = "./gradlew build"; cmds.test = "./gradlew test"; }
  // --- Infra / DevOps ---
  if (has("Dockerfile") || has("docker-compose.yml") || has("compose.yaml")) frameworks.add("Docker");
  if (has("main.tf") || exists(path.join(dir, "terraform"))) { frameworks.add("Terraform"); if (profile === "generic") profile = "devops"; }
  if (exists(path.join(dir, ".github", "workflows"))) frameworks.add("GitHub Actions");

  return {
    dir,
    languages: [...langs],
    frameworks: [...frameworks],
    commands: cmds,                 // {build,test,lint,dev} — only those found
    suggestedProfile: profile,
    isEmpty: langs.size === 0,      // no recognizable stack -> trigger discovery
  };
}

module.exports = { detectStack };

if (require.main === module) {
  const r = detectStack(process.argv[2]);
  console.log(JSON.stringify(r, null, 2));
}
