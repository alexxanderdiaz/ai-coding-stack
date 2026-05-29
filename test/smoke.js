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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
