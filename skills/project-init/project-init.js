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
  return { languages: [...langs], frameworks: [...fw], commands: cmds, isEmpty: langs.size === 0 };
}

function isoDate() { const d = new Date(); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

function main() {
  const pname = path.basename(path.resolve(dir));
  const det = detect();
  const stackList = [...new Set([...det.languages, ...det.frameworks])];
  const stack = stackList.length ? stackList.join(", ") : "(sin stack reconocido)";
  const cmdLines = Object.entries(det.commands).map(([k, v]) => `- **${k}:** \`${v}\``).join("\n")
    || "<!-- No se detectaron comandos; define build/test/lint reales del repo -->";

  // Lean, best-practice 2026 (agents.md): conciso (<150 líneas), reglas críticas
  // primero, emparejar prohibición con alternativa, omitir defaults inferibles.
  const foot = `\n\n---\nGenerado por project-init (${isoDate()}). Mantenlo conciso (<150 líneas) — el contexto inflado baja el rendimiento del agente.`;
  const objetivo = ABOUT ? `\n## Objetivo\n${ABOUT}\n` : `\n## Objetivo\n<!-- ¿De qué va el proyecto y qué se quiere lograr? Llénalo — es el contexto de mayor valor. -->\n`;
  const body = `# ${pname}
> Proyecto **${pname}** · Stack: ${stack}
${objetivo}
## Comandos
${cmdLines}

## Estructura (alto nivel)
<!-- Llena: directorios clave y su rol. Alto nivel — el agente descubre los archivos. -->

## Patrones no-obvios
<!-- Sección de mayor señal. Documenta SOLO lo contraintuitivo del repo (1 ejemplo real > 3 párrafos).
     Empareja prohibición con alternativa: "No instancies X directo → usa Y de lib/...". -->

## Permisos / límites
- Autónomo: leer archivos, lint, correr tests.
- Requiere aprobación: instalar paquetes, commit/push, borrar archivos, acciones de red o externas.

## Convenciones
- Sigue patrones, helpers y estilo existentes antes de introducir nuevos.
- Errores explícitos; valida input en los límites; sin secretos hardcodeados (env / secret manager).
- Cambios quirúrgicos; corre los checks del repo y reporta resultados reales.

## Commits / PR
- Conventional commits. PR pequeño y enfocado, con test plan.

## Continuidad de sesión
- **"catchup"** (o "ponme al día"): lee \`STATE.md\` + \`git log --oneline -15\` + \`git status\`; resume el último estado y propón el siguiente paso. No cambies nada hasta confirmar.
- **"wrapup"** (o "cierra sesión"): actualiza \`STATE.md\` COMPLETO (Hecho / En progreso / Siguiente / Decisiones / Hilos abiertos), sugiere commit y confirma. Úsalo antes de cerrar.${foot}`;

  const geminiMd = `# ${pname} — Antigravity\n> 📌 **Contexto completo en \`AGENTS.md\` — léelo.** Aquí van SOLO reglas propias de Antigravity (prioridad sobre AGENTS.md).\n\n## Específico de Antigravity\n<!-- Overrides/preferencias SOLO de Antigravity (planning, browser/agent tools). Vacío = hereda de AGENTS.md. -->${foot}`;
  const claudeMd = `# CLAUDE.md — ${pname}\n> 📌 **El contexto completo del proyecto está en \`AGENTS.md\` — léelo primero** (objetivo, comandos, estructura, patrones, convenciones, continuidad). Fuente única; no dupliques aquí.${foot}`;

  // CLAUDE.md (Claude Code) + AGENTS.md (cross-tool source) always; GEMINI.md only with --gemini.
  const targets = [["AGENTS.md", body], ["CLAUDE.md", claudeMd]];
  if (GEMINI) targets.push(["GEMINI.md", geminiMd]);

  for (const [name, content] of targets) {
    const f = path.join(dir, name);
    if (fs.existsSync(f) && !FORCE) { console.log(`>> ${name} ya existe (no tocado; --force para sobrescribir)`); continue; }
    fs.writeFileSync(f, content); console.log(`>> ${name} generado`);
  }
  // Seed STATE.md (continuity log) if missing.
  const st = path.join(dir, "STATE.md");
  if (!fs.existsSync(st)) {
    fs.writeFileSync(st, `# STATE — ${pname}\n> Bitácora de continuidad. Al volver, escribe **catchup** y el agente lee esto + git y te pone al día.\n\n## Estado actual\nProyecto recién iniciado${ABOUT ? ": " + ABOUT : ""}.\n\n## Hecho\n-\n\n## En progreso\n-\n\n## Siguiente\n-\n\n## Decisiones / contexto clave\n-\n\n## Hilos abiertos / dudas\n-\n\n---\nActualiza esto al terminar cada bloque de trabajo.\n`);
    console.log(">> STATE.md (bitácora de continuidad) creado");
  }
  if (stackList.length) console.log(`>> Stack detectado: ${stackList.join(", ")} | comandos: ${Object.keys(det.commands).join(",") || "ninguno"}`);
  if (det.isEmpty) console.log(`>> Stack no reconocido — corre discovery (ver SKILL.md): busca online skills/agents para este dominio y propónlas.`);
}

main();
