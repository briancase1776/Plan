# Plan

A plan kept as a tree of buckets and drawn as a graph: what is to be
built, what waits on what, and what already shipped. Copied out of
DNA Tools on 2026-11-15, where it grew, to become its own project --
the plan system had never had a design pass of its own, and its rules
kept leaking (DNA Tools' bugs/plan-leaks). This repository starts as a
faithful copy with an EMPTY plan; reworking it comes next.

## What is here

- `notes/plan/plan-graph.js` -- the reader and checker. Node only, no
  packages. `node notes/plan/plan-graph.js --ready notes/plan` is what
  can be worked now; `--check` audits the tree; `--help`-less, so read
  its file header for the modes.
- `notes/plan/` -- the plan itself: `plan.json` lists the buckets,
  each bucket a directory with `bucket.json` (its nodes and their
  needs edges) and one `.md` per item; `edges.json` indexes every
  edge. It starts with one empty bucket, `bugs`.
- `notes/plan-tree.md` -- the spec: data model, bucket shapes, statuses
  and types, the welded rules. `docs/dear-liza/dear-liza.txt` -- why a
  needs cycle silently hides its items. `notes/skills.md` -- how the
  skills are written.
- `.claude/skills/` -- the plan skills for Claude Code: plan-find,
  plan-write-back, plan-blame, plan-dupecheck, plan-edge-audit, the
  three plan-edge-index skills, bugs-import and bugs-close.
- `html/plan.html`, `lib/plan-boot.js` -- the plan graph page, with the
  Cytoscape and fcose libraries it draws with (`lib/`, licences in
  `licence/` and `NOTICE`).
- `manifest.json`, `background.js` -- the page as a Chrome extension:
  load this directory unpacked (chrome://extensions, Developer mode,
  Load unpacked); its toolbar button opens the page.
- `scripts/compliance/check.sh` -- the mechanical checker the skills
  run (80 columns, ASCII, file headers).

## Known, as copied

The text still speaks of DNA Tools -- its paths, its buckets, its
history, the page's title -- and some skills reach for DNA Tools files
that are not here (the session summaries, CLAUDE.md, the old flat
plan). Clearing that out is this project's first work. The plan
system's own open bugs were filed as this repo's issues the day it was
made.
