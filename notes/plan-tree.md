# Plan Tree -- the governing spec for notes/plan/

notes/plan/ IS the live plan. This file is the ONLY authority on its
structure: the field names, the vocabularies, the rules, and the
checks. Read it before you maintain the tree, and WRITE FROM IT --
every rule a maintainer needs is here, in the reference sections, not
spread across the tree's own prose.

You do not read the tree wholesale; you touch it through the skills.
/plan-find (what's next, where is an item, the outline view),
/plan-dupecheck (is this id free -- before you name anything),
/plan-write-back (every change, welded), /plan-blame (what shipped),
/plan-edge-audit and the plan-edge-index-* set (the edges). The skills
are the interface; this file is what they cite.

AUTHORITY. Two other files describe this tree, and NEITHER may restate
a rule from here:
- notes/plan/README.md is the front door -- what the tree is, where
  the tooling lives, what is currently soft. It points here; it does
  not define.
- notes/plan/plan.md is the PLAN's own top-matter -- numbering policy,
  the frozen band, the dated conventions.
  That content is the plan's, not the tree's.
Anything that is a rule about tree STRUCTURE belongs here and is
referenced from there. When either file contradicts this one, this one
wins and the other is the bug. A list kept in three places drifts
apart, and a spec whose first design rule is "metadata lives in ONE
place, so nothing drifts" has to obey it about itself.

NORMATIVE vs HISTORY. Every section of this file is normative -- it
tells you what to do, and a sentence in the imperative mood is a live
instruction. Provenance inside a section -- a date, a Brian ruling,
the failure that produced the rule -- is there because the rule does
not survive without its why (anti-drew doctrine, not decoration). It
is never the rule itself.

WHY A TREE. A plan kept as one big file gets too big for Brian OR
Claude to keep straight -- the anti-drew problem, stated plainly by
Brian 2026-07-12: "i cant keep things strait no clue if you can i
suspect not". The tree makes each item a small file, the dependency
edges machine-readable, and the whole plan viewable as a graph.

## Data model (design B)

Metadata lives in ONE place. No duplication, so nothing drifts.

- notes/plan/plan.json -- the root manifest: the bucket list the page
  loads first. { "buckets": [ { id, title, dir } ] }. Two bucket forms,
  both FIRST-CLASS: NUMBERED (id is the frozen bucket number, dir is
  NNNN-slug) and NAMED (id = dir = the slug). A named bucket gets ONE
  plan.json entry no matter how deep it nests -- never flatten its
  kinds into sibling top-level entries.
- notes/plan/plan.md -- prose ONLY: the plan's top-matter. The
  root-level analog of bucket.md, and the home of the numbering
  policy and the frozen band -- facts about the plan's CONTENTS, never
  about the tree's form.
- notes/plan/edges.json -- the ROOT EDGE INDEX [2026-07-18, Brian]:
  every needs/super edge in one file, one line per edge, { type, node,
  target } mirroring the entry on the owning node, sorted by node id.
  It exists because the whole edge set is otherwise unknowable without
  walking every bucket.json: the page reads it in one fetch, Claude
  greps it, the to/from lookup is the plan-edge-index-find skill. It
  is an INDEX, not a second authority -- the edge stored on the node
  stays the truth, and the copy is kept honest exactly like every
  index.cld: hand-edited in the SAME commit as the bucket.json edit,
  compared by plan-graph.js --check-edges (also inside --check), gated
  on demand by plan-edge-index-audit-partial / -full.
- notes/plan/<bucket>/bucket.json -- the graph data for one cluster,
  and what the page fetches to pop a bucket open. Every field of the
  bucket record and of the node record is specified in "### Field
  reference" below; that reference is normative and this bullet is not
  a second copy of it. "subs" lists child sub-bucket dir names: a
  bucket nests exactly the way the filesystem does -- each sub is a
  child dir with its own bucket.json, and both readers recurse it. A
  container carries subs and no own nodes; a leaf carries nodes.
  "shape" names the bucket's grammar (its own section below).
- notes/plan/<bucket>/bucket.md -- prose ONLY: the bucket header's OWN
  prose -- its intro paragraph and any asides. This is a full peer of
  an item .md, not an afterthought: a bucket header can carry real
  doctrine above its items, and that prose has no other home. A bucket
  with no header prose omits both the file and the "body" field.
  WELDED RULE: when you migrate or edit a bucket, the header prose goes
  here verbatim -- losing it is the exact failure this line exists to
  stop (found 2026-07-12, Brian: "we cant loose info").
- notes/plan/<bucket>/<item>.md -- prose ONLY. No header block. Loaded
  on click. The heavy detail; kept out of the graph load. NAMING: a
  numbered item is <id>-<slug>.md (12100-export-button.md); a slugged
  item is <id>.md (kill-flow.md). The node's
  "body" field must name this file EXACTLY, because that string is what
  the page fetches -- a mismatch is a 404 on click, and nothing in
  --check sees it yet.
- notes/plan/<bucket>/index.cld -- the directory index, same as every
  other index.cld. Lists bucket.json + bucket.md + each item .md.

Why bucket-level (not per-node) json: one file per node would be
hundreds of index.cld entries to keep honest. One bucket.json per
cluster keeps the file count in the dozens, and an item edit touches
only its bucket's json.

### Field reference

THE BUCKET RECORD:

  bucket   REQUIRED  string  The bucket id -- plan.json's id for a
                            top-level bucket, the dir name for a sub.
  title    REQUIRED  string  Human title.
  shape    REQUIRED  string  The bucket's grammar. See "## Shape".
  body     optional  string  The bucket's prose file, always
                            "bucket.md". Omit when it has none.
  nodes    REQUIRED  array   This bucket's own nodes. A container
                            carries an EMPTY array, not a missing key.
  subs     optional  array   Child sub-bucket dir names. Omit on a leaf.

THE NODE RECORD, in write order:

  id       REQUIRED  string  Globally unique across the WHOLE tree.
  title    REQUIRED  string  One line; this is what the graph draws.
  type     optional  string  What the node IS. See "## Type". Absent
                            only as the migration default.
  status   REQUIRED  string  Where the node is in its life. See
                            "## Status".
  needs    REQUIRED  array   Dependency edge targets, bare ids. An
                            EMPTY array when there are none -- never
                            absent.
  super    optional  array   Provenance edge targets, bare ids. Omit
                            when there are none.
  body     optional  string  This item's prose file, in this bucket's
                            dir. Omit when the node has no prose.
  done     optional  string  Settled record: "YYYY-MM-DD commit:HASH".
  dead     optional  string  Settled record for a node that died.

Nothing else. In particular there is no stored blocked, ready, or
frontier field ("NEVER STORE A COMPUTED FIELD", below).

THE FIELD NAME MATCHES THE STATUS. A DONE node records under "done",
a DEAD node under "dead", and the other pairing is an error --
BADFIELD, checked. Ruled by Brian 2026-08-11 ("yea dead") on the
evidence: DEAD nodes were found carrying "done", each a retirement
reading commit:N/A, on nodes he had ruled dead in the words "so the
history dont lie" [2026-07-23]. A field named done on a node that
never shipped tells exactly that lie. There is no legacy spelling to
tolerate. commit:N/A is correct when nothing shipped (a
retirement, a bug that stopped reproducing, a scope call), and the
reason clause is the payload:

  "done": "2026-07-09 commit:4a542fb"
  "dead": "2026-06-07 commit:d9169f6 retired:superseded (by 1110)"

A DEAD node with no reason is a tombstone with a blank stone.

### A worked bucket.json

  {
    "bucket": "45000",
    "title": "Export and import",
    "shape": "numbered",
    "body": "bucket.md",
    "nodes": [
      {
        "id": "45800",
        "title": "Export to CSV",
        "type": "build",
        "status": "READY",
        "needs": ["10100"],
        "super": ["1042"],
        "body": "45800-export-csv.md"
      },
      {
        "id": "45900",
        "title": "Import from CSV",
        "type": "build",
        "status": "DONE",
        "needs": [],
        "body": "45900-import-csv.md",
        "done": "2026-07-09 commit:4a542fb"
      }
    ]
  }

Two nodes, one of each kind, every optional field shown at least once.
Copy the form, not the ids.

## Shape -- every bucket declares its grammar

"shape" is the one stored word that says what belongs inside a bucket,
so the next session extends the structure instead of re-guessing it.
It is stored, so it is CHECKED: plan-graph.js --check fails any
bucket whose declared shape contradicts its contents -- that is what
keeps a stored description from rotting into a lie.

NAME COLLISION, said out loud because silence about it has already
misled a reader: this "shape" is the BUCKET's grammar, a stored JSON
field. The page separately draws a node's TYPE as a visual node shape
(see "## The page"). The two are unrelated and neither can be inferred
from the other. The field keeps its name -- it is in every bucket.json
and in fShapeError -- so the discipline is in the writing: say "bucket
shape" or "node glyph", never bare "shape", anywhere the two could be
read for each other.

The shapes in use:

- numbered       leaf; nodes are plan items with frozen numeric ids
                 (id = digits + optional letters: 0550b, and a
                 moved-marker's 0550m / 0550bm -- see "Moved items").
                 No subs.
- slugged        leaf; nodes are named items whose ids are short slugs
                 (a lowercase letter first, then letters/digits/
                 hyphens: kill-flow) -- the named-item half of the
                 global id rule, as numbered is the frozen-number
                 half. No subs. First user: the bugs bucket.
- slugged-tree   branch; slug-id nodes AND child sub-buckets, the one
                 shape allowed to carry both -- for a bucket whose own
                 items head a nested cluster. Subs are ordinary
                 buckets with their own bucket.json, recursed like any
                 sub. Born 2026-08-20 for a bucket holding its
                 ramblings node plus a sub-bucket, which neither leaf
                 (no subs) nor container (no own nodes) fit without
                 burying the node in an invented sub.
- kinds          container; subs are kind sub-buckets (hooks, skills,
                 memory-files, ...), optionally plus the bucket's own
                 implemented / proposed lanes. No own nodes.
- lanes          container; subs are ONLY implemented / proposed. No
                 own nodes.
- proposed-only  lanes variant whose single sub is proposed. Declared
                 where mirroring the implemented side would be wrong
                 (e.g. a kind about the plan itself: mirroring the
                 implemented plan inside the plan is the graph bomb).
- implemented    leaf lane; nodes are what exists or shipped
                 (inventory entries, or DONE/PARTIAL work items).
- proposed       leaf lane; nodes are proposals not yet built.
- flight         container; subs are EXACTLY on-deck + wip + archive.
                 No own nodes. The home for a massive change in flight:
                 one cross-cutting, many-session change held so a cold
                 session can resume it. The three lanes are the
                 lifecycle: on-deck -> wip -> archive.
- on-deck        leaf; massive changes queued but not started, waiting
                 for the wip slot to free. Many allowed. This is where a
                 would-be nested flight goes instead of nesting (flights
                 do not nest). No subs.
- wip            leaf; holds AT MOST ONE node -- the single change
                 currently in flight (the one-reserved-slot rule,
                 checked). No subs.
- archive        leaf; the completed/retired changes that graduated out
                 of wip, each a terminal (DONE/DEAD) node. No subs.

Adding a NEW shape is a spec change: document it here AND teach the
--check validator in the same commit, or the new grammar is unguarded.
bucket.md stays the prose channel for the nuance one word cannot carry
-- shape says what fits inside, bucket.md says why.

## Edges -- needs and super

Two edge kinds: needs (dependency) and super (provenance). Both are
STORED once, on the dependent/later node -- never a mirrored reverse
edge on the target. The root edges.json duplicates them as a derived
lookup index (data model above), never as a second place to declare
one: an edge exists because a node carries it, and --check-edges fails
the index the moment the two disagree.

- needs is the DEPENDENCY edge. A node's "needs": ["0520"] IS a directed
  edge 0520 -> the node: this node cannot build until 0520 is settled.
  It is BLOCKING -- it drives the computed BLOCKED / READY frontier.
- Edges cross buckets. 0550 needs 1110 spans two clusters; that
  cross-bucket flow is much of the value.
- A needs target not in the tree is DANGLING (plan-graph.js --check
  flags it) or, in the page, a red dashed GHOST node standing in until
  its bucket loads.
- Node ids are bare and GLOBALLY UNIQUE across the whole tree -- a
  needs edge names its target by id alone, so two nodes can never
  share one. A numbered item keeps its frozen number; a named item is
  a short slug (kill-flow) -- never a slash path, never an invented
  prefix.

- needs must stay ACYCLIC. A cycle is the one edge failure the drift
  audits cannot see: no edge dangles, every status is set, yet no
  member of the loop can ever settle, so the whole loop silently
  vanishes from the ready frontier forever -- the Dear Liza failure
  (docs/dear-liza/ decodes it). plan-graph.js --liza (and --check)
  names any loop; the fix is never mechanical -- one edge gets CUT by
  Brian's ruling (drop it, demote it to super, or split an item), the
  same eye as /plan-edge-audit. A write that would close a loop goes
  back to Brian, not into a commit (/plan-write-back step 6).
- super is the PROVENANCE edge: lineage, not dependency. A node's
  "super": ["0300"] records that this node continues / supersedes 0300,
  stored on the later (successor) node the same way needs lives on the
  dependent side. It is NON-BLOCKING: a super target never gates the
  ready frontier (a superseded predecessor is history, not a
  precondition) and never fires the DEAD advisory. --check
  dangling-validates it exactly like needs; --lineage prints the chains.
- Why a whole edge kind for lineage, not just prose: a chain that
  lives only in scattered prose makes answering "is there historical
  work on this" a multi-file grep. That is not just the tokens -- the
  lookup noise crowds the context window and degrades every later
  judgment in the session (the anti-drew tax: tokens, context, and
  build quality are one axis).
  Encoding lineage as an edge pays it back: the next session traces the
  subgraph instead of re-deriving it. Reach for super whenever a node
  MOVED, was RENAMED, SUPERSEDED, or SPLIT from another -- the "was
  NNNN" / "superseded by" facts that otherwise rot in prose.

## Type -- what a node IS

"type" is the second axis on a node, added 2026-08-10 on Brian's
ruling ("it can have statuses, it needs a type field, and theres one
more a pre spec kind"). It answers WHAT THIS NODE IS. status answers
WHERE IT IS IN ITS LIFE. Before the split one field carried both
questions, which is why a spec could never BE done -- its kind was
occupying the slot that would have recorded its completion.

The vocabulary:

- ramblings  Brian's own description of a thing, sorted. NOT work.
- spec       the distil and refinement, derived FROM a ramblings node.
- build      work that ships code.
- bug        a defect. The bugs bucket is all of these.
- doc        a durable document about something OTHER than what is
             being built here: a decoder (docs/dear-liza), a doctrine
             file (notes/anti-drew.md), a format spec.
- tooling    plan/skill/index apparatus rather than product code.

SET type ON EVERY NEW NODE. There is no default for anything written
from now on: a node created untyped is a node nobody will ever go
back and type. Picking it is one question -- does this node hold
Brian's own description of a thing (ramblings), decide what gets
built (spec), ship code (build), fix a defect (bug), write a durable
document about something else (doc), or change the plan/skill/index
apparatus (tooling)?

doc VERSUS spec, because the first wording of the doc line read "a
document that is not a spec (a decoder, a format spec)" and offered a
format spec as an example of a not-spec -- a contradiction inside
eight words, caught only when Brian asked "what about docs?" and it
had to be applied to real nodes. The distinction is not formality, it is
SUBJECT. A spec decides what gets built HERE and is answerable to
this codebase; a doc describes something else -- a story that decodes
how the project operates, a convention for writing a file, how to
work with Brian -- and stays true whether or not anything is built.
A format spec is a doc by that test: it governs writing, not
building.

ABSENT is legal, and legal ONLY as the migration default. The nodes
that predate the field MUST NOT be reclassified in a batch; the axis
fills in on contact, the same bargain as the compliance rule. Run
`--types` for the live census -- the count is not written down here,
because a count in prose is a fact nothing can contradict (the spec's
own --mine doctrine, applied to the spec).

An UNKNOWN type VALUE is a different thing and fails --check, exactly
like an unknown shape -- a typo must not silently mint a category.

This paragraph is the half that was missing. The write rule lived
only in /plan-write-back step 2, in a skill whose own first line is
"Write ops cite the spec, they do not paraphrase it" -- so the rule
that decides whether the type axis ever gets populated existed
nowhere in the thing being cited, and died the moment a session
hand-edited a bucket.json without the skill.

### ramblings -- the one type with no terminus

A ramblings node holds what Brian said when he described something,
sorted by Claude when it is filed. Three properties, and every one of
them is load-bearing:

- IT IS NOT WORK, so it has no done-condition and never appears on
  the READY frontier. Nothing to finish, so nothing to gauge -- do
  NOT build a staleness report over these. Brian, ruling the type:
  "there is no done, no nothing, its a place to put things so they
  dont get lost because reapating yourself is a known issue with ai,
  this way its in the right place, its visible, you dont have to ask
  me 10 times."
- IT OUTLIVES THE BUILD. "4 years after layers is built you can
  actually read what i said when i described it." The spec is derived
  from it and never consumes it. The tree is already the right
  substrate for that -- see "## Done", a completed item stays in its
  bucket and there is no archive -- so the 4-year guarantee needs no
  new machinery, only a node kind allowed to use it.
- IT IS SORTED, NOT DISTILLED AND NOT VERBATIM. Claude adds ORDER when
  filing it and nothing else: nothing thrown away, nothing decided,
  nothing refined. That is store-everything-analyze-later, applied to
  Brian's own words. The spec is the filter, and being the filter is
  precisely why the spec cannot double as the record.

And it is the plan's ONBOARDING surface, which is the payoff the
other two do not cover. Anti-repetition serves someone who knows to
look; durability serves someone reading years later. Onboarding
serves a reader who knows NOTHING yet -- a cold session, a different
model, Brian after a month away -- and that reader cannot query for
what he does not know exists. anti-drew.md's thesis is that the
expensive part of a cold start is the flailing BEFORE the read, and a
bucket's ramblings node is the one artifact answering "what is this
bucket and why does it exist" in Brian's own words. No index.cld gist
substitutes: a gist says what a file IS, only the description says
what the thing is FOR. This is why --specless reports "no spec, no
ramblings" and not just the spec half.

It is also the home a talked-out idea otherwise lacks when it
graduates. Every artifact of the talk has a home EXCEPT Brian's own
description -- rulings become items, design becomes a spec, his words
are neither. A graduation that would drop them is one nobody runs.
type:ramblings is the home, which is what makes it completable.

Named for Carl Spackler in Caddyshack, muttering his way to a plan --
Brian's word, ruled after he was offered a tidier one and declined it
("i have a burglar in the projects why cant i have bill murry mutting
to himself wile ploting the death of an anamatronic gopher"). Same
house style as Dear Liza: the name carries the model.

## Status -- where a node is in its life

STORED, hand-set in bucket.json. The whole vocabulary, and each word
means one thing:

  READY    buildable; work can start now.
  PARTIAL  buildable; partly shipped, the rest still owed.
  SPEC     described but not committed to. See the note below.
  DRAFT    content accruing and open for change -- being written,
           not committed to. Not buildable, not settled. Added
           2026-08-13 (Brian, typing a spec node: "mark it spec and
           draft"); natural life-stage for a type:spec node. Whether
           DRAFT is also the migration word for status-SPEC (the
           unchosen word, note below) is NOT ruled -- do not migrate
           SPEC nodes on this entry.
  EVAL     waiting on Brian's decision before work proceeds -- a design
           call, a scope choice, a filed bug not yet ruled.
  PARK     deliberately set down, with no decision pending.
  DEFER    deliberately not now, conditional on something later.
  MOVED    the node is a signpost, not work -- a moved marker. See
           "Moved items", including why MOVED is NOT settled.
  DONE     it shipped.
  DEAD     it did not, and never will.

Two derived properties cut across that list, and they are independent
(defined under "Moved items", where getting them confused was caught):
SETTLED = DONE or DEAD, the only states that clear a needs edge;
BUILDABLE = READY or PARTIAL, the only states that can be on the ready
frontier or be reported BLOCKED. A new status that is meant to be
workable has to be added to the buildable set in plan-graph.js, not
just to this list.

UNENFORCED -- say so plainly until it is fixed. --check validates the
shape vocabulary and the type vocabulary, but for status it checks only
that the field is NON-EMPTY. There is no status vocabulary constant in
plan-graph.js, so any string is currently a legal status. That gap is
not academic: it is exactly how MOVED once sat on many nodes while
this section's list did not include it, with --check clean the whole
time. The spec's own bargain --
"it is stored, so it is CHECKED" -- was never struck for the field with
the most values, on the most nodes, driving the one report Brian reads
most. OWED, and this spec mandates the code change: --check gains a
status vocabulary constant and fails an unknown value, under the same
same-commit rule shape and type already carry. Until it lands, treat
this list as the vocabulary and expect no help from the gate.

SPEC is the leftover of the conflation the type axis fixed, and it is
KNOWINGLY still here. It says what a node IS from the field that says
where a node is, so once type exists it wants to become type:spec (or,
for most of the nodes carrying it, type:build plus some status meaning
"described, not committed"). That word is UNCHOSEN, so the migration
has not started -- and it does not gate anything: adding an axis never
required renaming a value in the old one. Do not migrate SPEC nodes
until Brian picks the replacement word. --types is where you look for
how many are waiting on that word.

COMPUTED, never stored (a stored one rots):
- BLOCKED = a buildable node with a needs target that is not settled.
  Derived every read.
- READY FRONTIER = buildable AND no open blocker AND not
  type:ramblings. A node with no done-condition can never be "what's
  next", and a bucket's worth of them would break the one report Brian
  reads most.
- MISSING = a needs target absent from the tree.

A stored BLOCK:N is exactly the lie this kills -- if nobody writes it,
it cannot go stale.

## Done

A completed item stays in its bucket. bucket.json gives it status DONE
plus a done field ("2026-07-09 commit:4a542fb"). There is no separate
archive. Git history holds the rest.

An abandoned/superseded/tombstoned item stays in its bucket too, with
status DEAD and the same date+reason record under its OWN field name,
dead ("2026-06-07 commit:N/A retired:superseded") -- same shape, never
the same key. "The same field" is what this sentence used to say, and
that one word put "done" on dead nodes before it was caught. DEAD is
how a not-shipped item is recorded without lying that it was DONE --
a tombstone, or an item ruled UNFEASIBLE, retired, or subsumed, is
DEAD, not DONE. Wrong items that never carried a number are still
just REMOVED (plan.md); DEAD is for a numbered node that died.

Reused numbers: a number spent twice on unrelated items is a
collision. The FORM of the fix is a letter suffix -- the
live-or-earliest entry keeps the bare number, each other gets a letter
(0550b). Whether a given collision is split at all is a RULING, not a
rule: an apparent collision can be ruled one concept, folded into a
single node with the facet-notes in its body. Record every case, and
its ruling, in a "Reused numbers" section of plan.md (none yet) -- read
it for what happened; do not re-derive it from this paragraph.

## Moved items -- leave a marker node

A frozen-band number is identity, not location: the item
keeps its number when it changes buckets (plan.md "Frozen band"), so the
number no longer tells you which bucket to open. Browsing by number
therefore fails for a relocated item -- you look under the bucket the
number implies, it is not there, and there is nothing to say where it
went. That is a dead end a cold reader (or Brian) hits with no recourse.

WELDED RULE: when you relocate a frozen-band item to a non-obvious
bucket, leave a one-line moved-breadcrumb in the bucket.md WHERE THE
NUMBER WOULD SEND YOU -- "0550 -> 12000-sync (DONE)" -- pointing at
the real home, in the same commit as the move. Point at the TREE
bucket it lives in now, NOT at any file outside the tree: a breadcrumb
that names some other archive just relocates the dead end. A
tombstone bucket (one left where a whole bucket used to be) is the
whole-bucket version of this; the breadcrumb is the per-item version.

This is the human half, and it should not depend on remembering to leave
it while hot -- hence a welded rule, not a habit. The machine half is
the finder resolving "where is <number>" across every bucket regardless
of where it landed (/plan-find's exact-id lookup), so the
browse-by-number reflex just works and the breadcrumb is the backstop.

MOVED-MARKER NODE (supersedes the prose breadcrumb) [2026-07-18, Brian
"make it nodes not text neither one of us reads"]: a relocated
frozen-band item ALSO carries a marker NODE in its number-implied bucket
-- id = <real-id> + "m" (0550m for 0550, 0550bm for 0550b; the numbered
shape allows the trailing letters), status MOVED, title "MOVED -> <home
bucket> (<real title>)", and a super edge to the real node. So browsing
the number lands on a real node whose one edge is the way home, not on
bucket.md prose. A marker is super-only: it carries no needs, so it
can never be half of a cycle, and it carries neither a done nor a
dead field.

MOVED IS NOT TERMINAL, and the word "terminal" was doing two jobs
here. Separate them, because they are independent properties and a
marker has neither:

- SETTLED = DONE or DEAD. A settled node will not change again, so it
  CLEARS a needs edge -- a dependent stops waiting on it. This is the
  only property that moves the frontier for OTHER nodes.
  plan-graph.js: aTERMINAL / fIsSettled.
- BUILDABLE = READY or PARTIAL. Only a buildable node can be on the
  ready frontier or be reported BLOCKED. plan-graph.js: aBUILDABLE.

MOVED is buildable-never (correct, a marker is not work) and
settled-NEVER. So a needs edge pointing at a moved-marker leaves its
dependent BLOCKED forever with nothing dangling, nothing unstatused,
a legal shape, and --check clean -- the Dear Liza silence reached by
a different road. NEVER need a marker; need the node it points at.
The spec called MOVED "terminal" from 2026-07-18 until this was
caught, which would have licensed exactly that edge.

The prose destination-list breadcrumb is then redundant and comes out.
A one-line prose pointer stays only for the cases a marker cannot
cover -- a renumbered item whose old number is no longer any node at
all -- and it names the TREE bucket, never a file outside the tree. A
tombstone bucket remains the whole-bucket version.

## Maintaining the tree

Claude is the generator, NOT a script. A plan change is hand-edited
into the small files in the SAME commit as the change -- the same
action-coupled rule as every index.cld. The small-file structure
exists so those edits stay small. Do not build a bulk regenerator;
"updating huge stuff" is the thing the split was done to avoid.

THE WELD. A plan change is never one file. After any change, ALL of
these are true in ONE commit, or none of them are:
- the node's fields in its bucket.json
- its prose .md, if it has one
- the dir index.cld (a new bucket.json or plan.json needs its entry,
  same as any file)
- one edges.json line per needs/super added or removed
- the moved-marker node, if a frozen-band number relocated
- `node plan-graph.js --check` clean, run from notes/plan/

The runbook for an ITEM change -- new node, status, edge, move -- is
/plan-write-back. It is the driver; this file is what it cites. Do
not restate its steps here, and do not let it carry a rule that is
not here.

NEVER STORE A COMPUTED FIELD. No blocked, no ready, no frontier, no
counts. The reader and the page derive them every read, and a derived
thing written down is a thing that goes stale silently. Same rule as
"no stored BLOCK:N" -- and it binds this document too, which is why
the vocabularies are listed here and the census numbers are not.

JSON HYGIENE, because these files are hand-edited and read as diffs:
two-space indent, fields in the order the field reference lists them,
and nodes in the order they were added -- NEVER re-sorted. A re-sort
makes every later diff unreadable and buries the one line that
changed. A new node goes at the end of "nodes".

### Adding a bucket

The one procedure that is in no skill, and the one most easily got
wrong by guessing. The "shape" field is one answer to that guess;
this is the other half of it.

1. NUMBERED or NAMED. Numbered when the cluster is a roadmap area
   wanting a place in the numeric ordering: id is a frozen number,
   dir is NNNN-slug, numbering policy in plan.md. NAMED when it is a
   standing concern with no position on a roadmap: id = dir = the
   slug (bugs). Both forms are FIRST CLASS -- named is not an
   exception to numbered.
2. /plan-dupecheck the id. A number spent on a DONE item is still
   spent; ids are globally unique across the WHOLE tree.
3. Create the dir and its bucket.json: bucket, title, shape, and
   either nodes or subs -- never both.
4. Pick the SHAPE from the vocabulary in "## Shape". If nothing fits,
   that is a spec change: document the new shape THERE and teach
   fShapeError in plan-graph.js in the SAME commit, or the new
   grammar is unguarded.
5. bucket.md if and only if the bucket has header prose of its own --
   both the file and the "body" field, or neither.
6. ONE plan.json entry { id, title, dir }, no matter how deep the
   bucket nests. A named bucket's sub-kinds are NEVER flattened into
   sibling top-level entries. The buckets array
   is ORDERED and the order is EDITORIAL -- not alphabetical, not
   numeric -- so put the entry where it reads best among its
   neighbours. plan-graph.js reads only "dir"; "id" and "title" are
   the page's, and that title is the one duplication the model
   accepts (bucket.json carries its own), kept in step by hand.
7. index.cld in the new dir, and the parent's index.cld updated.
8. --check clean.

## The reader / checker

notes/plan/plan-graph.js -- node, read-only, RUN FROM notes/plan/.
The mode is argv[2] and defaults to --ready; the root is argv[3] and
defaults to "." (hence run-from-the-dir), except for the modes taking
a filter, where argv[3] is the filter and the root slides to argv[4].
It never writes; every report is derived on every read.

The modes fall into three kinds, and the kind is the whole point: a
GATE is a rule you have broken, a SMELL is a question for Brian, and
confusing the two is how a smell gets auto-"fixed" into a lie.

ANSWERS -- what is the state of the plan
- --ready   the frontier (buildable now, no open blocker). The
  default when you pass nothing.
- --blocked what waits and on what
- --lineage the super (provenance) chains: each "X continues Y" edge
- --edges [id]  every edge with both endpoints' status and title -- the
  coverage report for the semantic edge audit; with an id, only the
  edges touching it (either end), the titled to/from lookup
- --outline [n]  the plan collapsed to n levels (default 2; 1 = the
  bucket headers) -- the outline view, driven by plan-find's depth
  argument
- --types [type]  the type census: every node grouped by type, UNTYPED
  last as a bare count. With a type, just that type's members. This is
  where the type counts live -- never in prose.
- --specless  the leaf buckets holding no type:spec node AND no
  type:ramblings node. Deliberately NOT part of --check, and that is
  the design note: on day one every bucket is specless, so gating on
  it would fail every commit and teach the next session to bypass the
  gate. It is a question you ask, not a rule you break. Wire it into
  --check once the buckets that want specs have them.

GATES -- exit 1 on findings. Run --check before any plan commit.
- --check-edges  edges.json against the edges on the nodes, both
  directions: MISSING (on a node, not in the index), STALE (in the
  index, on no node), NOINDEX (edges.json absent).
- --liza    needs-cycle hunt (the Dear Liza check, docs/dear-liza/):
  prints each loop as "a needs b needs a"; clean says "no hole in the
  bucket". Also runs inside --check.
- --check   the drift audit: a needs OR super pointing at a node not
  in the tree, a node with no status, an unknown type value, any
  bucket whose declared shape its contents contradict (missing or
  unknown shape, a container carrying own nodes, a numbered bucket
  with a non-numeric id, a slugged bucket with a non-slug id, a lane
  sub that is not implemented/proposed, a wip lane holding more than
  one node), plus --check-edges and --liza in full. It also prints the
  non-failing DEAD ADVISORY: a buildable node still needing a DEAD
  target, which usually wants repointing or dropping but is not drift
  the way a dangling edge is. This is what keeps the hand-maintained
  bucket records honest.

  WHAT --check DOES NOT CHECK, so you must: the STATUS vocabulary (see
  "## Status" -- any string passes today), and whether a node's "body"
  names a file that actually exists. Both are known holes, not
  guarantees.

SMELLS -- report only, exit 0. Every finding is a QUESTION, never a
verdict and never an auto-fix; the ruling is Brian's.
- --suspect the needs edges whose target is already settled (DONE or
  DEAD) -- provenance-mis-encoded-as-dependency smell, the pre-filter
  that orders the plan-edge-audit queue
- --prose [id]  the reverse smell: node A's body .md names node B's id
  with no needs/super edge either direction -- a dependency (or
  lineage) possibly left in prose, the edge audit's second pre-filter.
  A mention is a SMELL, not a verdict: the ruling is Brian's, exactly
  like --suspect. Skips moved-marker pairs, both-terminal pairs, and
  implemented-lane inventory nodes (their ids are ordinary words).
  The unfiltered queue is large; drain it per node ([id]) or per
  bucket (grep)
- --mine [id]  the ROT queue: items whose PREMISE may have gone
  stale, the third smell pre-filter beside --suspect and --prose.
  Three findings -- STUB (a buildable item of a line or two that
  names no code at all: nothing grounds it, so nothing can ever
  contradict it), GONE (it names a file that is not on disk), MOVED
  (a named file was committed to after the item's own body, with the
  gap in days; a file.js:NNN line ref is flagged too). Settled nodes
  are skipped. Born 2026-07-26 after several items in one sitting
  turned out to describe a world that had moved.

WHY THE SMELLS ARE THEIR OWN KIND, and why --mine had to be invented:
a rotted node BREAKS NO RULE. Its status is set, its edges resolve,
its shape is legal, so --check is clean and STAYS clean while the
node describes a world that no longer exists. That is the Dear Liza
silence one level up -- there the graph is wrong, here the graph is
right and the PROSE is wrong. Which is also why --mine's date half is
deliberately the weak half: this repo commits prose and code
together, so a node and its code often share a timestamp and compare
equal. STUB is the half that carries it.

UNKNOWN SWITCHES DO NOT FAIL. The dispatcher's final branch is both
"no argument" and "anything I did not recognise", so `--lisa`,
`--redy`, `--check-edge` each print the ready frontier and exit 0. A
session that believes it ran the cycle check may have run nothing.
Until that is fixed (a usage line and a reject branch), READ THE
FIRST LINE OF THE OUTPUT, not the exit code.

## The page

- html/plan.html + html/plan.css -- standalone full-tab extension page.
- lib/plan-boot.js -- the controller on the vendored Cytoscape + fcose.
  DATA_ROOT (#osDataRoot) points at the tree (notes/plan).
- Reached from the extension's toolbar button (background.js:
  tabs.create on getURL).
- Cluster (fcose) is the ONLY layout. Flow (breadthfirst) was retired
  2026-07-16: it laid the disconnected buckets in one huge
  row, every open re-fit the whole graph, and deep levels pinned zoom
  at the floor as unclickable specks -- the "renders for Claude, not
  for Brian" bug.
- Labels: a numbered bucket shows id + title; a named bucket shows its
  title once (not the id + title "dept of redundancy" double); a
  sub-bucket shows its leaf dir name only (proposed, implemented, hooks)
  -- the parent super-node it nests under supplies the kind context, so
  the "hooks/" prefix on hooks/proposed was redundant.
- Interaction: buckets are super-nodes; tap one to pop out its items
  or sub-buckets (fetch bucket.json) and wire the needs edges; tap an
  item to read its .md. ?open=<bucket> deep-links.
- TWO VISUAL AXES since 2026-08-10: node COLOUR is status (where a
  node is in its life, incl. the computed BLOCKED) and node GLYPH is
  type (what it IS -- barrel ramblings, round-rectangle spec, hexagon
  build, diamond bug, round-tag doc, round-triangle tooling, and the
  plain ellipse for untyped). The glyph axis has NOTHING to do with a
  bucket's "shape" field; see the collision note under "## Shape".
  They are separate channels on purpose:
  colour was already spent, and overloading it would make the axes
  fight. Untyped drawing as the ellipse means nothing on the page
  changes appearance until a node is deliberately typed. The legend
  carries both rows, and the item panel shows both pills -- status
  filled, type outlined -- because showing one alone is how a reader
  inherits the old single-field model.
- Edge rendering draws only needs edges today. The super (provenance)
  edges are data + CLI (plan-graph.js --lineage) for now; drawing them
  on the page -- as a visual DISTINCT from needs (dashed / different
  colour / arrowhead direction) so a dependency never reads as lineage
  -- is a deferred page concern, parked as a likely Fable pass
  [2026-07-18, Brian]. Until then, trace lineage with --lineage.
