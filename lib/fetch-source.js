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
  return u.protocol === "https:" && u.hostname === host && u.port === "" && ALLOWED_HOSTS.has(host);
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
  if (!entry.id || !/^[A-Za-z0-9_-]+$/.test(entry.id)) throw new Error("invalid source id: " + entry.id);
  const root = cacheDir || cacheRoot();
  const dest = path.join(root, entry.id);
  if (dest !== path.join(root, path.basename(dest)) || !path.resolve(dest).startsWith(path.resolve(root) + path.sep)) throw new Error("dest escapes cache root: " + dest);
  fs.mkdirSync(root, { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
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
