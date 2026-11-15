# Anti-Drew

Why the .cld indexes, the spec and the skills exist at all.

## The problem

Every session wakes with no memory of the last: fresh container, gone
conversation, codebase re-derived from scratch. Drew Barrymore's
character in 50 First Dates re-learns her whole life every morning; a
fresh Claude re-learns this whole project every session.

The expensive part is not reading any one file. It is the flailing
before it: globbing, opening three wrong files, rebuilding a map of
what lives where and what was already decided. That noise also floods
the context window and degrades every judgment made after it, so
tokens, context quality and build quality are one axis.

## Availability, not front-loading

"The more information I make available to you the more luck I will
have. You don't have to read everything available; it just needs to be
THERE in case you need it."

So the indexes are not a reading list. Nobody reads every index.cld
and filename.cld in a session -- they sit encoded so the one you need
is a lookup. Re-introduction is a lookup, never a performance.

## Action-coupled, not time-coupled

The system lives or dies on when a rule fires relative to what you are
already doing.

- Welded to an action, a rule is honored: "update the index in the
  same commit" lights up while you are already touching the file.
- Aimed at the clock, a rule is skipped: "read these at session start"
  competes with the incoming task, and the task is louder.

A rule that carries its reason gets buy-in; a bare order gets
resistance.

## Map, not a debugger

These tools say where things are and what was decided. They do not say
why a function returns undefined on the empty-array path. Behaviour
lives in the code, and only the code settles a bug. So the value is
front-loaded: highest at the start of a task, near zero mid-bug-hunt.
A BUGS FIXED note cannot fix a bug; it can only stop you
re-investigating a solved one.

## The tools

CLAUDE.md carries the reading list. `.claude/skills/index.cld` carries
the skill roster. Both are maintained. Do not copy either into this
file.
