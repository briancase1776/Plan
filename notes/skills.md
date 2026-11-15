# Skills

A skill is a named command Claude runs (e.g. `/plan-find`). We turn our
repeated hand-procedures into skills because a command cannot be skipped
the way a written rule can -- invoking it IS the trigger. Full argument:
[`anti-drew.md`](anti-drew.md), "Action-coupled, not time-coupled".

NORTH STAR: a skill exists because a future session NEEDS it -- the whole
point is getting the next Claude what it needs to not flail
(anti-drew.md), NOT filling a matrix. Everything below serves that.

This file has two layers:

1. THE GRID -- a GENERATIVE aid for the regular .cld operations: cross
   the axes and useful skill ideas fall out. It is NOT a limit and NOT
   the list of what exists. A skill that fits no cell (`bugs-import`,
   the lifecycle verbs, whatever a future session needs) is equally
   real.
2. THE AUTHORING RULES -- how any one SKILL.md is written. Uniform; they
   do NOT multiply with the grid.

The full list of shipped skills is `.claude/skills/index.cld` (the
catalog). This file is the standard + the generative grid, NOT a roster
-- it does not enumerate what exists, and a built skill's own
`.claude/skills/<name>/SKILL.md` is its spec.

---

## Layer 1 -- The grid

The skill set is GENERATED, not enumerated: cross the domains with the
operations and the names fall out of the name format. Add a domain or an
op and the grid grows; you do not rewrite it.

### Name format

```
domain-operation[-qualifier]
```

- domain     -- what is operated on (a .cld type, below)
- operation  -- the verb (find, dupecheck, read, write, audit)
- qualifier  -- a variant of the operation (audit depth)

Carve-out: a standalone session-lifecycle verb stays BARE (`wrap`,
`boot`, `resume`, `park`) -- a lone verb with no sibling ops has nothing
to disambiguate against, and `/wrap` reads better than `/session-wrap`.

### Domains -- the .cld types

```
domain     .cld file                      format spec
--------   ----------------------------   ------------------------------
index      index.cld (per dir)            dir-index-format.txt (CLD-DirIndex)
filename   <file>.cld (per source file)   file-index-format.txt (CLD-FileIndex)
plan       plan/ (bucket.json,      plan-tree.md (Plan root)
           edges.json, index.cld)
```

### Operations

```
op          does
---------   ----------------------------------------------------------
find        locate a symbol / file / item THROUGH the index, not grep
dupecheck   is this identifier free? (plan id, symbol name)
read        display one entry from the index
write       add / edit an entry AND keep the index current, same commit
audit       index vs reality; three depth layers, set by qualifier:
  partial     current edit (staged diff), MECHANICAL -- pre-commit gate
  full        one file, DEEP (mechanical + judgment: stale gist, brief)
  recursive   many files (a tree), MECHANICAL sweep -- on-demand health
```

### The grid (sparse)

Cross domain x op. `Y` = a meaningful cell (build when needed, not a
day-one commitment); `--` = N/A; `[S]` = shipped, see `.claude/skills/`.
The audit column is NOT one skill: each `Y` there is THREE separate
skills, one per depth qualifier -- `<domain>-audit-partial`,
`<domain>-audit-full`, `<domain>-audit-recursive`. So `plan` audit is
`plan-audit-partial` / `-full` / `-recursive`, distinct from `index`
audit, distinct again by depth (the shipped
plan-edge-index-audit-partial / -full are the pattern in use). One
SKILL.md each, never a dispatch.

```
           find    dupecheck    read   write     audit
index      Y       --           Y      Y         Y
filename   Y       Y            Y      Y         Y
plan       Y[S]    Y[S]         Y      Y[S]      Y
```

Sparse-cell notes -- the only per-cell detail worth keeping:

- dupecheck only where a namespace can collide: plan ids, filename
  symbols. Dir indexes have none.

### Skills outside the grid

The grid covers the regular .cld ops. Plenty of useful skills are not
grid-shaped, and that is fine -- the grid is a generator, not a fence.
Expect this section to grow as new needs surface; new FAMILIES can get
their own generator like the grid, one-offs just get a SKILL.md.

Session-lifecycle (bare verbs; act on the session):

```
wrap           write the session summary at session end
boot           read the CLAUDE.md session-start reading list
resume         pick up paused work
park           save paused work for a later session (a.k.a. checkpoint)
```

Not grid-shaped (a bridge to GitHub issues, not a .cld op):

```
bugs-import   [S]   file open GitHub issues as bug nodes
bugs-close    [S]   close a fixed bug's node and its issue together
```

### Plan buckets

The plan (plan/) owns the build order for skills, not this
file; a plan item for a skill points here.

---

## Layer 2 -- Authoring rules

How any one SKILL.md is written. Uniform across every cell of the grid.
Filled in as we settle each; [settled] items are decided, [TBD] are
still open.

### Naming [settled]

`domain-operation[-qualifier]` per Layer 1; lifecycle verbs may be bare.
One skill = one procedure. If the procedure changes with the target
type, that is SEPARATE skills (plan-find vs plan-edge-index-find), NOT a
dispatch buried inside one skill.

### Args [settled]

`$ARGUMENTS` carries everything after the command. Every skill defines a
no-arg default: the most common zero-friction action, usually acting on
ambient context (the staged diff, the cwd, the session). If a skill
genuinely cannot act without input, no-arg prints a one-line usage.

An argument comes in two KINDS, and the skill branches on which:

- EXACT key -- a greppable identifier (a plan id like 0550 or
  kill-flow, a symbol name). Grep the index and jump straight to the
  hit; no disambiguation.
- VAGUE paraphrase -- read / fuzzy-match the index, present the best
  candidates, disambiguate inline.

Reading the index is the FALLBACK for the vague case, not the default:
the indexes are what made an identifier like 0550 directly greppable, so
an exact key is a plain lookup.

### Frontmatter [settled]

Two fields: `name` + `description`.

- `name` = the domain-op[-qualifier] invocation, matching the skill
  folder (.claude/skills/<name>/).
- `description` is the ROUTER, not a summary: the harness reads it to
  decide WHEN to surface the skill. Lead with the trigger situations --
  when to reach for it, in the user's own phrasing -- then what it does,
  and note the no-arg behavior. If it does not say WHEN, the harness
  cannot fire it.
    BAD   "Finds plan items."  (what, not when -- never fires)
    GOOD  "Find a plan item from a paraphrase ... with no argument,
          lists the READY items ('what's next')."  (names the triggers)

### Body shape [settled]

Three parts, in order:

1. Purpose -- 1-3 sentences: the problem this skill solves and why it
   exists, NOT a restatement of the description. Name the substrate it
   reads or writes (e.g. "the plan lives in ONE substrate: the tree at
   plan/").
2. Procedure -- numbered, imperative steps: the runbook. Branch on
   $ARGUMENTS (no-arg default / exact key / vague paraphrase, per Args).
   When the skill writes a formatted file, read that format spec FIRST
   and do not reinvent it (plan-write-back reads plan-tree.md
   before writing).
3. Scope guard -- a closing line stating what the skill may and may NOT
   touch: read-only, or writes only to <path>. See the next rule.

### Format spec: paraphrase to read, cite to write or audit [settled]

[Brian 2026-07-05] Whether a skill DESCRIBES the .cld format inline or
pulls in the format spec is a token-economy call, decided by the
operation:

- READ side (find, read, dupecheck) -- PARAPHRASE. A one-line
  description of what an entry means ("an F/D entry with a gist") is
  enough to grep and report, and it is far cheaper than dragging the
  whole format spec into context. This is the same economy the indexes
  themselves buy: terse shorthand so nobody re-reads the source. Citing
  the whole format spec here would pay thousands of tokens to avoid
  writing eight.
- WRITE side (the write ops) and AUDIT -- CITE the spec. These
  PRODUCE or VERIFY the exact format, so a paraphrase drifts and emits
  wrong bytes. plan-write-back reads plan-tree.md before
  writing; a mechanical audit engine encodes the format rules exactly
  (a paraphrase there produces false findings). Shorthand is not safe
  where format correctness is load-bearing.

Rule of thumb: cheap shorthand where a shallow read suffices, the real
spec where the skill's output has to BE correct format.

### Read vs write scope guard [settled]

Every skill declares its blast radius in the scope-guard line.

- READ-ONLY skills (find, dupecheck, read, audit) say so: they print,
  they never mutate.
- WRITING skills (the write ops) name the EXACT paths they may touch
  and nothing else -- plan-write-back writes only under plan/. A
  skill that writes to a .cld keeps that index current in the SAME
  action (the same-commit index rule).
- audit is deliberately READ-ONLY even when it finds drift: it reports
  and OFFERS the fix, it does not apply it. That is what lets
  audit-partial be a safe blocking pre-commit gate (see Skill vs hook).

### Reporting -- a skill failure is a bug [settled]

If a skill FAILS -- cannot complete its procedure, errors mid-step, or
returns a wrong result -- that is a BUG, in the skill or in the substrate
it reads, and it must be REPORTED, never swallowed. Surface it to Brian
at the point it happens, with the context that produced it (which input,
which step, which file) -- the same reason a failure check belongs at
the call site instead of a distant catch.

Distinguish two outcomes:

- an honest empty result (no match for a paraphrase; a number is FREE) is
  a NORMAL answer -- report it plainly, it is not a bug.
- the skill could not DO its job (malformed index, a step threw, wrong
  output) -- that is the bug. Report it, and once understood capture it
  so it is fixed, not rediscovered: a bug node in the bugs bucket, or a
  plan item if it needs real work.

A skill must not fake success or fail silently. A silent skill failure is
worse than a loud one: the memory apparatus then trusts a result that
never happened.

### ASCII / dev-practices [settled]

A SKILL.md is markdown, not source, so only part of the development
practices applies.

- HEADER: the YAML frontmatter IS the file header. A SKILL.md does NOT
  get the Doxygen / C-style source header -- that block is for source
  files.
- APPLIES: ASCII-only (the practices list .md explicitly) and the prose
  hygiene scripts/compliance/check.sh checks -- 80 columns, no trailing
  whitespace, final newline, blank-line cap. Same as any doc in notes/.
- DOES NOT APPLY: the JS code rules (Hungarian prefixes, single-exit,
  natural-sentinel returns, class modeling, Doxygen method comments) --
  there is no code in the prose.
- EXCEPTION: a skill that ships a companion SCRIPT (e.g. an audit
  engine) -- that script IS source and follows the development
  practices in full: Doxygen header, Hungarian naming, 80-col, ASCII,
  sentinels.

### Location + same-commit skills/index.cld [settled]

A skill lives at `.claude/skills/<name>/SKILL.md`, where `<name>` is the
frontmatter `name` (the domain-op[-qualifier] invocation). One directory
per skill.

`.claude/skills/` has its own `index.cld` (a directory index, like every
directory's): one `D <name>/` line per skill with a one-line
gist. The standing index rule applies -- add, rename, or remove a skill
and update `.claude/skills/index.cld` in the SAME commit. A companion
script that ships with a skill lives in that skill's own directory.

A plan skill works on the plan/ of whatever repo the session is in,
and finds the plan system -- the spec, the reader, the checker -- in
the Plan checkout it was loaded from: `realpath <base>/../../..`, its
own base directory three levels up, written <PLAN> in the commands.
Never a repo name or a checkout path written into a skill; each
SKILL.md opens with the same Paths paragraph saying so.

### Skill vs hook [settled]

A skill is USER-invoked (a slash command, action-coupled to Brian's
keystroke); a hook fires AUTOMATICALLY on an event (pre-commit,
SessionStart). The same logic can serve both -- ship ONE engine and wire
it to each trigger:

- audit-partial: a mechanical staged-diff check can run as the
  pre-commit HOOK (automatic gate) and on demand as a skill
  (plan-edge-index-audit-partial is the skill half). One script; the
  hook and the skill are presets over it, the way
  scripts/compliance/check.sh takes the whole project by default and
  explicit paths by hand.
- boot: the session-start reading list could be a SessionStart HOOK
  (fires automatically) or a /boot skill (user-invoked) -- different
  triggers, maybe both.

Choose by trigger:

- must NOT be forgotten, fires on a real event -> HOOK.
- the human decides when -> SKILL.
- both -> one engine, wired to both.

Two hard constraints for anything that runs as a BLOCKING pre-commit
hook, or the gate backfires:

1. Scope to the STAGED diff only. Auditing the whole tree re-flags
   pre-existing drift unrelated to the commit; the gate asks one
   question: "you touched X, is X's index still true?"
2. Keep it MECHANICAL / deterministic. An over-firing hook gets
   `--no-verify`'d into a disabled guard, WORSE than none. Judgment
   (stale gist, missing brief) stays in the on-demand skill, never the
   gate.

### CLAUDE.md ## Skills pointer [OPEN -- standing]

The idea: a `## Skills` section in CLAUDE.md routing a fresh session here
(the standard) and to `.claude/skills/` (the shipped set), the same way
CLAUDE.md points at notes/anti-drew.md and the dear-liza decoder -- a
pointer, not a copy.

STANDING OPEN QUESTION [Brian 2026-07-04], not a task waiting to be done.
It is the anti-drew injection-channel problem in miniature: an
always-injected pointer competes with the incoming task (anti-drew.md,
"Action-coupled, not time-coupled"), while a SessionStart HOOK fires
automatically but is machinery not yet built. This does not get a clean
answer until that broader "how does a fresh session discover things"
question does -- so it stays OPEN on purpose. Do NOT mark it settled or
quietly add the pointer. A draft pointer was written and reverted.
