---
name: bugs-close
description: Close a fixed bug BOTH places it lives -- mark its bugs-bucket node DONE with the fix commit, and close its GitHub issue with a comment pointing at the fix. Reach for it on "close the bug", "that bug is fixed", "close issue N", "mark <slug> done" -- at the moment a fix has landed and been verified. Takes a bug slug or issue number; with no argument, prints usage plus any bug nodes whose fix looks landed but unclosed.
---
Paths: <PLAN> is the Plan checkout this skill was loaded from --
`realpath <base>/../../..`, where <base> is this skill's base
directory. The spec is <PLAN>/plan-tree.md, the reader
<PLAN>/plan/plan-graph.js, the hygiene checker
<PLAN>/scripts/compliance/check.sh. The plan worked on is plan/ in the
repo the session is working in; run every command below from that
repo's root. No repo name or checkout path is written into this
skill.

Purpose: bugs-import walks GitHub issues INTO the plan tree; nothing
walked the loop back out, so a fixed bug needed two hand-edits (the
node, the issue) and either half could be forgotten -- a half-closed
bug lies to whichever side you read. This skill is the weld for the
close: plan-side DONE and issue-side close land together or the
mismatch is reported loudly.

Procedure:

0. NEVER drop the node's `type` field while editing it. This skill
   rewrites status and adds done; both live beside type in the same
   node object, and a rewrite that omits it silently untypes the bug
   (plan-tree.md "Type -- what a node IS"). Nothing else here touches
   type -- an imported bug is type:bug and stays type:bug when it
   closes.


1. Read <PLAN>/plan-tree.md FIRST -- write ops cite the spec
   (skills.md): the DONE status + done field format
   ("YYYY-MM-DD commit:<hash>"), the welded index rules.

2. RESOLVE the target in plan/bugs/:
   - issue number -> grep bugs/*.md for "issue #<n>" (bugs-import's
     provenance line).
   - slug -> match bucket.json node ids.
   - vague paraphrase -> fuzzy-match node titles, disambiguate
     inline as plain text (never the AskUserQuestion popup).
   - NO ARGUMENT -> print one-line usage, then scan for candidates:
     bug nodes still READY whose slug or issue is named in a recent
     fix commit (git log --oneline -20). Report; close nothing.
   Already DONE/DEAD -> say so and stop (re-closing is a no-op).

3. GATE ON EVIDENCE: a bug closes on a LANDED fix, never intention.
   Required before any write: the fix commit hash, and the verify
   that showed it fixed (test name, or Brian's live-verify -- his
   word in this session counts; closing is his ruling, this skill is
   the sanctioned path bugs-import step 6 points at). Missing either
   -> STOP and say what is missing.

4. PLAN SIDE, one commit (the /plan-write-back status weld):
   - bugs/bucket.json: status -> DONE, done field
     "YYYY-MM-DD commit:<fix-hash>".
   - the bug's .md gains a terse FIXED footer: date, fix commit,
     one-line what-changed, the verify.
   - bugs/index.cld: the entry's gist gains the fixed marker.
   - VERIFY node <PLAN>/plan/plan-graph.js --check plan and
     <PLAN>/scripts/compliance/check.sh plan/bugs both clean, then
     commit; message names the slug and issue number.

5. GITHUB SIDE (only if the node carries an issue provenance line --
   a hand-filed bug with no issue skips this half, say so): close
   the issue with a short comment naming the fix commit and the
   one-line what-changed. The issue is the one the provenance line's
   URL names (github.com/<owner>/<repo>/issues/<n>) -- take owner,
   repo and number from it, never from a name written into this
   skill. Remote session: GitHub MCP tools
   (ToolSearch "issue", then the issue write tool, state closed,
   state_reason completed); local CLI: gh issue close <n> --comment.
   If the GitHub write FAILS, the plan side has already landed --
   report the half-closed state loudly so the issue gets closed by
   hand; never pretend it closed (skills.md: a skill failure is a
   bug).

6. REPORT WHAT THE CLOSE UNBLOCKS: grep plan/edges.json for
   needs edges targeting the closed slug and check each dependent's
   remaining gates (plan-graph.js --ready). "pop-cluster-edge-
   transfer closed -> 10100 has one gate left" is the payoff line;
   a close that frees the frontier should say so.

Scope guard: writes ONLY under plan/bugs/ (bucket.json, the
one item .md, index.cld), and the ONE named GitHub issue (close +
comment -- never labels, edits, or other issues). Never a computed
field. Report, do not swallow, any check or close failure.
