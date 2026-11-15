# The Plan

DNA Tools longterm roadmap. Numbers use BASIC-style gaps so new items can
be inserted between buckets and sub-items without renumbering everything.

This file is the ROOT PROSE of the plan tree -- the tree analog of a
bucket.md, holding the plan's own top-matter. The bucket list itself lives
in plan.json (loaded first by the page); each bucket's node graph lives in
<bucket>/bucket.json; each item's prose in <bucket>/<item>.md. See
notes/plan-tree.md for the governing spec.

INDEX / "what's next": the tree makes the old the-plan.cld symbol index
mechanical -- `node plan-graph.js --ready` is the ready frontier (the
cheap "what's next" answer), `--blocked` is what waits and on what,
`--check` audits drift. blocked/ready are COMPUTED from the needs edges,
never stored.

## How to use this file

- **Lifecycle.** New items land in their working bucket's bucket.json.
  A completed item STAYS in its bucket with status DONE plus a done field
  ("2026-07-09 commit:4a542fb"); there is no separate archive -- the old
  notes/the-plan-done.md folds in this way. Git history holds the rest.
- **Index.** bucket.json + the dir index.cld are hand-maintained by
  Claude, welded to the commit -- the SAME welded rule as every
  filename.cld: when an item is born, completed, renumbered, or changes
  status/needs, update its bucket.json and index.cld in the same commit.
  index-audit tracks .json, so a new bucket.json / plan.json needs its
  index.cld entry in the same commit.
- **Shape.** Every bucket.json declares its grammar in a "shape" field
  (numbered, kinds, lanes, proposed-only, implemented, proposed) --
  what belongs inside, stated so the next session extends the bucket
  instead of re-guessing its structure. Vocabulary and rules:
  notes/plan-tree.md. plan-graph.js --check fails a bucket whose
  contents contradict its declared shape.
- **Decision-blocked work** mirrors as a 0100-series eval-due item until
  the decision lands.
- **Numbering.** Top buckets at ten-thousands (12000, 23000); sub-items
  at hundreds within a bucket (12100, 12200) so a new sub-item between
  them lands at 12150. New top bucket between two existing ones lands at
  the midpoint (e.g. 13000 between 12000 and 14000). Cross-ref by bare
  number ("blocks 14100"); a hard dependency is a needs edge, a soft
  reference stays in prose. Before assigning a NEW number, run
  plan-dupecheck -- a number already spent on a DONE item is still taken.
  Reusing one is how 1108, 1032, and 1150 each ended up meaning two
  unrelated items.
- **Frozen band (0000-1199).** Nodes below 1200 are FROZEN and never
  scaled or reused: governance (0000-0500), and live 1000-series cleanup
  items wherever they now sit (e.g. 1006 under 23000, 1095 under 12000,
  1042 under 45000, 1110 under 0500, 1140 under 55000). The number is the
  identity; it does not change when an item moves buckets.
- **Dates.** Every item carries `[born YYYY-MM-DD]` when added and
  `[touched YYYY-MM-DD]` when materially edited. 0100-series items also
  carry `[parked YYYY-MM-DD]` -- if a parked date gets stale without a
  decision, the item is either irrelevant (remove) or forcing-function
  overdue (push for decision).
- **Wrong items** get REMOVED, not struck through. Capture the reasoning
  in the relevant .cld.
- **Commits** reference plan numbers ("matchgraph: addresses 1010 --
  ..."). Logs say what happened; the plan says what to do.

All items in the original flat file as of the initial commit are [born
2026-05-27] unless explicitly tagged otherwise.

## Numbering migration history

NUMBERING MIGRATION [2026-06-28]: all live nodes >= 1200 were scaled x10
to restore insert headroom (1200 -> 12000, 2300 -> 23000, the old 12000
3D bucket -> 120000); the 0000-1199 band was left frozen. Refs written
before this date (commit messages, Claude/summaries/, and the breadcrumbs
in done items) use OLD numbers -- to map a pre-migration 4-digit ref >=
1200 to its current node, multiply by 10. Dead provenance (the "was NNNN"
tags, the 30000 / 5000 tombstones) is left at old scale on purpose: it
records history, not a live target.

Renumbering is allowed but should be rare; prefer renumbering one bucket
in isolation rather than shifting everything, and update cross-references
in the same commit.

## Reused numbers (dupe ledger)

The old flat file spent a few numbers twice on unrelated items -- reusing
one was how these ended up meaning two things (plan.md's own warning). At
the done fold-in each collision was split: the live/active or earliest-
origin entry keeps the bare number, each other gets a letter suffix (same
convention as 1120a). Recorded here so the split is not a silent patch.

- 1002 -- NOT a true collision: the archive had one comprehensive
  shipped entry (the (r, theta) seeder, landed 2026-06-20/21) plus three
  earlier granular facet-notes (polar frame, single-kit scope, seeder +
  physics two-consumers). All one concept, so folded as a SINGLE 1002
  node in 22000-calibration with the three facet-notes captured in its
  body -- no 1002b/1002c split needed. (30000 -> 1002 tombstone unchanged.)
- 1032 -- true collision. 1032 = core teardown walker (2026-06-06
  commit:e8985be) keeps the bare number (it is the live 1000-cleanup
  lineage with 1030/1031/1033/1034). The soft-seed / no-hard-anchor
  seeding item (was 3030, 2026-06-20) becomes 1032b and routes to
  calibration with the rest of the seeder work.
- 1150 -- true collision. 1150 = Claude/Brian.md additions (2026-05-27
  commit:d80cb94, the earliest 1150) keeps the bare number. The Notes-
  filter "did-not-cluster-Cox" bug (2026-06-07, commit:N/A bug-vanished)
  becomes 1150b -- and it is DEAD, not DONE: retired because it stopped
  reproducing, never understood or fixed.
- 1108 -- flagged reused in the old warning; only one 1108 survives in
  the done set (2026-06-23 commit:9092553), so no split was needed at the
  fold-in. If a second 1108 surfaces from the-plan.md at the switch, it
  takes 1108b.
