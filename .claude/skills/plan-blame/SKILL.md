---
name: plan-blame
description: Trace a plan item's full history -- the commits that created, moved, and finished it, across the tree and its git history -- and present it as a blame (chronological, with hashes) plus a summary of what the item was and what shipped. Reach for it on "blame <id>", "when did N land", "history of N", "summarize old item N". Takes an exact item id; with no argument, prints one-line usage.
---
Purpose: an item's history is scattered -- the tree node (bucket.json +
.md), the commits that created, moved, re-edged and finished it, and
the shipping commit its done field names. Answering "where did this
come from and what actually shipped" by hand is a scattered grep, the
exact flailing anti-drew exists to kill (notes/anti-drew.md). This
skill is that trace as one runbook.

Procedure:

1. RESOLVE the id, tree first (the moved-item rule -- a number no
   longer names its bucket):
   `grep -rn '"id": "<id>"' --include=bucket.json plan/`,
   then `grep -n "^<id> " plan/spent-ids.txt` -- a number this
   plan spent that the tree no longer carries shows up only there.
   Read the node: type (ABSENT is legal on an untyped node -- blame
   reads history, so it must tolerate untyped nodes and never report
   one as wrong), status, done field (date + commit when recorded),
   needs/super, body .md.

2. BLAME -- the commit trail, oldest first. FIRST check the clone is
   not shallow: `git rev-parse --is-shallow-repository`; if true,
   `git fetch --unshallow origin` before trusting any "oldest" commit
   -- a shallow clone makes old history look as if it began at the
   clone's cut. Then:
   - the tree: `git log --oneline --reverse -S'<id>' --
     plan/` (creation, moves, edge changes, the DONE flip);
     read an old version with `git show <hash>:<path>`;
   - the done field's own commit when it names one:
     `git show --stat <hash>` -- that is the shipping commit.
   Long trails: keep first, last, and the status-changing commits;
   say how many were elided.

3. EDGES: `node plan/plan-graph.js --edges <id>
   plan` -- what it blocked, what continued it (super
   lineage is often the moved/renamed story).

4. PRESENT, in order: one-line WHAT (id, title, status, home bucket);
   BLAME (the dated commit trail with hashes, oldest first); SUMMARY
   (what the item set out to do, what actually shipped and when, where
   the code/doc lives now, open remainders routed elsewhere). Facts
   only from the trail just gathered -- an unverifiable claim is
   omitted, not embellished.

Scope guard: READ-ONLY -- git log/show, grep, and the plan-graph
reader; writes nothing. Report, do not swallow, a git or grep step
that fails (skills.md: a skill failure is a bug).
