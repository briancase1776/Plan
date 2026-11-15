---
name: plan-edge-audit
description: Semantic audit of the plan tree's dependency edges -- is every needs a REAL dependency, not a soft cross-ref or provenance mis-encoded as blocking? Runs the full titled edge report plus the suspect and prose-mention pre-filters, then queues each edge for Brian's keep/drop/repoint ruling. Reach for it on "plan edge audit", "audit the edges", "are the needs real". For edges.json freshness (mechanical) use plan-edge-index-audit-full instead. No argument needed.
---
Paths: <PLAN> is the Plan checkout this skill was loaded from --
`realpath <base>/../../..`, where <base> is this skill's base
directory. The spec is <PLAN>/plan-tree.md, the reader
<PLAN>/plan/plan-graph.js. The plan worked on is plan/ in the
repo the session is working in; run every command below from that
repo's root. No repo name or checkout path is written into this
skill.

Purpose: ready/blocked/frontier are COMPUTED from the needs edges, and
those edges are written by hand -- a soft cross-ref mis-encoded as
needs falsely blocks a buildable item; a real dependency left in prose
falsely fronts a blocked one. Mechanical output orders the queue,
Brian's eye rules.

Procedure:

1. Pre-filter -- the likely-wrong queue first:
   `node <PLAN>/plan/plan-graph.js --suspect plan`.
   A needs whose target is already terminal (DONE/DEAD) smells of
   provenance recorded as dependency: it may want to be a super edge,
   or plain prose. It is a SMELL, not a verdict.

1b. The reverse pre-filter -- edges possibly left IN prose:
   `node <PLAN>/plan/plan-graph.js --prose plan`
   (optional node id before the root narrows it). A body .md naming
   another node's id with no edge either direction may be a missing
   needs, a missing super, or a soft mention that is fine as prose --
   same smell-not-verdict rule. The full queue is large (~350 at
   introduction): drain it per bucket alongside step 4's eye pass,
   not in one sitting.

2. Coverage -- the whole edge set, titled:
   `node <PLAN>/plan/plan-graph.js --edges plan`.
   Every edge gets ruled eventually; the suspects just go first.

3. Present the queue to Brian in plain text (NEVER AskUserQuestion --
   CLAUDE.md forbids the popup), suspects first, batched by bucket.
   For each edge the ruling is one of:
   - KEEP     -- it is a real hard dependency.
   - DROP     -- soft cross-ref; the mention stays in prose only.
   - REPOINT  -- right idea, wrong target id.
   - DEMOTE   -- lineage, not dependency: needs becomes super.

4. MISSING edges cut the other way and no report finds them: while a
   bucket's edges are up for ruling, open that bucket's item .md prose
   and let Brian's eye catch a hard dependency a writer left
   un-encoded. Log any he finds as ADD rulings.

5. Applying rulings is the separate write step, welded per edit: the
   owning bucket.json AND edges.json change in the SAME commit, then
   `--check-edges` and `--check` run clean before it lands.

Notes:
- An audit is not finished until every edge has been ruled once.

Scope guard: READ-ONLY. This skill reports and collects rulings; the
edits happen in the follow-up write step, not inside the skill.
