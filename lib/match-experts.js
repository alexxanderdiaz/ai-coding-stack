#!/usr/bin/env node
/**
 * match-experts — rank catalog experts against a detected stack + purpose text.
 * Pure function, no I/O.
 *   matchExperts(catalog, detection, aboutText) -> [{...expert, score}]
 *   detection = { suggestedProfile, languages: [], frameworks: [] }
 */
function matchExperts(catalog, detection, aboutText) {
  const det = detection || {};
  const profile = det.suggestedProfile || "generic";
  const langs = (det.languages || []).map(s => s.toLowerCase());
  const fws = (det.frameworks || []).map(s => s.toLowerCase());
  const aboutTokens = new Set((aboutText || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const out = [];
  for (const e of (catalog.experts || [])) {
    let score = 0;
    const profiles = e.profiles || [];
    if (profiles.includes("*")) score += 1;
    if (profiles.includes(profile)) score += 3;
    for (const l of (e.languages || [])) if (langs.includes(l.toLowerCase())) score += 2;
    for (const f of (e.frameworks || [])) if (fws.includes(f.toLowerCase())) score += 2;
    for (const k of (e.keywords || [])) if (k.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).every(w => aboutTokens.has(w))) score += 1;
    if (score > 0) out.push({ ...e, score });
  }
  const sorted = out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const seen = new Set();
  const deduped = [];
  for (const e of sorted) { if (!seen.has(e.id)) { seen.add(e.id); deduped.push(e); } }
  return deduped;
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
