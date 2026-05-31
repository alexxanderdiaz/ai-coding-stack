/**
 * tui — tiny dependency-free arrow-key menus with a non-TTY fallback.
 * selectOne(title, items) -> value ; selectMany(title, items) -> [values]
 * items: [{ label, value, hint }]. Respects NO_COLOR. Falls back to a numbered
 * readline prompt when stdin/stdout isn't a TTY (pipes, CI, some SSH sessions).
 */
const readline = require("readline");

const A = { reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m", cyan: "\x1b[36m", green: "\x1b[32m" };
const NO_COLOR = !!process.env.NO_COLOR;
const col = (code, s) => (NO_COLOR ? s : code + s + A.reset);

function isInteractive() { return Boolean(process.stdin.isTTY && process.stdout.isTTY); }

function ask(question) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); res(a); });
  });
}

async function selectOne(title, items) {
  if (!isInteractive()) {
    console.log("\n" + title);
    items.forEach((it, i) => console.log(`  ${i + 1}) ${it.label}${it.hint ? " — " + it.hint : ""}`));
    const a = (await ask(`Choice [1-${items.length}]: `)).trim();
    const idx = Math.min(Math.max(0, (parseInt(a, 10) || 1) - 1), items.length - 1);
    return items[idx].value;
  }
  const sel = await rawMenu(title, items, false);
  return items[sel[0]].value;
}

async function selectMany(title, items) {
  if (!isInteractive()) {
    console.log("\n" + title);
    items.forEach((it, i) => console.log(`  ${i + 1}) ${it.label}${it.hint ? " — " + it.hint : ""}`));
    const a = (await ask(`Select (comma list, or 'all'): `)).trim();
    if (!a || a.toLowerCase() === "all") return items.map((it) => it.value);
    const idxs = a.split(",").map((s) => parseInt(s.trim(), 10) - 1).filter((n) => n >= 0 && n < items.length);
    return (idxs.length ? idxs : items.map((_, i) => i)).map((i) => items[i].value);
  }
  const sel = await rawMenu(title, items, true);
  return sel.map((i) => items[i].value);
}

function rawMenu(title, items, multi) {
  return new Promise((resolve) => {
    let cur = 0;
    const chosen = new Set();
    let drawn = 0;
    const help = multi
      ? col(A.dim, "↑/↓ move · space toggle · a all · enter confirm")
      : col(A.dim, "↑/↓ move · 1-9 jump · enter select");
    const lines = () => {
      const out = ["", col(A.bold + A.cyan, title), ""];
      items.forEach((it, i) => {
        const ptr = i === cur ? col(A.cyan, "❯") : " ";
        const box = multi ? (chosen.has(i) ? col(A.green, "◉") : "◯") + " " : "";
        const label = i === cur ? col(A.bold, it.label) : it.label;
        const hint = it.hint ? "  " + col(A.dim, it.hint) : "";
        out.push(` ${ptr} ${box}${label}${hint}`);
      });
      out.push("", " " + help);
      return out;
    };
    const render = () => {
      if (drawn) process.stdout.write(`\x1b[${drawn}A`);
      const ls = lines();
      process.stdout.write(ls.map((l) => "\x1b[2K" + l).join("\n") + "\n");
      drawn = ls.length;
    };
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write(A.reset);
    };
    const onData = (buf) => {
      const k = buf.toString();
      if (k === "\x03") { cleanup(); process.exit(130); }                 // ctrl-c
      else if (k === "\x1b[A" || k === "k") { cur = (cur - 1 + items.length) % items.length; render(); }
      else if (k === "\x1b[B" || k === "j") { cur = (cur + 1) % items.length; render(); }
      else if (multi && k === " ") { chosen.has(cur) ? chosen.delete(cur) : chosen.add(cur); render(); }
      else if (multi && (k === "a" || k === "A")) {
        if (chosen.size === items.length) chosen.clear(); else items.forEach((_, i) => chosen.add(i));
        render();
      } else if (/^[1-9]$/.test(k)) {
        const n = +k - 1;
        if (n < items.length) { if (multi) { chosen.has(n) ? chosen.delete(n) : chosen.add(n); } else cur = n; render(); }
      } else if (k === "\r" || k === "\n") {
        if (multi && chosen.size === 0) chosen.add(cur);                  // default to highlighted
        cleanup();
        resolve(multi ? [...chosen].sort((a, b) => a - b) : [cur]);
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    render();
    process.stdin.on("data", onData);
  });
}

module.exports = { selectOne, selectMany, isInteractive };
