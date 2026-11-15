---
name: plan-dupecheck
description: Check whether a plan item id -- a number or a slug -- is free before assigning it. Greps the plan tree's bucket.jsons, the list of numbers the old flat plan spent (notes/plan/spent-ids.txt -- history still spends numbers), and Claude/summaries; reports FREE or TAKEN with the owning line. Given a bucket, proposes the next free number by that bucket's step. Ids are globally unique across the WHOLE tree, so this is the guard at the moment of naming.
---
Purpose: stop plan-id reuse. In the archive 1108, 1032, and 1150 each
ended up meaning two unrelated items because a number was spent twice.
The tree raises the stakes: node ids are globally unique across every
bucket (a needs edge names its target by id alone -- plan-tree.md).
The flat files are gone -- retired at the 2026-07-19 switch, removed
2026-11-12 -- but their numbers stay spent, every one of them kept in
notes/plan/spent-ids.txt: history must clear an id too, or an old
summary reference becomes ambiguous.

Procedure:

1. $ARGUMENTS is an ID -- a number (0540, 23150) or a slug (kill-flow):
   - Tree first:
     `grep -rn '"id": "<id>"' --include=bucket.json notes/plan/`
     (bucket.jsons are the authority; an edges.json hit only mirrors
     one).
   - History: `grep -n "^<id> " notes/plan/spent-ids.txt` -- every
     number the old flat plan used, one line per use -- and
     `grep -rn "<id>" Claude/summaries/`.
   - No hits anywhere -> report FREE.
   - Any hit -> report TAKEN and show the matching line(s) so Brian sees
     what already owns it. A number spent on a DONE or DEAD item is
     still taken.

2. $ARGUMENTS names a BUCKET (e.g. "0500", "next in 23000"), or is empty
   with a bucket already in context:
   - Read that bucket's used numbers from the tree bucket's
     bucket.json, then propose the next free slot by the bucket's own
     step:
       * 0000-0500 governance steps by 10 (0510 / 0520 / 0530 -> 0540)
       * sub-items step by 20 (23100 / 23120 / 23140 -> 23160), on
         from the bucket's highest number -- never by 100: a 1000-wide
         bucket stepped by 100 is full after ten items (Brian,
         2026-11-08: "20 at most you think your gonna need 20 items
         between them?"). Numbers already spent stay as they are.
       * an insert between two items takes the midpoint (12150 between
         12100 and 12200; 23110 between 23100 and 23120)
       * these are defaults, not law: Brian picks freely, and his pick
         stands if it is FREE (13701, 2026-11-08: "be flexible")
   - Confirm the proposal is FREE via step 1 before offering it.

After this check passes, the item is written via /plan-write-back
(bucket.json + .md + index.cld, same commit). This skill only checks
the id; it does not write the item.
