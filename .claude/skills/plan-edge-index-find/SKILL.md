---
name: plan-edge-index-find
description: Find the dependency edges to and from a plan-tree node through the root edge index (plan/edges.json) -- who needs it, what it needs, what its super lineage is -- without walking every bucket.json. Reach for it on "what depends on X", "what does X need", "what blocks X", "what continues X" for plan items. Takes an exact node id; with no argument, prints the whole dependency map.
---
Purpose: the edges live ONCE, on the owning node in its bucket.json, so
knowing every edge that touches a node used to mean traversing the whole
tree. The root edge index plan/edges.json is the dependency
map -- every needs/super edge, one greppable line each -- and this skill
drives the lookup. Reading an entry: { type "needs", node N, target T }
means N needs T (T blocks N); { type "super", node N, target T } means
N continues T (lineage, non-blocking).

Procedure:

1. NO ARGUMENT ($ARGUMENTS empty) -- the whole map:
   `node plan/plan-graph.js --edges plan`
   prints every edge with both endpoints' status and title. Summarize
   count by type; do not editorialize each edge.

2. WITH AN EXACT node id -- both directions from the index:
   `grep -n '"node": "<id>"\|"target": "<id>"' plan/edges.json`
   Report in two groups:
   - OUT (entries whose node is <id>): what <id> needs / continues.
   - IN (entries whose target is <id>): what needs / continues <id>.
   When statuses and titles matter (usually), get them from
   `node plan/plan-graph.js --edges <id> plan`
   which prints only the edges touching <id>.

3. NO MATCH: an existing node with no edges is a NORMAL answer --
   report "no edges touch <id>" plainly. If the id itself is unknown
   (not in any bucket.json), say that instead; /plan-find resolves a
   paraphrase to an id when the id is the missing piece.

Notes:
- The index is the fast path; if a result looks wrong, cross-check the
  tree with --edges and run /plan-edge-index-audit-full -- a mismatch
  is index drift, and a skill returning a wrong result is a bug to
  report (skills.md), never to swallow.

Scope guard: READ-ONLY. This skill greps and reports; it never edits
edges.json or any bucket.json.
