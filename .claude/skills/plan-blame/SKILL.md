---
name: plan-blame
description: Trace a plan item's full history -- the commits that created, moved, and finished it, across the tree, the old flat plan's git history, and the session memory (Anti-drew, Claude/summaries) -- and present it as a blame (chronological, with hashes) plus a summary of what the item was and what shipped. Reach for it on "blame <id>", "when did N land", "history of N", "summarize old item N". Takes an exact item id; with no argument, prints one-line usage.
---
Purpose: an item's history is scattered across four substrates -- the
tree node (bucket.json + .md), the old flat plan and its done archive
(removed 2026-11-12, alive only in git history), git history itself,
and the session memory (Anti-drew, plus the two summaries still in
Claude/summaries). Answering "where did
this come from and what actually shipped" by hand is a four-substrate
grep, the exact flailing anti-drew exists to kill. This skill is that
trace as one runbook.

Procedure:

1. RESOLVE the id, tree first (the moved-item rule -- a number no
   longer names its bucket):
   `grep -rn '"id": "<id>"' --include=bucket.json notes/plan/`,
   then `grep -n "^<id> " notes/plan/spent-ids.txt` -- a number the
   old flat plan used that the tree does not carry shows up only
   there.
   Read the node: type (ABSENT on any node not touched since
   2026-08-10 -- blame reads history, so it must tolerate BOTH
   schemas forever and never report an untyped old node as wrong),
   status, done field (date + commit when recorded),
   needs/super, body .md.

2. BLAME -- the commit trail, oldest first. FIRST check the clone is
   not shallow: `git rev-parse --is-shallow-repository`; if true,
   `git fetch --unshallow origin` before trusting any "oldest"
   commit. (Origin of this rule: a shallow clone cut at 2026-07-15
   made the first 1090 blame declare four months of history
   "pre-git" -- wrong, the truck was airborne but there was no
   mothership.) Then:
   - tree half: `git log --oneline --reverse -S'<id>' --
     notes/plan/` (creation, moves, edge changes, the DONE
     flip);
   - flat half: `git log --oneline --reverse -S'<id>' --
     notes/the-plan.md notes/the-plan-done.md` (the item's pre-tree
     life; oldest hit is its birth). Both files were removed
     2026-11-12, so the log is all there is: read a version with
     `git show <hash>:notes/the-plan.md`;
   - the done field's own commit when it names one:
     `git show --stat <hash>` -- that is the shipping commit.
   Long trails: keep first, last, and the status-changing commits;
   say how many were elided.

3. CROSS-SESSION MEMORY: Anti-drew, when its checkout is attached
   (call it $AD) -- /recall, or `grep -n '<id>'
   $AD/index/repos/dnatools.md $AD/index/decisions.md
   $AD/index/fixed.md $AD/index/open.md` -- what sessions did the
   work and what they decided, fixed and left open. Also
   `grep -l '<id>' Claude/summaries/*.cld` and the id's lines in
   Claude/summaries/index.cld, for the two summaries still kept here
   (DECISIONS / BUGS FIXED / ASIDES).

4. EDGES: `node notes/plan/plan-graph.js --edges <id>
   notes/plan` -- what it blocked, what continued it (super
   lineage is often the moved/renamed story).

5. PRESENT, in order: one-line WHAT (id, title, status, home bucket);
   BLAME (the dated commit trail with hashes, oldest first); SUMMARY
   (what the item set out to do, what actually shipped and when, where
   the code/doc lives now, open remainders routed elsewhere). Facts
   only from the trail just gathered -- an unverifiable claim is
   omitted, not embellished (Third Rock: no giant aliens).

Scope guard: READ-ONLY -- git log/show, grep, and the plan-graph
reader; writes nothing. Report, do not swallow, a git or grep step
that fails (skills.md: a skill failure is a bug).
