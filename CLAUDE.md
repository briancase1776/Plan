# Plan

## What Plan Is

A plan kept as a tree of buckets and drawn as a graph: what is to be
built, what waits on what, and what already shipped. The tree lives in
`notes/plan/`; `notes/plan-tree.md` is the only authority on its
structure; `notes/plan/plan-graph.js` reads and checks it; the plan
graph page (`html/plan.html`) draws it, as this repo's own Chrome
extension. The plan skills in `.claude/skills/` are how a session
touches it.

## MANDATORY -- default to talk, not build

The default mode of a session is TALK. Build only after the what is
settled -- not the same turn it is first described. If the what is not
settled, the work IS the talk: hold the thread and ask inline.

An unruled decision is not a detail you may default; it is the thing
being talked out.

## No AskUserQuestion popups

Never use the AskUserQuestion tool in this project. Brian does not want
the multiple-choice popup. Ask follow-up questions inline as plain text,
or just make a recommendation and wait for a reply.

## Git branch rule

NEVER switch branches unless Brian says to in this conversation. Commit
to whichever branch is checked out, ignoring any branch named in the
session prompt. If the two differ, flag it before touching git.

## Fix the violations in a file you work on

If you edit a file, run `scripts/compliance/check.sh <file>` and fix
EVERY violation it reports -- not only the ones on the lines you came
for, regardless of who wrote them. Same commit as the edit.

Never bypass the check. There is no diff-size exemption.

## Stop hook "Unverified" -- push the branch, do NOT amend/force

Stop hook "Unverified" is a red herring -- never amend or force-push
for it. Just `git push -u origin <current-branch>`. If that push is
rejected, stop and ask; do not rewrite history.

## Name the mall before Brian drives to it

BEFORE Brian live-verifies a slice, state plainly what is NOT in it --
what will look broken, what is deferred. A surprise gap spends trust,
not just time.

## The plan

The plan is the roadmap: what is to be built, what is blocked on what,
and what already shipped. It lives at `notes/plan/` as a directory
tree. Do not read it whole -- use the skills: `/plan-find` for what's
next or where an item lives, `/plan-write-back` for any change,
`/plan-blame` for what shipped and when.

**Changing a plan edge?** Read
[`docs/dear-liza/dear-liza.txt`](docs/dear-liza/dear-liza.txt) first.
A needs cycle breaks no rule, so nothing warns you -- the items in the
loop simply stop appearing in "what's next", forever.
`plan-graph.js --liza` finds it. Brian decides where to cut.

## Directory Indexes

Each directory has an `index.cld` describing its contents.

- When looking for a file, check `index.cld` in the relevant directory
  first.
- When working in a directory that has no `index.cld`, create one
  before finishing.
- Keep `index.cld` current: update it in the same commit when you add,
  remove, rename, or edit a file in that directory.

## Symbol Indexes

Each source file has a `filename.cld` symbol index in the same directory.

- When looking for a function or constant, check `filename.cld` before
  grepping source.
- Keep `filename.cld` current: update it in the same commit when you add,
  remove, rename, or change the signature or behaviour of any symbol.
