# The Plan

The roadmap of this project. Numbers use BASIC-style gaps so new items
can be inserted between buckets and sub-items without renumbering
everything.

This file is the ROOT PROSE of the plan tree -- the tree analog of a
bucket.md, holding the plan's own top-matter. The bucket list itself
lives in plan.json (loaded first by the page); each bucket's node graph
lives in <bucket>/bucket.json; each item's prose in <bucket>/<item>.md.
See plan-tree.md, at the root of the Plan repo, for the governing
spec.

"What's next": `node plan/plan-graph.js --ready plan` is
the ready frontier, `--blocked` is what waits and on what, `--check`
audits drift. blocked/ready are COMPUTED from the needs edges, never
stored.

## How to use this file

- **Lifecycle.** New items land in their working bucket's bucket.json.
  A completed item STAYS in its bucket with status DONE plus a done
  field ("2026-07-09 commit:4a542fb"); there is no separate archive.
  Git history holds the rest.
- **Index.** bucket.json + the dir index.cld are hand-maintained,
  welded to the commit: when an item is born, completed, renumbered, or
  changes status/needs, update its bucket.json and index.cld in the
  same commit. A new bucket.json or plan.json needs its index.cld entry
  in the same commit.
- **Shape.** Every bucket.json declares its grammar in a "shape" field
  -- what belongs inside, stated so the next session extends the
  bucket instead of re-guessing its structure. Vocabulary and rules:
  plan-tree.md. plan-graph.js --check fails a bucket whose
  contents contradict its declared shape.
- **Decision-blocked work** waits as an EVAL item until the decision
  lands.
- **Numbering.** Top buckets at ten-thousands (12000, 23000); sub-items
  at hundreds within a bucket (12100, 12200) so a new sub-item between
  them lands at 12150. A new top bucket between two existing ones lands
  at the midpoint (13000 between 12000 and 14000). Cross-ref by bare
  number ("blocks 14100"); a hard dependency is a needs edge, a soft
  reference stays in prose. Before assigning a NEW number, run
  plan-dupecheck -- a number already spent on a DONE item is still
  taken; reusing one makes it mean two unrelated items. Named buckets
  and slug ids (bugs, kill-flow) sit beside the numbers.
- **Frozen band.** Every item number is FROZEN: it is the item's
  identity, not its location. It does not change when the item moves
  buckets, and it is never reused -- a spent number stays spent
  (plan/spent-ids.txt). So a number does not always name the
  bucket it sits in; a moved item leaves a marker behind (plan-tree.md
  "Moved items").
- **Dates.** Every item carries `[born YYYY-MM-DD]` when added and
  `[touched YYYY-MM-DD]` when materially edited. An EVAL item also
  carries `[parked YYYY-MM-DD]` -- if a parked date gets stale without
  a decision, the item is either irrelevant (remove) or overdue for its
  decision (push for it).
- **Wrong items** get REMOVED, not struck through. Capture the reasoning
  in the relevant .cld.
- **Commits** reference plan numbers ("addresses 12100 -- ..."). Logs
  say what happened; the plan says what to do.

Renumbering is allowed but should be rare; prefer renumbering one bucket
in isolation rather than shifting everything, and update cross-references
in the same commit.
