---
name: plan-edge-index-audit-partial
description: Check that the plan-tree edge index you are about to commit still tells the truth -- compare edges.json against the edges on the nodes, scoped to the STAGED diff. Reach for it before committing when you added, removed, or repointed a needs/super edge in any bucket.json, or added/moved/killed a node that carries edges. With no argument, audits the current staged diff.
---
Purpose: every needs/super edge lives on its node in bucket.json, and
the root index notes/plan/edges.json duplicates it so readers see
the whole edge set without walking the tree. That copy only works if it
is updated in the SAME commit as the bucket.json edit -- this skill is
the on-demand gate that catches the miss before the commit does.

Procedure:

1. Collect the staged edge-bearing files:
   `git diff --cached --name-only --diff-filter=ACMD \
     | grep -E 'notes/plan/(edges\.json$|.*bucket\.json$)'`.
   If EMPTY, report "no plan-tree edge files staged" and stop -- the
   whole-tree sweep is /plan-edge-index-audit-full, not this gate.

2. Run the engine (it reads the working tree; in the normal case the
   staged content and working copy agree -- if they differ, say so):
   `node notes/plan/plan-graph.js --check-edges notes/plan`.

3. Read the findings:
   - MISSING from edges.json: an edge on a node that the index does not
     list -- you added or repointed an edge without indexing it.
   - STALE in edges.json: an index entry no node carries -- you removed
     or renamed the edge and left the index line behind.
   - NOINDEX: edges.json itself is missing.
   Attribute each finding: does its node live in a STAGED bucket.json
   (your change -- fix before committing) or not (pre-existing drift --
   still report it, separately).

4. OFFER each fix as the exact edges.json line to add or drop, sorted
   into place (the file is sorted by node id). Do NOT apply them here.

Notes:
- A clean result means the index matches every edge you touched -- say
  so plainly.
- An engine error (throw, unreadable manifest) is a bug, not an audit
  result -- report it (skills.md), do not report a false clean.

Scope guard: READ-ONLY. This skill runs the checker and reports; the
fix -- editing edges.json in the same commit as the bucket.json -- is
the deliberate write step.
