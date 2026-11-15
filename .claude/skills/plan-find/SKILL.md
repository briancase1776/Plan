---
name: plan-find
description: Find a plan item from a paraphrase, an exact number or slug id, or "what's next" -- in the plan tree (notes/plan/), the live plan since the 2026-07-19 switch. Also the outline view -- "depth 2" lists the plan collapsed to N levels. With no argument, lists the READY items ("what's next"). The old flat files (notes/the-plan.md / -done.md) were removed 2026-11-12; their past is /plan-blame's job.
---
Purpose: answer "what's next" or "where's the item about X" without
reading the plan. The plan lives in ONE substrate: the tree at
notes/plan/ (spec notes/plan-tree.md). The old flat file
(notes/the-plan.md, indexed by the-plan.cld / the-plan-done.cld) was
retired at the 2026-07-19 switch and removed 2026-11-12; pre-tree
archaeology is /plan-blame's job (git history and Anti-drew).

Procedure:

1. NO ARGUMENT -- "what's next":
   `node notes/plan/plan-graph.js --ready notes/plan`
   -- the COMPUTED frontier (buildable, no open blocker). Present it
   grouped by bucket. Surface a BLOCK/EVAL item only if it is the real
   center of gravity.

2. DEPTH / OUTLINE ($ARGUMENTS like "depth 2" or "outline 3"):
   `node notes/plan/plan-graph.js --outline <n> notes/plan`
   -- the plan's shape to n levels (1 = bucket headers, 2 adds items).

3. EXACT id (a number like 0550, or a slug like kill-flow):
   - WHEREVER the item lives -- a moved number no longer names its
     bucket, so scan them all (this is the moved-item resolver; the
     bucket.md breadcrumb is the human backstop):
     `grep -rn '"id": "<id>"' --include=bucket.json notes/plan/`
   - Open ONLY the hit: the node's "body" .md. Report TYPE, status
     and gist; edges come from /plan-edge-index-find when they matter.
   - No tree hit at all: the id is historical -- hand off to
     /plan-blame (which knows where the old flat plan's history and
     the session memory live).

4. VAGUE paraphrase: grep the keywords (plus obvious synonyms) over
   the tree bucket.json titles and item .md filenames. Present the best
   match plus 2-3 nearest candidates as: id . type . status . bucket
   . gist.
   Confirm inline in plain text -- NEVER the AskUserQuestion popup
   (CLAUDE.md forbids it); proceed unasked only when unambiguous.

Notes:
- TWO AXES, and reporting only one is how a session inherits the old
  model. type says what a node IS: ramblings / spec / build / bug /
  doc / tooling, or ABSENT, which is legal and means untyped (most
  nodes, filling in on contact). status says where it is in its life:
  READY / PARTIAL / EVAL / PARK / SPEC / DEFER, terminal DONE / DEAD /
  MOVED. SPEC appearing in BOTH lists is the known leftover of the
  conflation the type axis fixed -- say which axis you mean.
- "What's next" == the ready frontier, and it never includes
  type:ramblings. Those are Brian's descriptions, not work: no
  done-condition, so nothing to be next. Answering "what's next" with
  one is a category error, not a scheduling one.
- Read-and-route only. The write side -- adding, editing, moving,
  statusing an item -- is /plan-write-back, with its own welded rules.
