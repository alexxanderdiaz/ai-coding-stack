#!/usr/bin/env node
/**
 * Claude Stop hook — refresh a git-based AUTO-SNAPSHOT block in ./STATE.md.
 * Deterministic + idempotent (replaces the block, no growth). Guarantees the
 * project state is captured at session end even if the agent forgot to update
 * the narrative sections. No-op outside a project-init'd git project.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const cwd = process.cwd();
const stateFile = path.join(cwd, "STATE.md");
if (!fs.existsSync(stateFile)) process.exit(0); // only projects scaffolded by project-init

function git(args) {
  try { return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return ""; }
}
if (git(["rev-parse", "--is-inside-work-tree"]) !== "true") process.exit(0);

const d = new Date();
const p = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "-";
const log = git(["log", "--oneline", "-5"]) || "(sin commits)";
const changed = git(["status", "--porcelain"]).split("\n").filter(Boolean).length;

const block = `<!-- AUTO-SNAPSHOT:start -->
## Snapshot automático (${stamp})
- Branch: \`${branch}\` · cambios sin commit: ${changed}
- Últimos commits:
\`\`\`
${log}
\`\`\`
<!-- AUTO-SNAPSHOT:end -->`;

let txt = fs.readFileSync(stateFile, "utf8");
const re = /<!-- AUTO-SNAPSHOT:start -->[\s\S]*?<!-- AUTO-SNAPSHOT:end -->/;
txt = re.test(txt) ? txt.replace(re, block) : (txt.trimEnd() + "\n\n" + block + "\n");
try { fs.writeFileSync(stateFile, txt); } catch {}
process.exit(0);
