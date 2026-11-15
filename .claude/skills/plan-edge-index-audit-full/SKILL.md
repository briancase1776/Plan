---
name: plan-edge-index-audit-full
description: Full audit of the plan-tree edge index -- are any edges missing from edges.json, and does edges.json claim edges no node carries? Compares the WHOLE tree against the index, both directions. Reach for it on "is the edge index current", after bulk plan edits or a bucket restructure, and before any edge-audit sitting. No argument needed.
---
Purpose: notes/plan/edges.json duplicates every needs/super edge
stored on the nodes so the page and a cold session read the whole
dependency map from one file. A duplicate is only trustworthy audited:
this is the whole-tree freshness sweep, against every bucket.json --
the full-depth sibling of /plan-edge-index-audit-partial (which scopes
to the staged diff).

Procedure:

1. Run the engine:
   `node notes/plan/plan-graph.js --check-edges notes/plan`.
   (The same comparison also runs inside --check, the whole-manifest
   drift audit; use --check when you want shapes and dangling edges
   swept in the same pass.)

2. CLEAN: report it plainly -- every edge on every node is in the
   index, and every index entry is backed by a node.

3. FINDINGS:
   - MISSING from edges.json: the tree carries an edge the index does
     not list. Fix: add that line to edges.json (sorted by node id).
   - STALE in edges.json: the index lists an edge no node carries.
     Fix: drop the line -- or, if the edge was MEANT, the bucket.json
     lost it; decide which side is wrong before touching either.
   - NOINDEX: edges.json is missing entirely -- rebuild it from
     --edges output, then re-run to verify.
   OFFER the fixes as exact lines; do NOT apply them here.

4. An engine error is a bug, not an audit result -- report it
   (skills.md), never a false clean.

Notes:
- This audit is MECHANICAL: set-equality between tree and index. It
  says nothing about whether a needs edge is a REAL dependency -- that
  judgment audit is /plan-edge-audit.

Scope guard: READ-ONLY. Reports and offers fixes; applying them is the
deliberate write step with the same-commit rule.
