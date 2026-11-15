#!/usr/bin/env node
/* scripts/plan-leak/check.js
 * @brief Plan status-leak scan: READY/PARTIAL nodes whose body says a
 *   decision is UNRULED. Their status may be lying: READY counts as
 *   buildable (plan-graph.js aBUILDABLE), so a diagnosed-but-unruled
 *   item advertises work nobody can start. type:ramblings is EXEMPT --
 *   an unruled thing in one is the content, not a lie, so it would fire
 *   forever.
 *
 *   Run from the root of the repo whose plan it reads; the plan dir is
 *   the one argument and defaults to plan. Node, like plan-graph.js,
 *   because it walks bucket.json.
 *
 *   Came from DNA Tools on 2026-11-15, where it was the wrap-time
 *   plan-leak check (its plan item 0590). There it had a second scan,
 *   --channel, over an ICC maildir; that maildir was ruled dead, so
 *   only this scan came across.
 *
 *   THIS IS A PROMPT, NEVER A GATE. It exits 0 on any finding. The
 *   signal is not well defined -- two independent regexes over one tree
 *   produced overlapping-but-different sets with false positives on
 *   BOTH sides -- and the discriminator it cannot make, "does the
 *   unruled thing block the WHOLE item", is exactly what a status
 *   encodes. So it prints "check these", never "these are wrong", and a
 *   human sets the status. The one non-zero exit is a plan dir that is
 *   not there: a scan that read nothing must not read as all clear.
 * Copyright (c) 2026 Brian Case. All rights reserved.
 * AI contributor: Claude (Anthropic)
 * MIT License -- see LICENCE.TXT
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const aBUILDABLE = ['READY', 'PARTIAL'];

/* The union of two sessions' regexes. Deliberately broad: a prompt
 * that misses is worse than one that over-fires, because the human
 * reading it can discard a false positive and cannot recover a silent
 * miss.                                                              */
const oMARKER = new RegExp(
  'unruled'                    + '|' +
  "Brian's call"               + '|' +
  'Brian rules'                + '|' +
  'he rules'                   + '|' +
  'not yet ruled'              + '|' +
  'decision pending'           + '|' +
  'awaiting a ruling'          + '|' +
  'needs a ruling',
  'i');

/* A body carrying this line is skipped. The check's own spec node is
 * the loudest hit in the tree -- describing the problem means writing
 * the words the check greps for -- and hardcoding an id would rot the
 * moment the node moved. A marker travels with the file.             */
const osEXEMPT = 'PLAN-LEAK-EXEMPT';

/*************************************************************************//**
 * @brief Every bucket.json under a root, walked RECURSIVELY.
 * @details The recursion is load-bearing: a plan nests several deep,
 *   and a top-level-only glob reports CLEAN while seeing a fraction.
 *   That exact bug produced a false all-clear on 2026-07-27, which is
 *   why it is called out here rather than left to the reader.
 * @param {string} osRoot - Directory to walk.
 * @returns {string[]} Absolute-ish paths to each bucket.json found.
 ****************************************************************************/
function aBucketFiles(osRoot) {
  let aOut = [];

  for (const oEnt of fs.readdirSync(osRoot, { withFileTypes: true })) {
    const osFull = path.join(osRoot, oEnt.name);
    if (oEnt.isDirectory())            aOut = aOut.concat(aBucketFiles(osFull));
    else if (oEnt.name === 'bucket.json') aOut.push(osFull);
  }

  return aOut;
}

/*************************************************************************//**
 * @brief Buildable nodes whose body mentions a pending decision.
 * @param {string} osRoot - The plan tree root.
 * @returns {Object[]} { osId, osStatus, osBucket, osPath, osLine }.
 ****************************************************************************/
function aStatusSuspects(osRoot) {
  const aOut = [];

  for (const osFile of aBucketFiles(osRoot)) {
    const osDir = path.dirname(osFile);
    let oBucket;
    try { oBucket = JSON.parse(fs.readFileSync(osFile, 'utf8')); }
    catch (oErr) { console.error('  ! unreadable: ' + osFile); continue; }

    for (const oNode of (oBucket.nodes || [])) {
      /* type:ramblings is exempt, and not as a convenience: an
         unruled thing in one is not a lying status, it is the
         CONTENT. These nodes hold Brian's description un-refined by
         design, so every one of them would hit this scan forever --
         an always-firing prompt is one the next session learns to
         scroll past, which costs the prompts that mean something. */
      if (oNode.type === 'ramblings') continue;
      if (!aBUILDABLE.includes(oNode.status) || !oNode.body) continue;

      const osBody = path.join(osDir, oNode.body);
      if (!fs.existsSync(osBody)) continue;

      const osText = fs.readFileSync(osBody, 'utf8');
      if (osText.includes(osEXEMPT)) continue;

      const osHit = osText.split('\n').find(os => oMARKER.test(os));
      if (osHit) aOut.push({
        osId:     oNode.id,
        osStatus: oNode.status,
        osBucket: oBucket.bucket || path.basename(osDir),
        osPath:   osBody,
        osLine:   osHit.trim().slice(0, 64),
      });
    }
  }

  return aOut;
}

/*************************************************************************//**
 * @brief CLI entry: print the scan as a prompt, exit 0 on any finding.
 ****************************************************************************/
function vMain() {
  const osRoot = process.argv[2] || 'plan';

  if (!fs.existsSync(path.join(osRoot, 'plan.json'))) {
    console.error('plan-leak: no plan.json under ' + osRoot
                + ' -- nothing was scanned. This is not a pass.');
    process.exit(2);
  }

  const aHits = aStatusSuspects(osRoot);
  console.log('STATUS SCAN -- buildable nodes whose body mentions a '
            + 'pending decision.');
  console.log('CHECK these statuses; this is not a claim they are '
            + 'wrong. Most hits are');
  console.log('sub-decisions, which are fine. The question is whether '
            + 'the unruled thing');
  console.log('blocks the WHOLE item -- if it does, the status is '
            + 'lying and wants EVAL.');
  console.log('');
  if (!aHits.length) console.log('  (none)');
  for (const oHit of aHits) {
    console.log('  ' + oHit.osStatus.padEnd(8) + oHit.osId.padEnd(30)
              + oHit.osBucket);
    console.log('      ' + oHit.osPath);
    console.log('      "' + oHit.osLine + '"');
  }
  console.log('');

  process.exit(0);
}

vMain();
