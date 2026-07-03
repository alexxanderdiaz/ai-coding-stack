#!/usr/bin/env node
/**
 * render-expert — turn a canonical expert spec into a target tool's native format.
 * No deps. Spec = frontmatter (id, kind, description, optional tools) + Markdown body.
 *   parseSpec(text) -> { meta, body }
 *   renderExpert(spec, tool) -> { subpath, content }   // relative to the tool's base dir
 * Skills render identically (skills/<id>/SKILL.md). Agents render per tool.
 * Security: id is validated (no path traversal); Codex body uses a TOML basic
 * multi-line string ("""), never a literal ''' block; CRLF is normalized.
 */
const VALID_ID = /^[A-Za-z0-9_-]+$/;

function parseSpec(text) {
  text = String(text).replace(/\r\n/g, "\n");           // normalize CRLF (Windows checkout)
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return { meta: {}, body: text.trim() };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2].trim() };
}

// double-quoted, escaped, single-line YAML scalar (safe for frontmatter)
function yamlScalar(s) { return JSON.stringify(String(s || "").replace(/[\r\n]+/g, " ").trim()); }
// single-line TOML basic string
function tomlString(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").trim() + '"'; }
// TOML basic MULTI-line string ("""): escapes backslash, quote, and control chars so the body can never break out
function tomlBasicML(s) {
  const esc = String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  return '"""\n' + esc + '\n"""';
}
function skillFile(meta, body) { return `---\nname: ${meta.id}\ndescription: ${yamlScalar(meta.description)}\n---\n\n${body}\n`; }

// Per-tool descriptor: single source of truth for where files go + how agents render.
// scope/dirName are consumed by install-experts.js baseDir(); adding a tool = one entry here.
const TOOLS = {
  claude: {
    scope: "project", dirName: ".claude",
    skillSub: id => `skills/${id}/SKILL.md`, agentSub: id => `agents/${id}.md`,
    renderAgent: (meta, body) => {
      const fm = ["---", `name: ${meta.id}`, `description: ${yamlScalar(meta.description)}`];
      if (meta.tools) fm.push(`tools: ${yamlScalar(meta.tools)}`);
      fm.push("---");
      return `${fm.join("\n")}\n\n${body}\n`;
    },
  },
  codex: {
    scope: "global", dirName: ".codex",
    skillSub: id => `skills/${id}/SKILL.md`, agentSub: id => `agents/${id}.toml`,
    renderAgent: (meta, body) => `name = ${tomlString(meta.id)}\ndescription = ${tomlString(meta.description || "")}\ninstructions = ${tomlBasicML(body)}\n`,
  },
  antigravity: {
    scope: "project", dirName: ".agent",
    skillSub: id => `skills/${id}/SKILL.md`, agentSub: id => `workflows/${id}.md`,
    renderAgent: (meta, body) => `---\ndescription: ${yamlScalar(meta.description)}\n---\n\n${body}\n`,
  },
  // opencode (SST) — reads SKILL.md natively (Anthropic spec). Agents = MD + frontmatter (mode).
  opencode: {
    scope: "project", dirName: ".opencode",
    skillSub: id => `skills/${id}/SKILL.md`, agentSub: id => `agents/${id}.md`,
    renderAgent: (meta, body) => `---\ndescription: ${yamlScalar(meta.description)}\nmode: subagent\n---\n\n${body}\n`,
  },
  // ZAI Code (ZCode, Zhipu GLM) — VS Code fork; reads <repo>/AGENTS.md natively.
  // SKILLS verified: ~/.zcode/skills/<id>/SKILL.md (identical Claude/opencode frontmatter — confirmed
  // against the app's bundled zcode-configuration-guide + its own skills on disk).
  // AGENTS: ZCode has NO standalone subagent install path — subagents live only inside a skill's or
  // plugin's `agents/` subdir, or via the Settings → Subagents GUI (zcode.cjs discovers them via the
  // skill/plugin `agents` field, never a top-level ~/.zcode/agents). So zcode is SKILLS-ONLY here;
  // agent-kind experts are skipped for zcode (install them via the GUI or a plugin instead).
  zcode: {
    scope: "global", dirName: ".zcode", kinds: ["skill"],
    skillSub: id => `skills/${id}/SKILL.md`,
  },
  // Kimi (Moonshot) — desktop app (com.moonshot.kimichat) bundling the "daimon" coding agent;
  // reads <repo>/AGENTS.md natively. SKILLS verified: ~/.kimi/daimon/skills/<id>/SKILL.md — identical
  // Anthropic SKILL.md format (name+description frontmatter), confirmed against the app's bundled
  // skill-creator guide + 20 builtin skills. The skills root resolves to ~/.kimi/daimon/skills/ by
  // default (overridable via the KIMI_SKILLS_ROOT env var). AGENTS: Kimi has NO standalone subagent
  // install path — subagents are spawned at runtime by skills (e.g. the bundled "swarm-coding"),
  // not dropped in as files. So kimi is SKILLS-ONLY here; agent-kind experts are skipped (author a
  // swarm-style skill that delegates, instead of installing a standalone agent).
  kimi: {
    scope: "global", dirName: ".kimi", kinds: ["skill"],
    skillSub: id => `daimon/skills/${id}/SKILL.md`,
  },
  // Cursor — no skills concept; everything maps to .cursor/rules/*.mdc (Agent-type: description set, model picks relevance).
  cursor: {
    scope: "project", dirName: ".cursor",
    skillSub: id => `rules/${id}.mdc`, agentSub: id => `rules/${id}.mdc`,
    renderSkill: (meta, body) => `---\ndescription: ${yamlScalar(meta.description)}\nalwaysApply: false\n---\n\n${body}\n`,
    renderAgent: (meta, body) => `---\ndescription: ${yamlScalar(meta.description)}\nalwaysApply: false\n---\n\n${body}\n`,
  },
  // Windsurf — no skills; skills→.windsurf/rules/*.md (model_decision trigger), agents→.windsurf/workflows/*.md (procedural).
  windsurf: {
    scope: "project", dirName: ".windsurf",
    skillSub: id => `rules/${id}.md`, agentSub: id => `workflows/${id}.md`,
    renderSkill: (meta, body) => `---\ntrigger: model_decision\ndescription: ${yamlScalar(meta.description)}\n---\n\n${body}\n`,
    renderAgent: (meta, body) => `---\ndescription: ${yamlScalar(meta.description)}\n---\n\n${body}\n`,
  },
};

function renderExpert(spec, tool) {
  const { meta, body } = spec;
  const id = meta.id;
  if (!VALID_ID.test(id || "")) throw new Error(`invalid expert id: ${JSON.stringify(id)}`);  // blocks path traversal
  if (meta.kind !== "agent" && meta.kind !== "skill") throw new Error(`invalid kind for ${id}: ${meta.kind}`);
  const t = TOOLS[tool];
  if (!t) throw new Error(`unknown tool: ${tool}`);
  if (!supportsKind(tool, meta.kind)) throw new Error(`${tool} does not support kind '${meta.kind}'`);
  // Tools without a native SKILL.md format (Cursor/Windsurf) provide renderSkill; others default to SKILL.md.
  if (meta.kind === "skill") return { subpath: t.skillSub(id), content: (t.renderSkill || skillFile)(meta, body) };
  return { subpath: t.agentSub(id), content: t.renderAgent(meta, body) };
}

// True if a tool accepts the given expert kind. Absent `kinds` = both (the default for every tool
// except zcode and kimi, which are skills-only — neither has a standalone subagent install path).
function supportsKind(tool, kind) {
  const t = TOOLS[tool];
  if (!t) return false;
  return (t.kinds || ["skill", "agent"]).includes(kind);
}

module.exports = { parseSpec, renderExpert, supportsKind, TOOLS };
