# notes/plan -- THE live plan (switched 2026-07-19)

This tree IS the plan. The flat files (notes/the-plan.md,
notes/the-plan-done.md) are RETIRED -- kept in place as history with a
banner, never edited again. The tree was built bucket by bucket from
them (spike 2026-07-12, conversion + done fold-in 2026-07-13, shape
grammar 2026-07-16, moved-marker audit 2026-07-18, switch 2026-07-19);
full rules in notes/plan-tree.md.

DATA MODEL (design B)
  - plan.json (root): the bucket list the runtime page loads first.
  - edges.json (root): the EDGE INDEX -- every needs/super edge in one
    greppable file ({ type, node, target }, sorted by node), because
    the whole edge set is otherwise unknowable without walking every
    bucket.json. A derived index, not a second authority: the edge on
    the node is the truth; hand-edit the copy in the SAME commit and
    plan-graph.js --check-edges keeps it honest. Skills:
    plan-edge-index-find / -audit-partial / -audit-full, and
    plan-edge-audit for the semantic (is-it-a-real-dependency) pass.
  - <bucket>/bucket.json: the graph data for that cluster -- each node's
    id, title, status, and needs (the dependency EDGES; a needs entry is
    a directed edge), plus a "body" pointer to the bucket's own prose.
    Every bucket declares a "shape" (numbered/kinds/lanes/flight/...)
    validated by --check. Hand-maintained by Claude alongside the .cld
    index, welded to the commit. Metadata lives HERE, once -- not
    duplicated in the .md, so nothing drifts. Edges may cross buckets.
  - <bucket>/bucket.md: prose only -- the bucket header's OWN intro and
    asides. Peer of an item .md; the channel that keeps bucket-header
    doctrine from being lost at migration.
  - <bucket>/<item>.md: prose only, loaded on click. No header block.

TOOLING
  - plan-graph.js (node, this dir): reader/checker -- --ready /
    --blocked / --lineage / --liza (needs cycles) / --prose (edge
    candidates left in prose) / --check (drift + shape + edge-index
    audit). Run it from this directory.
  - html/plan.html + lib/plan-boot.js: the graph page (Cluster/fcose),
    reached from the popup's "Open Plan Graph" button. DATA_ROOT points
    here.
  - Skills: plan-find / plan-dupecheck / plan-blame / plan-write-back /
    bugs-import and the plan-edge-* set all read (and write) this tree.

KNOWN SOFT SPOTS (post-switch state, not defects of the switch)
  - The needs edges are conservatively inferred; the semantic audit
    (every edge ruled keep/drop/repoint by Brian via /plan-edge-audit)
    is IN PROGRESS -- edge-audit in tooling-and-governance/plan.
    READY/BLOCKED are approximations until it drains.
  - The --prose queue (~350 rows of edge candidates still in prose) is
    unruled; drained per bucket alongside the audit sittings.
  - The page draws needs edges only; super (lineage) edges are CLI-only
    (--lineage) for now.
