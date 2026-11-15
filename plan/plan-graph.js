#!/usr/bin/env node
/* plan/plan-graph.js
 * @brief Reader/checker for the plan tree. The graph data lives in
 *   per-bucket manifests (<dir>/bucket.json: node id, title, status,
 *   the needs edges, and the super (provenance) edges), hand-maintained
 *   by Claude alongside the .cld index and welded to the commit (design
 *   B) -- this script does not generate or write anything. It reports
 *   the ready frontier and blocked list (COMPUTED from needs vs the
 *   terminal DONE/DEAD states, never stored), the super lineage chains
 *   (--lineage), every edge with both endpoints' status and title
 *   (--edges [id] -- the semantic edge audit's coverage report), and
 *   the suspect (--suspect) and prose-mention (--prose) edge-audit
 *   pre-filter queues (see the plan-edge-audit skill). --check
 *   audits drift (dangling edges, missing status, shape lies) plus
 *   --check-edges (edges.json vs the nodes' edges) and --liza needs
 *   cycles (docs/dear-liza/). --outline lists the tree to a depth.
 *   needs blocks; super (lineage) never does.
 * Copyright (c) 2026 Brian Case. All rights reserved.
 * AI contributor: Claude (Anthropic)
 * MIT License -- see LICENCE.TXT
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');

const aBUILDABLE = ['READY', 'PARTIAL'];
const aTERMINAL  = ['DONE', 'DEAD'];

/* The node TYPE vocabulary (plan-tree.md "Type -- what a node
   IS"). A new type is added THERE and here in the same commit, the
   same bargain as shape. '' (absent) is legal and means untyped: 309
   nodes predate the field and fill in on contact, never in a batch.
   An unknown VALUE fails --check, so a typo cannot mint a category. */
const aTYPES = ['ramblings', 'spec', 'build', 'bug', 'doc', 'tooling'];

/* type:ramblings is not work -- it has no done-condition, so it can
   never be "what's next" and is held off the READY frontier. */
const osRAMBLINGS = 'ramblings';
/* Body lines (blank and heading excluded) at or under which an item
   that names no code reads as an ungrounded stub -- see fPrintMines. */
const nSTUBLINES = 3;

/***********************************************************************//**
 * @brief Load one bucket dir and its sub-buckets into the item map.
 * @details A bucket.json may carry "nodes" (leaf data) and/or "subs" (an
 *   array of child sub-bucket dir names, relative to this dir). Most
 *   buckets are a single leaf with no subs; a branch bucket (shapes
 *   kinds, lanes, flight, slugged-tree) is a tree of such dirs, so this
 *   recurses into each sub the way the filesystem nests. Recursion depth
 *   is the tree depth. Void: it fills oItems, it does not return.
 * @param {string} osDir - Bucket directory holding bucket.json.
 * @param {object} oItems - The item map to fill, keyed by id.
 * @param {object[]} aBuckets - Bucket record list to fill (for the
 *   shape audit): { osDir, osShape, aSubs, aNodeIds }.
 * @returns {void}
 **************************************************************************/
function fWalkBucket(osDir, oItems, aBuckets) {
  const osBkt = path.join(osDir, 'bucket.json');
  const oData = JSON.parse(fs.readFileSync(osBkt, 'utf8'));

  const aNodes = oData.nodes || [];
  aNodes.forEach(function (oNode) {
    oItems[oNode.id] = {
      osTitle: oNode.title,
      osType: oNode.type || '',
      osStatus: oNode.status,
      aNeeds: oNode.needs || [],
      aSuper: oNode.super || [],
      osDir: osDir,
      osBody: oNode.body || '',
      osShape: oData.shape || '',
      /* WHICH terminal record the node carries, not its contents --
         the name has to match the status (see fCheck BADFIELD). */
      bHasDone: oNode.done !== undefined,
      bHasDead: oNode.dead !== undefined
    };
  });

  const aSubs = oData.subs || [];
  aBuckets.push({
    osDir: osDir,
    osShape: oData.shape || '',
    aSubs: aSubs,
    aNodeIds: aNodes.map(function (oNode) { return oNode.id; })
  });

  aSubs.forEach(function (osSub) {
    fWalkBucket(path.join(osDir, osSub), oItems, aBuckets);
  });
}

/***********************************************************************//**
 * @brief Load every bucket manifest into the item map keyed by id.
 * @details Reads plan.json for the bucket list, then walks each bucket's
 *   dir (fWalkBucket recurses any sub-buckets). The runtime page walks the
 *   same path.
 * @param {string} osRoot - Plan tree root directory.
 * @returns {object} { oItems: id -> { osTitle, osStatus, aNeeds,
 *   aSuper, osDir, osBody, osShape }, aBuckets: bucket records for the
 *   shape audit }.
 **************************************************************************/
function fBuild(osRoot) {
  const oResult = { oItems: {}, aBuckets: [] };

  const osPlan = path.join(osRoot, 'plan.json');
  const oPlan = JSON.parse(fs.readFileSync(osPlan, 'utf8'));
  oPlan.buckets.forEach(function (oBucket) {
    fWalkBucket(path.join(osRoot, oBucket.dir),
      oResult.oItems, oResult.aBuckets);
  });

  return oResult;
}

/***********************************************************************//**
 * @brief Is an item terminal (settled -- it clears any blocker)?
 * @details Both DONE (shipped) and DEAD (abandoned/superseded) are
 *   terminal: the node will not change again, so a dependent no longer
 *   waits on it. This is what clears a needs edge.
 * @param {object} oItems - The item map.
 * @param {string} osId - Item id.
 * @returns {boolean} True when the item exists and is DONE or DEAD.
 **************************************************************************/
function fIsSettled(oItems, osId) {
  return oItems[osId] !== undefined
    && aTERMINAL.indexOf(oItems[osId].osStatus) >= 0;
}

/***********************************************************************//**
 * @brief The open blockers of an item (needs targets not yet settled).
 * @param {object} oItems - The item map.
 * @param {object} oItem - The item record.
 * @returns {string[]} Ids of unmet needs.
 **************************************************************************/
function fOpenBlockers(oItems, oItem) {
  return oItem.aNeeds.filter(function (osId) {
    return !fIsSettled(oItems, osId);
  });
}

/***********************************************************************//**
 * @brief Is an item on the ready frontier?
 * @details Buildable, unblocked, and NOT type:ramblings. A ramblings
 *   node is Brian's own description of a thing, not work -- it has no
 *   done-condition, so it can never be "what's next" (notes/
 *   plan-tree.md "ramblings -- the one type with no terminus"). It is
 *   excluded here rather than by giving it some non-buildable status,
 *   because its status is free to say anything and the frontier must
 *   not depend on which word a writer picked.
 * @param {object} oItems - The item map.
 * @param {object} oItem - The item record.
 * @returns {boolean} True when buildable and no open blocker.
 **************************************************************************/
function fIsReady(oItems, oItem) {
  return oItem.osType !== osRAMBLINGS
    && aBUILDABLE.indexOf(oItem.osStatus) >= 0
    && fOpenBlockers(oItems, oItem).length === 0;
}

/***********************************************************************//**
 * @brief Flatten every edge stored on the nodes into one record list.
 * @details Each record mirrors an edges.json entry exactly -- { type,
 *   node, target }, raw JSON field names -- so the tree side and the
 *   index side compare key-for-key in fCheckEdgeIndex. The tree is the
 *   authority; this list IS the truth the index is checked against.
 * @param {object} oItems - The item map.
 * @returns {object[]} Edge records, sorted by node id.
 **************************************************************************/
function fTreeEdges(oItems) {
  const aResult = [];

  Object.keys(oItems).sort().forEach(function (osId) {
    oItems[osId].aNeeds.forEach(function (osTarget) {
      aResult.push({ type: 'needs', node: osId, target: osTarget });
    });
    oItems[osId].aSuper.forEach(function (osTarget) {
      aResult.push({ type: 'super', node: osId, target: osTarget });
    });
  });

  return aResult;
}

/***********************************************************************//**
 * @brief Load the root edge index (edges.json), the dependency map.
 * @details One greppable file listing every needs/super edge, so a
 *   reader (the page, a cold session, a grep) sees the whole edge set
 *   without walking every bucket.json. Hand-maintained in the same
 *   commit as the bucket.json edit, like every index.
 * @param {string} osRoot - Plan tree root directory.
 * @returns {object[]|null} Edge records { type, node, target }, or
 *   null when edges.json does not exist (the caller reports NOINDEX).
 **************************************************************************/
function fLoadEdgeIndex(osRoot) {
  let aResult = null;

  const osPath = path.join(osRoot, 'edges.json');
  if (fs.existsSync(osPath)) {
    aResult = JSON.parse(fs.readFileSync(osPath, 'utf8')).edges || [];
  }

  return aResult;
}

/***********************************************************************//**
 * @brief One comparable key for an edge record.
 * @param {object} oEdge - Edge record { type, node, target }.
 * @returns {string} "type node target".
 **************************************************************************/
function fEdgeKey(oEdge) {
  return oEdge.type + ' ' + oEdge.node + ' ' + oEdge.target;
}

/***********************************************************************//**
 * @brief Audit the root edge index against the edges on the nodes.
 * @details Two directions, like the index-audit: MISSING (an edge on a
 *   node that edges.json does not list -- the add side) and STALE (an
 *   edges.json entry no node carries -- the remove side). A missing
 *   edges.json file is itself a finding (NOINDEX), not a crash.
 * @param {object} oItems - The item map.
 * @param {string} osRoot - Plan tree root directory.
 * @returns {number} Count of failing findings (0 when clean).
 **************************************************************************/
function fCheckEdgeIndex(oItems, osRoot) {
  let nResult = 0;

  const aIndex = fLoadEdgeIndex(osRoot);
  if (aIndex === null) {
    console.log('edges.json  NOINDEX  -- root edge index missing');
    nResult = 1;
  } else {
    const oInIndex = {};
    aIndex.forEach(function (oEdge) {
      oInIndex[fEdgeKey(oEdge)] = true;
    });
    const oInTree = {};
    const aTree = fTreeEdges(oItems);
    aTree.forEach(function (oEdge) {
      oInTree[fEdgeKey(oEdge)] = true;
    });

    aTree.forEach(function (oEdge) {
      if (oInIndex[fEdgeKey(oEdge)] === undefined) {
        console.log(fEdgeKey(oEdge) + '  MISSING from edges.json');
        nResult += 1;
      }
    });
    aIndex.forEach(function (oEdge) {
      if (oInTree[fEdgeKey(oEdge)] === undefined) {
        console.log(fEdgeKey(oEdge) + '  STALE in edges.json');
        nResult += 1;
      }
    });
  }

  return nResult;
}

/***********************************************************************//**
 * @brief Audit the manifests for drift in the hand-maintained data.
 * @details Flags (fails) a needs OR super edge pointing at an id that is
 *   not in the tree (dangling edge), an item that carries no status,
 *   and a terminal record whose FIELD NAME contradicts the status
 *   (BADFIELD: done on a DEAD node, dead on a DONE one -- 7 dead nodes
 *   claimed they were done before this checked). A terminal node with
 *   NO record at all is not flagged: 41 DONE nodes are inventory, with
 *   no commit to record, and a gate that always fails teaches bypass.
 *   Advises (does not fail) when a buildable item still needs a DEAD
 *   node -- that edge should usually be repointed or dropped, but it is
 *   not drift the way a dangling edge is. super is provenance, not a
 *   dependency: it is dangling-checked but carries no DEAD advisory (a
 *   super target is EXPECTED to be terminal -- that is the point).
 * @param {object} oItems - The item map.
 * @returns {number} Count of failing findings (0 when clean).
 **************************************************************************/
function fCheck(oItems) {
  let nResult = 0;

  const aIds = Object.keys(oItems).sort();
  aIds.forEach(function (osId) {
    const oItem = oItems[osId];
    if (oItem.osStatus === '') {
      console.log(osId + '  NOSTATUS  -- ' + oItem.osTitle);
      nResult += 1;
    }
    if (oItem.osStatus === 'DEAD' && oItem.bHasDone) {
      console.log(osId + '  BADFIELD done on a DEAD node'
        + '  -- ' + oItem.osTitle);
      nResult += 1;
    }
    if (oItem.osStatus === 'DONE' && oItem.bHasDead) {
      console.log(osId + '  BADFIELD dead on a DONE node'
        + '  -- ' + oItem.osTitle);
      nResult += 1;
    }
    if (oItem.osType !== '' && aTYPES.indexOf(oItem.osType) < 0) {
      console.log(osId + '  BADTYPE "' + oItem.osType
        + '"  -- ' + oItem.osTitle);
      nResult += 1;
    }
    oItem.aNeeds.forEach(function (osNeed) {
      if (oItems[osNeed] === undefined) {
        console.log(osId + '  DANGLING needs ' + osNeed
          + '  -- ' + oItem.osTitle);
        nResult += 1;
      } else if (oItems[osNeed].osStatus === 'DEAD'
          && aBUILDABLE.indexOf(oItem.osStatus) >= 0) {
        console.log(osId + '  ADVISORY needs DEAD ' + osNeed
          + '  -- ' + oItem.osTitle);
      }
    });
    oItem.aSuper.forEach(function (osSuper) {
      if (oItems[osSuper] === undefined) {
        console.log(osId + '  DANGLING super ' + osSuper
          + '  -- ' + oItem.osTitle);
        nResult += 1;
      }
    });
  });

  return nResult;
}

/***********************************************************************//**
 * @brief Why a bucket's contents contradict its declared shape.
 * @details The shape vocabulary and what each one permits are spec'd in
 *   plan-tree.md ("Shape -- every bucket declares its grammar").
 *   A new shape is added there and here in the same commit.
 * @param {object} oBucket - Bucket record from fWalkBucket.
 * @returns {string} The reason, or "" when the shape holds.
 **************************************************************************/
function fShapeError(oBucket) {
  let osResult = '';

  const osShape = oBucket.osShape;
  const bSubs = oBucket.aSubs.length > 0;
  const bNodes = oBucket.aNodeIds.length > 0;
  const bLaneSubs = oBucket.aSubs.every(function (osSub) {
    return osSub === 'implemented' || osSub === 'proposed';
  });
  const bNumberIds = oBucket.aNodeIds.every(function (osId) {
    return /^[0-9]+[a-z]*$/.test(osId);
  });
  const bSlugIds = oBucket.aNodeIds.every(function (osId) {
    return /^[a-z][a-z0-9-]*$/.test(osId);
  });

  if (osShape === '') {
    osResult = 'shape missing -- declare the bucket grammar';
  } else if (osShape === 'numbered') {
    if (bSubs) {
      osResult = 'numbered bucket must not have subs';
    } else if (!bNumberIds) {
      osResult = 'numbered bucket has a non-numeric node id';
    }
  } else if (osShape === 'slugged') {
    if (bSubs) {
      osResult = 'slugged bucket must not have subs';
    } else if (!bSlugIds) {
      osResult = 'slugged bucket has a non-slug node id';
    }
  } else if (osShape === 'slugged-tree') {
    if (!bSlugIds) {
      osResult = 'slugged-tree bucket has a non-slug node id';
    }
  } else if (osShape === 'kinds') {
    if (!bSubs) {
      osResult = 'kinds bucket must have subs';
    } else if (bNodes) {
      osResult = 'kinds bucket must not carry own nodes';
    }
  } else if (osShape === 'lanes') {
    if (!bSubs || !bLaneSubs) {
      osResult = 'lanes bucket subs must be implemented/proposed only';
    } else if (bNodes) {
      osResult = 'lanes bucket must not carry own nodes';
    }
  } else if (osShape === 'proposed-only') {
    if (oBucket.aSubs.join(',') !== 'proposed' || bNodes) {
      osResult = 'proposed-only bucket must have exactly one sub,'
        + ' proposed, and no own nodes';
    }
  } else if (osShape === 'implemented' || osShape === 'proposed') {
    if (bSubs) {
      osResult = 'a lane leaf must not have subs';
    }
  } else if (osShape === 'flight') {
    const osFlightSubs = oBucket.aSubs.slice().sort().join(',');
    if (osFlightSubs !== 'archive,on-deck,wip') {
      osResult = 'flight bucket subs must be exactly on-deck, wip, archive';
    } else if (bNodes) {
      osResult = 'flight bucket must not carry own nodes';
    }
  } else if (osShape === 'on-deck') {
    if (bSubs) {
      osResult = 'an on-deck leaf must not have subs';
    }
  } else if (osShape === 'wip') {
    if (bSubs) {
      osResult = 'a wip leaf must not have subs';
    } else if (oBucket.aNodeIds.length > 1) {
      osResult = 'wip leaf holds at most one change in flight';
    }
  } else if (osShape === 'archive') {
    if (bSubs) {
      osResult = 'an archive leaf must not have subs';
    }
  } else {
    osResult = 'unknown shape "' + osShape
      + '" -- spec it in plan-tree.md';
  }

  return osResult;
}

/***********************************************************************//**
 * @brief Audit every bucket's declared shape against its contents.
 * @param {object[]} aBuckets - Bucket records from fBuild.
 * @returns {number} Count of failing findings (0 when clean).
 **************************************************************************/
function fCheckShapes(aBuckets) {
  let nResult = 0;

  aBuckets.forEach(function (oBucket) {
    const osWhy = fShapeError(oBucket);
    if (osWhy !== '') {
      console.log(oBucket.osDir + '  SHAPE  ' + osWhy);
      nResult += 1;
    }
  });

  return nResult;
}

/***********************************************************************//**
 * @brief Print the super (provenance) chains, one edge per line.
 * @details Each "super": [Y] on node X prints as "X continues Y" -- the
 *   lineage of where earlier work went (moved / renamed / superseded /
 *   split), machine-readable so a cold session traces it instead of
 *   re-deriving it from prose. Void: it prints, it does not return.
 * @param {object} oItems - The item map.
 * @returns {void}
 **************************************************************************/
function fPrintLineage(oItems) {
  console.log('LINEAGE (super edges -- "X continues Y", non-blocking):');
  Object.keys(oItems).sort().forEach(function (osId) {
    oItems[osId].aSuper.forEach(function (osSuper) {
      console.log('  ' + osId + '  continues  ' + osSuper
        + '  -- ' + oItems[osId].osTitle);
    });
  });
}

/***********************************************************************//**
 * @brief DFS step for the needs-cycle hunt (the Dear Liza check).
 * @details Standard three-color walk: gray = on the current path, so
 *   reaching a gray node closes a loop; the cycle is the path slice
 *   from that node forward, plus the node again to show the closure.
 *   Recursion depth is the longest needs chain. A dangling target is
 *   skipped here (fCheck already flags it). super is lineage and is
 *   never walked. Void: it fills aCycles, it does not return.
 * @param {object} oItems - The item map.
 * @param {string} osId - Node id to visit.
 * @param {string[]} aPath - The gray path so far (mutated, restored).
 * @param {object} oColor - id -> 1 (gray) or 2 (black); absent = white.
 * @param {string[][]} aCycles - Cycle list to fill, each an id path.
 * @returns {void}
 **************************************************************************/
function fVisitCycle(oItems, osId, aPath, oColor, aCycles) {
  if (oColor[osId] === 1) {
    aCycles.push(aPath.slice(aPath.indexOf(osId)).concat(osId));
  } else if (oColor[osId] === undefined && oItems[osId] !== undefined) {
    oColor[osId] = 1;
    aPath.push(osId);
    oItems[osId].aNeeds.forEach(function (osNeed) {
      fVisitCycle(oItems, osNeed, aPath, oColor, aCycles);
    });
    aPath.pop();
    oColor[osId] = 2;
  }
}

/***********************************************************************//**
 * @brief Report needs cycles -- there is a hole in the bucket.
 * @details A needs cycle is the silent killer the plain drift audit
 *   cannot see: no edge dangles, every status is set, yet every node
 *   in the loop waits on the loop and none can ever reach the ready
 *   frontier. The song is the spec (docs/dear-liza/): fixing the
 *   bucket routes back through the bucket. Detection is not
 *   resolution -- the fix is an axe, a ruling from Brian that cuts
 *   one edge (drop / demote to super / split the item), the same eye
 *   as the plan-edge-audit skill.
 * @param {object} oItems - The item map.
 * @returns {number} Count of cycles found (0 when acyclic).
 **************************************************************************/
function fReportCycles(oItems) {
  const aCycles = [];

  const oColor = {};
  Object.keys(oItems).sort().forEach(function (osId) {
    fVisitCycle(oItems, osId, [], oColor, aCycles);
  });
  aCycles.forEach(function (aCycle) {
    console.log('CYCLE  ' + aCycle.join(' needs ')
      + '  -- a hole in the bucket, dear Liza');
  });

  return aCycles.length;
}

/***********************************************************************//**
 * @brief Print one bucket as an outline to a remaining depth (recurses).
 * @details Reads bucket.json directly (titles are not kept in the item
 *   map). One line for the bucket, then its nodes and sub-buckets
 *   indented, until the depth budget runs out. Recursion depth is the
 *   tree depth. Void: it prints, it does not return.
 * @param {string} osDir - Bucket directory holding bucket.json.
 * @param {string} osIndent - Current indent prefix.
 * @param {number} nLeft - Levels still allowed below this call.
 * @returns {void}
 **************************************************************************/
function fOutlineBucket(osDir, osIndent, nLeft) {
  const osBkt = path.join(osDir, 'bucket.json');
  const oData = JSON.parse(fs.readFileSync(osBkt, 'utf8'));

  console.log(osIndent + (oData.title || osDir));
  if (nLeft > 1) {
    (oData.nodes || []).forEach(function (oNode) {
      console.log(osIndent + '  ' + oNode.id + '  ' + oNode.status
        + '  ' + oNode.title);
    });
    (oData.subs || []).forEach(function (osSub) {
      fOutlineBucket(path.join(osDir, osSub), osIndent + '  ', nLeft - 1);
    });
  }
}

/***********************************************************************//**
 * @brief Print the whole plan as an outline collapsed to a depth.
 * @details The 0610 view: depth 1 = the bucket headers, 2 adds their
 *   items and sub-buckets, and so on -- the plan's shape without the
 *   prose. Driven by the plan-find skill's depth argument. Void: it
 *   prints, it does not return.
 * @param {string} osRoot - Plan tree root directory.
 * @param {number} nDepth - Levels to show (>= 1).
 * @returns {void}
 **************************************************************************/
function fPrintOutline(osRoot, nDepth) {
  const osPlan = path.join(osRoot, 'plan.json');
  const oPlan = JSON.parse(fs.readFileSync(osPlan, 'utf8'));

  oPlan.buckets.forEach(function (oBucket) {
    fOutlineBucket(path.join(osRoot, oBucket.dir), '', nDepth);
  });
}

/***********************************************************************//**
 * @brief Print an item's status and title as one report line.
 * @param {object} oItems - The item map.
 * @param {string} osId - Item id (may be dangling).
 * @returns {string} "  id  STATUS  title", "?" fields when dangling.
 **************************************************************************/
function fEndpointLine(oItems, osId) {
  let osResult = '    ' + osId + '  ?  -- not in tree';

  if (oItems[osId] !== undefined) {
    osResult = '    ' + osId + '  ' + oItems[osId].osStatus
      + '  ' + oItems[osId].osTitle;
  }

  return osResult;
}

/***********************************************************************//**
 * @brief Print every edge with both endpoints' status and title.
 * @details The coverage report for the semantic edge audit (t and g
 *   plan item edge-audit, method a): the whole edge set reviewable in
 *   one pass, no bucket walking. With a filter id, only the edges
 *   touching that id (either end) print -- the to/from lookup behind
 *   the plan-edge-index-find skill when it needs titles, not just the
 *   raw edges.json lines. Void: it prints, it does not return.
 * @param {object} oItems - The item map.
 * @param {string} osFilter - Node id to filter on, or "" for all.
 * @returns {void}
 **************************************************************************/
function fPrintEdges(oItems, osFilter) {
  fTreeEdges(oItems).forEach(function (oEdge) {
    const bShow = osFilter === ''
      || oEdge.node === osFilter
      || oEdge.target === osFilter;
    if (bShow) {
      console.log(oEdge.node + '  ' + oEdge.type + '  ' + oEdge.target);
      console.log(fEndpointLine(oItems, oEdge.node));
      console.log(fEndpointLine(oItems, oEdge.target));
    }
  });
}

/***********************************************************************//**
 * @brief Print every node's type, or just one type's members.
 * @details The census behind the migration: what is typed, what is
 *   still untyped, and where the ramblings and specs actually are.
 *   With no filter it groups by type and prints UNTYPED last with its
 *   count only -- 309 nodes predate the field and listing them all
 *   would bury the typed ones. Void: it prints, it does not return.
 * @param {object} oItems - The item map.
 * @param {string} osFilter - A type to list, or "" for the census.
 * @returns {void}
 **************************************************************************/
function fPrintTypes(oItems, osFilter) {
  const aIds = Object.keys(oItems).sort();

  if (osFilter !== '') {
    aIds.forEach(function (osId) {
      if (oItems[osId].osType === osFilter) {
        console.log('  ' + osId + '  ' + oItems[osId].osStatus
          + '  ' + oItems[osId].osTitle);
      }
    });
    return;
  }

  aTYPES.forEach(function (osType) {
    const aMembers = aIds.filter(function (osId) {
      return oItems[osId].osType === osType;
    });
    console.log(osType.toUpperCase() + ' (' + aMembers.length + ')');
    aMembers.forEach(function (osId) {
      console.log('  ' + osId + '  ' + oItems[osId].osStatus
        + '  ' + oItems[osId].osTitle);
    });
  });

  const nBare = aIds.filter(function (osId) {
    return oItems[osId].osType === '';
  }).length;
  console.log('UNTYPED (' + nBare + ')  -- legal; fills in on contact');
}

/***********************************************************************//**
 * @brief Print which buckets hold no spec node, and no ramblings node.
 * @details THE report the type field was added to make possible: until
 *   a node could BE a spec, nothing could ask whether one was MISSING,
 *   and a bucket could sit specless while holding many nodes whose
 *   STATUS read SPEC.
 *   Deliberately NOT part of --check, and this is the whole design
 *   note: on day one every bucket is specless, so wiring it into the
 *   gate would fail every commit and teach the next session to bypass
 *   the gate. It is a question you ask, not a rule you break. Wire it
 *   into --check once the buckets that want specs have them.
 *   Only leaf buckets (those carrying nodes) are reported; a container
 *   holds no nodes, so it can hold no spec. Void: it prints.
 * @param {object} oItems - The item map.
 * @returns {void}
 **************************************************************************/
function fPrintSpecless(oItems) {
  const oBuckets = {};

  Object.keys(oItems).forEach(function (osId) {
    const osDir = oItems[osId].osDir;
    if (oBuckets[osDir] === undefined) {
      oBuckets[osDir] = { bSpec: false, bRamblings: false };
    }
    if (oItems[osId].osType === 'spec') {
      oBuckets[osDir].bSpec = true;
    }
    if (oItems[osId].osType === osRAMBLINGS) {
      oBuckets[osDir].bRamblings = true;
    }
  });

  Object.keys(oBuckets).sort().forEach(function (osDir) {
    const aMissing = [];
    if (!oBuckets[osDir].bSpec) {
      aMissing.push('no spec');
    }
    if (!oBuckets[osDir].bRamblings) {
      aMissing.push('no ramblings');
    }
    if (aMissing.length > 0) {
      console.log(aMissing.join(', ') + '  -- ' + osDir);
    }
  });
}

/***********************************************************************//**
 * @brief Print the needs edges most likely to be mis-encoded.
 * @details The heuristic pre-filter for the semantic edge audit
 *   (method b): a needs pointing at a terminal (DONE/DEAD) target
 *   smells of provenance recorded as dependency -- it may want to be
 *   a super edge, or plain prose. Only Brian's eye decides; this just
 *   orders the queue. Void: it prints, it does not return.
 * @param {object} oItems - The item map.
 * @returns {void}
 **************************************************************************/
function fPrintSuspects(oItems) {
  console.log('SUSPECT needs edges (target already terminal --'
    + ' provenance, not dependency?):');
  fTreeEdges(oItems).forEach(function (oEdge) {
    if (oEdge.type === 'needs' && fIsSettled(oItems, oEdge.target)) {
      console.log(oEdge.node + '  needs  ' + oEdge.target);
      console.log(fEndpointLine(oItems, oEdge.node));
      console.log(fEndpointLine(oItems, oEdge.target));
    }
  });
}

/***********************************************************************//**
 * @brief Print prose-mention edge candidates for the semantic audit.
 * @details The prose pre-filter (--prose): node A's body .md names node
 *   B's id, yet no needs/super edge joins the pair in either direction.
 *   Like --suspect it FEEDS the /plan-edge-audit queue -- a mention is
 *   a smell, not a verdict; not every cross-ref should be an edge, and
 *   the ruling is Brian's. Skipped pairs: self, a moved marker and its
 *   real node (id / idm), pairs with both endpoints already terminal
 *   (pure history), pairs already edged either way, and any pair
 *   touching an implemented-lane node -- inventory entries DESCRIBE
 *   what shipped (their ids are ordinary words, like wrap), they
 *   do not depend, and they alone put ~350 junk rows in the queue. A
 *   mention is the other id as a whole word ([0-9a-z-], regex-safe).
 *   One line per pair; ~350 strong, so drain it filtered (per node or
 *   per bucket prefix via grep), not in one sitting.
 * @param {object} oItems - Item map from fBuild.
 * @param {string} osFilter - Only pairs touching this id ('' = all).
 * @returns {void}
 **************************************************************************/
function fPrintProseRefs(oItems, osFilter) {
  console.log('PROSE-REF edge candidates (id named in prose,'
    + ' no edge either direction):');
  const aIds = Object.keys(oItems).sort();
  aIds.forEach(function (osA) {
    const oA = oItems[osA];
    if (oA.osBody === '' || oA.osShape === 'implemented') return;
    const osPath = path.join(oA.osDir, oA.osBody);
    if (!fs.existsSync(osPath)) return;
    const osText = fs.readFileSync(osPath, 'utf8');
    aIds.forEach(function (osB) {
      if (osB === osA || osB === osA + 'm' || osA === osB + 'm') return;
      const oB = oItems[osB];
      if (oB.osShape === 'implemented') return;
      if (fIsSettled(oItems, osA) && fIsSettled(oItems, osB)) return;
      const bEdged = oA.aNeeds.indexOf(osB) >= 0
        || oA.aSuper.indexOf(osB) >= 0
        || oB.aNeeds.indexOf(osA) >= 0
        || oB.aSuper.indexOf(osA) >= 0;
      if (bEdged) return;
      if (osFilter !== '' && osA !== osFilter && osB !== osFilter) return;
      if (!new RegExp('\\b' + osB + '\\b').test(osText)) return;
      console.log(osA + '[' + oA.osStatus + ']  mentions  '
        + osB + '[' + oB.osStatus + ']  (' + oA.osBody + ')');
    });
  });
}

/***********************************************************************//**
 * @brief The repository root, for git pathspecs.
 * @details The script may be run from anywhere with any root argument,
 *   but git wants one consistent working tree. Absolute paths are then
 *   legal pathspecs, so callers need no relative-path arithmetic.
 * @returns {string} Absolute repo root, or '' when not in a work tree.
 **************************************************************************/
function fOsGitRoot() {
  let osResult = '';
  const oOpt = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  const osOut = cp.execFileSync('git',
    ['rev-parse', '--show-toplevel'], oOpt);
  if (typeof osOut === 'string') osResult = osOut.trim();
  return osResult;
}

/***********************************************************************//**
 * @brief Commit date of the last change to one path.
 * @details Memoised -- the same source file is named by many items, and
 *   a git call per mention would dominate the run.
 * @param {string} osRootAbs - Repo root for the git call.
 * @param {string} osAbs - Absolute path to ask about.
 * @param {object} oCache - Path -> date memo, filled in place.
 * @returns {string} ISO-8601 commit date, or '' when git knows nothing
 *   about the path (never committed, or outside the work tree).
 **************************************************************************/
function fOsPathDate(osRootAbs, osAbs, oCache) {
  let osResult = '';
  if (Object.prototype.hasOwnProperty.call(oCache, osAbs)) {
    osResult = oCache[osAbs];
  } else {
    const oOpt = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    const osOut = cp.execFileSync('git',
      ['-C', osRootAbs, 'log', '-1', '--format=%cI', '--', osAbs], oOpt);
    osResult = (typeof osOut === 'string') ? osOut.trim() : '';
    oCache[osAbs] = osResult;
  }
  return osResult;
}

/** Top-level directories that hold documentation, not code (aCodeDirs).
 *  An item naming a file there is cross-referencing prose. */
const kaDocDirs = ['notes', 'docs'];

/***********************************************************************//**
 * @brief The directories of the checked repo whose files an item's
 *   prose may name as code.
 * @details Read off the repo being checked, never written in, so the
 *   reader works on any repo's plan: every top-level directory except
 *   dot-directories, the documentation dirs (kaDocDirs), and the one
 *   holding the plan being read -- its own files (edges.json, a
 *   bucket.json) change on every plan commit, so an item naming one
 *   says nothing about its premise.
 * @param {string} osRepoAbs - The repo root (the git work tree).
 * @param {string} osPlanRoot - The plan root being read.
 * @returns {string[]} Directory names, in readdir order.
 **************************************************************************/
function aCodeDirs(osRepoAbs, osPlanRoot) {
  const osPlanTop = path.relative(osRepoAbs, path.resolve(osPlanRoot))
    .split(path.sep)[0];
  const aResult = fs.readdirSync(osRepoAbs, { withFileTypes: true })
    .filter(function (oEnt) {
      return oEnt.isDirectory() && oEnt.name.charAt(0) !== '.'
        && kaDocDirs.indexOf(oEnt.name) < 0 && oEnt.name !== osPlanTop;
    })
    .map(function (oEnt) { return oEnt.name; });
  return aResult;
}

/***********************************************************************//**
 * @brief Every source file an item's prose names.
 * @details Only CODE directories count (aCodeDirs). An item naming a
 *   notes/ or docs/ file is cross-referencing documentation, which moves
 *   for its own reasons and says nothing about whether this item's
 *   premise still holds. A ":NNN" line suffix is kept as a flag, not as
 *   part of the path: line numbers are the fastest-rotting reference in
 *   the tree (one item pointed at a line through an extraction that
 *   moved it), so they are worth calling out even when the file itself
 *   has not moved since the item was written.
 * @param {string} osText - The item body .md contents.
 * @param {string[]} aDirs - The code directories, from aCodeDirs.
 * @returns {object[]} [{ osPath, bLine }], de-duplicated by path.
 **************************************************************************/
function aCodeRefs(osText, aDirs) {
  const aResult = [];
  const oSeen   = {};
  if (aDirs.length === 0) return aResult;
  const osAlt = aDirs.map(function (osDir) {
    return osDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('|');
  const oRe = new RegExp('\\b((?:' + osAlt + ')'
    + '\\/[A-Za-z0-9_.\\/-]*\\.(?:js|json|css|html|sh))(:[0-9]+)?', 'g');
  let aHit = oRe.exec(osText);
  while (aHit !== null) {
    const osPath = aHit[1];
    const bLine  = aHit[2] !== undefined;
    if (!Object.prototype.hasOwnProperty.call(oSeen, osPath)) {
      oSeen[osPath] = aResult.length;
      aResult.push({ osPath: osPath, bLine: bLine });
    } else if (bLine) {
      aResult[oSeen[osPath]].bLine = true;
    }
    aHit = oRe.exec(osText);
  }
  return aResult;
}

/***********************************************************************//**
 * @brief Print the plan mines: items whose premise may have rotted.
 * @details The rot pre-filter (--mine), the third smell queue beside
 *   --suspect and --prose, and named for what it finds: an item sitting
 *   buildable while describing a world that moved, which nobody steps
 *   on until they build it. Born 2026-07-26 after four items in one
 *   sitting turned out to have stale premises (Brian: "i think
 *   everything did").
 *
 *   Why nothing else catches it: a rotted item breaks NO rule. Its
 *   status is set, its edges resolve, its shape is legal, so --check is
 *   clean and --liza finds no cycle. Same silence as the Dear Liza
 *   failure (docs/dear-liza/), one level up -- there the graph is
 *   wrong, here the graph is right and the PROSE is wrong.
 *
 *   Three findings, and the FIRST is the one that catches the kind of
 *   rot the 2026-07-26 sitting hit -- the others are the smaller net:
 *   - STUB: a buildable item whose body is a line or two and which
 *     names no code at all. Nothing grounds it, so nothing can ever
 *     contradict it, and it reads buildable forever -- two such
 *     items, each ONE SENTENCE, were found written against a display
 *     that turned out not to exist. Neither had a date problem;
 *     neither had ever been checked against anything. Age is printed
 *     because a stub that has sat for months is a worse bet than one
 *     jotted last week.
 *   - GONE: the named file does not exist. The premise cannot hold.
 *   - MOVED: the file changed after the item did, with the gap in
 *     days. A line reference (file.js:NNN) is flagged too, because it
 *     rots silently even when the file is merely edited.
 *
 *   The date signal is the WEAK one and this says so rather than
 *   implying coverage it does not have: the repo commits prose and
 *   code together, so an item and the code it names often share a
 *   timestamp and compare equal. MOVED catches a tail; STUB catches
 *   the body.
 *
 *   A finding is a SMELL, not a verdict, exactly like --suspect: code
 *   changing near an item does not mean the item is wrong, and the
 *   ruling is Brian's. Terminal nodes are skipped -- rot on finished
 *   history costs nothing. Void: it prints, it does not return.
 * @param {object} oItems - Item map from fBuild.
 * @param {string} osFilter - Only this id ('' = every buildable item).
 * @param {string} osRoot - The plan root being read (aCodeDirs).
 * @returns {void}
 **************************************************************************/
function fPrintMines(oItems, osFilter, osRoot) {
  console.log('PLAN MINES (ungrounded or overtaken items --'
    + ' a smell queue, not a verdict):');
  const osRootAbs = fOsGitRoot();
  if (osRootAbs === '') {
    console.log('  (not a git work tree -- no dates to compare)');
    return;
  }
  const oCache = {};
  const aDirs  = aCodeDirs(osRootAbs, osRoot);
  Object.keys(oItems).sort().forEach(function (osId) {
    const oIt = oItems[osId];
    if (osFilter !== '' && osId !== osFilter) return;
    if (aTERMINAL.indexOf(oIt.osStatus) >= 0) return;
    if (oIt.osStatus === 'MOVED' || oIt.osBody === '') return;
    const osBodyAbs = path.resolve(oIt.osDir, oIt.osBody);
    if (!fs.existsSync(osBodyAbs)) return;
    const osItemDate = fOsPathDate(osRootAbs, osBodyAbs, oCache);
    if (osItemDate === '') return;
    const aFound = [];
    const osText = fs.readFileSync(osBodyAbs, 'utf8');
    const aRefs  = aCodeRefs(osText, aDirs);
    const nMeat  = osText.split('\n').filter(function (osLine) {
      return osLine.trim() !== '' && osLine.charAt(0) !== '#';
    }).length;
    if (aRefs.length === 0 && nMeat <= nSTUBLINES) {
      const nAge = Math.round((Date.now() - Date.parse(osItemDate))
        / 86400000);
      aFound.push('    STUB   ' + nMeat + ' line'
        + (nMeat === 1 ? '' : 's') + ' of prose, no code named'
        + '  (' + nAge + 'd since the body last changed)');
    }
    aRefs.forEach(function (oRef) {
      const osAbs = path.join(osRootAbs, oRef.osPath);
      if (!fs.existsSync(osAbs)) {
        aFound.push('    GONE   ' + oRef.osPath
          + '  (named here, not on disk)');
        return;
      }
      const osCodeDate = fOsPathDate(osRootAbs, osAbs, oCache);
      if (osCodeDate === '' || osCodeDate <= osItemDate) return;
      const nDays = Math.round((Date.parse(osCodeDate)
        - Date.parse(osItemDate)) / 86400000);
      aFound.push('    MOVED  ' + oRef.osPath
        + '  (+' + nDays + 'd after the item'
        + (oRef.bLine ? ', LINE REF' : '') + ')');
    });
    if (aFound.length === 0) return;
    console.log(osId + '[' + oIt.osStatus + ']  last touched '
      + osItemDate.slice(0, 10) + '  -- ' + oIt.osTitle);
    aFound.forEach(function (osLine) { console.log(osLine); });
  });
}

/***********************************************************************//**
 * @brief CLI entry: report the frontier, the blocked list, or an audit.
 * @details Modes: --ready (default), --blocked, --lineage, --edges
 *   [id], --outline [n], --suspect, --prose [id], --mine [id], --liza,
 *   --check, --check-edges, --types [type], --specless.
 *   The root dir is the last argument in every mode; --edges, --prose,
 *   --mine and --types take an optional filter before it and --outline
 *   an optional depth (an argument holding a plan.json is a root,
 *   anything else is the option).
 * @returns {void}
 **************************************************************************/
function fMain() {
  const osMode = process.argv[2] || '--ready';
  let osFilter = '';
  let osRoot = process.argv[3] || '.';
  if ((osMode === '--edges' || osMode === '--outline'
      || osMode === '--prose' || osMode === '--mine'
      || osMode === '--types')
      && process.argv[3] !== undefined
      && !fs.existsSync(path.join(process.argv[3], 'plan.json'))) {
    osFilter = process.argv[3];
    osRoot = process.argv[4] || '.';
  }
  const oTree = fBuild(osRoot);
  const oItems = oTree.oItems;

  if (osMode === '--check') {
    const nBad = fCheck(oItems) + fCheckShapes(oTree.aBuckets)
      + fCheckEdgeIndex(oItems, osRoot) + fReportCycles(oItems);
    if (nBad === 0) {
      console.log('plan-graph: clean');
    }
    process.exitCode = nBad === 0 ? 0 : 1;
  } else if (osMode === '--liza') {
    const nBad = fReportCycles(oItems);
    if (nBad === 0) {
      console.log('plan-graph: no hole in the bucket, dear Liza');
    }
    process.exitCode = nBad === 0 ? 0 : 1;
  } else if (osMode === '--outline') {
    fPrintOutline(osRoot, /^[0-9]+$/.test(osFilter)
      ? parseInt(osFilter, 10) : 2);
  } else if (osMode === '--check-edges') {
    const nBad = fCheckEdgeIndex(oItems, osRoot);
    if (nBad === 0) {
      console.log('plan-graph: edge index clean');
    }
    process.exitCode = nBad === 0 ? 0 : 1;
  } else if (osMode === '--edges') {
    fPrintEdges(oItems, osFilter);
  } else if (osMode === '--types') {
    fPrintTypes(oItems, osFilter);
  } else if (osMode === '--specless') {
    fPrintSpecless(oItems);
  } else if (osMode === '--suspect') {
    fPrintSuspects(oItems);
  } else if (osMode === '--prose') {
    fPrintProseRefs(oItems, osFilter);
  } else if (osMode === '--mine') {
    fPrintMines(oItems, osFilter, osRoot);
  } else if (osMode === '--lineage') {
    fPrintLineage(oItems);
  } else if (osMode === '--blocked') {
    Object.keys(oItems).sort().forEach(function (osId) {
      const aOpen = fOpenBlockers(oItems, oItems[osId]);
      if (aBUILDABLE.indexOf(oItems[osId].osStatus) >= 0
          && aOpen.length > 0) {
        console.log(osId + '  BLOCKED by ' + aOpen.join(',')
          + '  -- ' + oItems[osId].osTitle);
      }
    });
  } else {
    console.log('READY FRONTIER (buildable now, no open blocker):');
    Object.keys(oItems).sort().forEach(function (osId) {
      if (fIsReady(oItems, oItems[osId])) {
        console.log('  ' + osId + '  ' + oItems[osId].osTitle);
      }
    });
  }
}

fMain();
