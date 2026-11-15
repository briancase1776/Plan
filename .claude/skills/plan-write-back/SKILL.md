---
name: plan-write-back
description: Write a change into the plan tree -- add an item, edit one, change its status, mark it DONE/DEAD, move it between buckets, or add/remove a needs/super edge -- with every welded index edit made in the same commit. Reach for it the moment plan content changes: "add a plan item", "mark N done", "move N to bucket B", "N now needs M". Takes the change in plain words; with no argument, prints one-line usage.
---
Purpose: the write side of the plan skills (0530's TODO half). A plan
change in the tree is never one file: the node lives in bucket.json,
the prose in the item .md, the entry in the dir index.cld, every edge
in edges.json too, the moved-number breadcrumb in bucket.md, the
done/dead field on completion. This skill is that weld as one runbook,
so no half of a change survives alone.

Procedure:

1. Read notes/plan-tree.md FIRST -- the data model, shape grammar, and
   welded rules. Write ops cite the spec, they do not paraphrase it
   (skills.md). Locate the target via /plan-find if needed.

2. NEW item: /plan-dupecheck the id (number by the bucket's step, or a
   short slug -- ids are globally unique across the whole tree). Then,
   in one commit: the node in bucket.json (id, TYPE, title, status,
   needs, body), the .md (prose only, no header block), the index.cld
   entry, and an edges.json line per needs/super.

   SET type ON EVERY NEW NODE. It is the second axis (plan-tree.md
   "Type -- what a node IS"): ramblings | spec | build | bug | doc |
   tooling. Absent is legal ONLY as the migration default for the 384
   nodes that predate the field -- it is not a default for anything
   this skill writes, because a node created untyped is a node nobody
   will ever go back and type. An unknown value fails --check.
   Picking it: does this node hold Brian's own description of a thing
   (ramblings), decide what gets built (spec), ship code (build), fix
   a defect (bug), write a non-spec document (doc), or change the
   plan/skill/index apparatus (tooling)?

   A type:ramblings node is the one that does not behave like work.
   It has NO done-condition, it never reaches the READY frontier, and
   its content is Brian's words SORTED -- order added, nothing thrown
   away, nothing decided, nothing refined. Never "tidy" one into a
   spec: the spec is derived FROM it and it outlives the build, which
   is the whole point ("4 years after layers is built you can actually
   read what i said when i described it"). Refinement goes in a
   separate type:spec node.

3. STATUS change: edit status in bucket.json. DONE gets the done
   field ("YYYY-MM-DD commit:<hash>"); DEAD gets the DEAD field --
   named dead, same shape, carrying the retired reason. The field
   name matches the status and --check fails the other pairing
   (BADFIELD). "the same field" is what this step used to say and it
   is how 7 dead nodes came to claim they were done. Never store a
   computed state (blocked/ready/frontier).

4. EDGE change: the needs/super array on the OWNING node and the
   matching edges.json line (sorted by node id) change together --
   both or neither, same commit.

5. MOVE: the node and its .md relocate to the new bucket's files (both
   bucket.jsons, both index.clds). A frozen-band number landing in a
   non-obvious bucket leaves the one-line breadcrumb in the bucket.md
   where the number would send you (plan-tree.md welded rule).

6. VERIFY before committing:
   `node notes/plan/plan-graph.js --check notes/plan`
   must run clean -- drift, shapes, edge index, bad types, and Liza
   cycles. A new needs that closes a loop is a hole in the bucket
   (docs/dear-liza/): take it back to Brian for the axe instead of
   committing it.

7. The flat files (notes/the-plan.md / -done.md and their .clds) are
   GONE -- retired at the 2026-07-19 switch, removed 2026-11-12. There
   is no flat way to write anything; the old 0000 resume item's log
   lives on in-flight/wip -> archive in the tree.

Scope guard: writes ONLY under notes/plan/ -- bucket.json, item
.md, bucket.md, index.cld, edges.json. Never a computed field. Report, do not swallow, any check
failure (skills.md: a skill failure is a bug).
