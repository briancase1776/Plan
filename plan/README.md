# plan -- the live plan

This tree IS the plan. Full rules: plan-tree.md, at the root of the
Plan repo (the only authority on the tree's structure; this file
points there and does not define).

DATA MODEL
  - plan.json (root): the bucket list the page loads first.
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
    Every bucket declares a "shape" validated by --check. Hand-
    maintained alongside the index.cld, welded to the commit. Metadata
    lives HERE, once -- not duplicated in the .md, so nothing drifts.
    Edges may cross buckets.
  - <bucket>/bucket.md: prose only -- the bucket header's OWN intro and
    asides. Peer of an item .md.
  - <bucket>/<item>.md: prose only, loaded on click. No header block.

TOOLING
  - plan-graph.js (node, this dir): reader/checker -- --ready /
    --blocked / --lineage / --liza (needs cycles) / --prose (edge
    candidates left in prose) / --check (drift + shape + edge-index
    audit), and the rest listed in its file header. Run it from the
    repo root: node plan/plan-graph.js --ready plan
  - html/plan.html + lib/plan-boot.js: the graph page (Cytoscape +
    fcose), opened by this repo's extension's toolbar button. Its data
    root is this directory.
  - Skills: plan-find / plan-dupecheck / plan-blame / plan-write-back /
    bugs-import / bugs-close and the plan-edge-* set all read (and
    write) this tree.

KNOWN SOFT SPOTS
  - The page draws needs edges only; super (lineage) edges are CLI-only
    (--lineage) for now (issue #4).
