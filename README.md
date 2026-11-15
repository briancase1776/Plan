# Plan

A plan kept as a tree of buckets and drawn as a graph: what is to be
built, what waits on what, and what already shipped. It grew inside
another project and was copied out on 2026-11-15 to become its own,
with an EMPTY plan.

## What is here

- `plan/plan-graph.js` -- the reader and checker. Node only, no
  packages. `node plan/plan-graph.js --ready plan` is what
  can be worked now; `--check` audits the tree; there is no `--help`,
  so read its file header for the modes.
- `plan/` -- the plan itself: `plan.json` lists the buckets,
  each bucket a directory with `bucket.json` (its nodes and their
  needs edges) and one `.md` per item; `edges.json` indexes every
  edge. It starts with one empty bucket, `bugs`.
- `CLAUDE.md` -- the working rules for a Claude Code session here;
  `notes/anti-drew.md` -- why the indexes and the spec exist.
- `plan-tree.md` -- the spec: data model, bucket shapes, statuses
  and types, the welded rules. `docs/dear-liza/dear-liza.txt` -- why a
  needs cycle silently hides its items. `notes/skills.md` -- how the
  skills are written.
- `.claude/skills/` -- the plan skills for Claude Code: plan-find,
  plan-write-back, plan-blame, plan-dupecheck, plan-edge-audit, the
  three plan-edge-index skills, bugs-import and bugs-close.
  They work on the `plan/` of whatever repo the session is in,
  and find the spec, the reader and the checker in this
  checkout through their own base directory.
- `html/plan.html`, `lib/plan-boot.js` -- the plan graph page, with the
  Cytoscape and fcose libraries it draws with (`lib/`, licences in
  `licence/` and `NOTICE`).
- `manifest.json`, `background.js` -- the page as a Chrome extension:
  load this directory unpacked (chrome://extensions, Developer mode,
  Load unpacked); its toolbar button opens the page.
- `scripts/compliance/check.sh` -- the mechanical checker the skills
  run (80 columns, ASCII, file headers).
