/* lib/plan-boot.js
 * @brief Controller for the plan graph page (html/plan.html). Loads the
 *   plan tree that Claude hand-maintains -- plan.json for the bucket
 *   list, <bucket>/bucket.json for a cluster's nodes and needs edges,
 *   <item>.md for prose -- and drives it as a Cytoscape graph: buckets
 *   are super-nodes, tapping one pops out its items and wires the
 *   dependency edges, tapping an item shows its prose. Cluster (fcose)
 *   is the one layout: it groups items full-size around their bucket.
 *   The old Flow (breadthfirst) mode is retired -- it laid the
 *   disconnected buckets in one huge row, so every fit pinned zoom at
 *   the floor and deep levels rendered as unclickable specks.
 *   Ready/blocked are COMPUTED from the needs edges, never stored.
 * Copyright (c) 2026 Brian Case. All rights reserved.
 * AI contributor: Claude (Anthropic)
 * MIT License text omitted for brevity, See LICENCE.TXT
 */
'use strict';

/**
 * @class PlanGraph
 * @brief Loads and renders the plan dependency graph.
 */
class PlanGraph {
  #osDataRoot;
  #oCy;
  #oItems;
  #oBuckets;
  #oOpen;
  #oPanel;
  #oLegend;
  #aBuildable;
  #oStatusDefs;
  #oTypeDefs;
  #oStatusById;

  /**
   * @constructor
   * @brief Wire the status table and boot once the DOM is ready.
   */
  constructor() {
    this.#osDataRoot = '../notes/plan';
    this.#oItems = {};
    this.#oBuckets = {};
    this.#oOpen = {};
    this.#oStatusById = {};
    this.#aBuildable = ['READY', 'PARTIAL'];
    this.#oStatusDefs = {
      DONE:    { osVar: '--DnaToolsPlan-done',    osLabel: 'Done' },
      READY:   { osVar: '--DnaToolsPlan-ready',   osLabel: 'Ready' },
      PARTIAL: { osVar: '--DnaToolsPlan-partial', osLabel: 'Partial' },
      BLOCKED: { osVar: '--DnaToolsPlan-block',   osLabel: 'Blocked' },
      EVAL:    { osVar: '--DnaToolsPlan-eval',    osLabel: 'Decision' },
      SPEC:    { osVar: '--DnaToolsPlan-spec',    osLabel: 'Spec' },
      DEFER:   { osVar: '--DnaToolsPlan-defer',   osLabel: 'Deferred' },
      PARK:    { osVar: '--DnaToolsPlan-park',    osLabel: 'Parked' },
      DEAD:    { osVar: '--DnaToolsPlan-dead',    osLabel: 'Dead' },
      MISSING: { osVar: '--DnaToolsPlan-missing', osLabel: 'Not loaded' }
    };
    /* The SECOND axis (plan-tree.md "Type -- what a node IS"). Colour
       is already spent on status -- where a node is in its life -- so
       type gets SHAPE, which keeps the two axes independently
       readable instead of making them fight over one channel.
       Untyped is the ellipse: it is what every node looked like
       before the field existed, so nothing changes appearance until
       it is deliberately typed. */
    this.#oTypeDefs = {
      ramblings: { osShape: 'barrel',          osLabel: 'Ramblings' },
      spec:      { osShape: 'round-rectangle', osLabel: 'Spec' },
      build:     { osShape: 'hexagon',         osLabel: 'Build' },
      bug:       { osShape: 'diamond',         osLabel: 'Bug' },
      doc:       { osShape: 'round-tag',       osLabel: 'Doc' },
      tooling:   { osShape: 'round-triangle',  osLabel: 'Tooling' },
      '':        { osShape: 'ellipse',         osLabel: 'Untyped' }
    };

    document.addEventListener('DOMContentLoaded', () => this.#vInit());
  }

  /**
   * @private
   * @brief Fetch and parse a JSON file under the data root.
   * @param {string} osPath - Path relative to the data root.
   * @returns {Promise<object>} Parsed object, or null on failure.
   */
  async #oFetchJson(osPath) {
    let oResult = null;

    try {
      const oResp = await fetch(this.#osDataRoot + '/' + osPath);
      if (oResp.ok) {
        oResult = await oResp.json();
      }
    } catch (oError) {
      err.oFetchJson.error('fetch json ' + osPath + ' failed');
    }

    return oResult;
  }

  /**
   * @private
   * @brief Fetch a text file under the data root.
   * @param {string} osPath - Path relative to the data root.
   * @returns {Promise<string>} File text, or "" on failure.
   */
  async #osFetchText(osPath) {
    let osResult = '';

    try {
      const oResp = await fetch(this.#osDataRoot + '/' + osPath);
      if (oResp.ok) {
        osResult = await oResp.text();
      }
    } catch (oError) {
      err.osFetchText.error('fetch text ' + osPath + ' failed');
    }

    return osResult;
  }

  /**
   * @private
   * @brief Read a CSS custom property off the document root.
   * @param {string} osName - The custom property name.
   * @returns {string} The trimmed value.
   */
  #osCssVar(osName) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(osName).trim();
  }

  /**
   * @private
   * @brief Boot: load the bucket list, build the graph, draw buckets.
   * @returns {Promise<void>}
   */
  async #vInit() {
    this.#oPanel = document.getElementById('DnaToolsPlanPanel');
    this.#oLegend = document.getElementById('DnaToolsPlanLegend');
    this.#vRenderLegend();
    this.#vBuildCy();

    const oPlan = await this.#oFetchJson('plan.json');
    if (oPlan === null) {
      this.#vSetPanel('Could not load plan.json.', false);
      return;
    }
    oPlan.buckets.forEach((oBucket) => {
      this.#vRegisterBucket(oBucket.id,
        this.#osBucketLabel(oBucket.id, oBucket.title), oBucket.dir, '');
    });
    await Promise.all(oPlan.buckets.map(
      (oBucket) => this.#vPreloadStatuses(oBucket.dir)));
    await this.#vOpenDeepLink();
    this.#vLayout();
  }

  /**
   * @private
   * @brief Preload every node's status from a bucket's bucket.json,
   *   recursing sub-buckets, so blocker checks answer from the WHOLE
   *   tree instead of only the buckets the user happened to open.
   *   Bodies and graph elements stay lazy; only the small bucket.json
   *   files are fetched. This kills the ghost-BLOCKED lie: a satisfied
   *   cross-bucket needs rendered its dependent as Blocked until the
   *   target's bucket was opened (bugs/plan-ghost-blocked).
   * @param {string} osDir - Bucket dir path relative to the data root.
   * @returns {Promise<void>}
   */
  async #vPreloadStatuses(osDir) {
    const oData = await this.#oFetchJson(osDir + '/bucket.json');
    if (oData === null) return;
    (oData.nodes || []).forEach((oNode) => {
      this.#oStatusById[oNode.id] = oNode.status;
    });
    await Promise.all((oData.subs || []).map(
      (osSub) => this.#vPreloadStatuses(osDir + '/' + osSub)));
  }

  /**
   * @private
   * @brief Auto-open the buckets named in the ?open= query (deep link).
   * @returns {Promise<void>}
   */
  async #vOpenDeepLink() {
    const osOpen = new URLSearchParams(location.search).get('open');
    if (osOpen === null) {
      return;
    }
    const aIds = osOpen.split(',');
    let i = 0;
    while (i < aIds.length) {
      if (this.#oBuckets[aIds[i]] !== undefined) {
        await this.#vOpenBucket(aIds[i]);
      }
      i += 1;
    }
  }

  /**
   * @private
   * @brief Create the Cytoscape instance and bind taps.
   */
  #vBuildCy() {
    this.#oCy = cytoscape({
      container: document.getElementById('DnaToolsPlanCy'),
      minZoom: 0.2,
      maxZoom: 2.5,
      style: this.#aStyle()
    });
    this.#oCy.on('tap', 'node', (oEvt) => {
      const oNode = oEvt.target;
      if (oNode.data('kind') === 'bucket') {
        this.#vToggleBucket(oNode.data('id').slice(2));
      } else if (oNode.data('kind') === 'item') {
        this.#vShowItem(oNode.data('id'));
      } else if (oNode.data('kind') === 'ghost') {
        this.#vSetPanel(oNode.data('id') + ' lives in another bucket --'
          + ' open that bucket to load it.', false);
      }
    });
    this.#oCy.on('tap', (oEvt) => {
      if (oEvt.target === this.#oCy) {
        this.#vSetPanel('Tap a bucket to open it, then an item to read'
          + ' it.', true);
      }
    });
    this.#oCy.on('layoutstop', () => this.#oCy.fit(undefined, 60));
  }

  /**
   * @private
   * @brief The Cytoscape stylesheet.
   * @returns {object[]} Style rules.
   */
  #aStyle() {
    return [
      { selector: 'node[kind = "bucket"]', style: {
        'background-color': this.#osCssVar('--DnaToolsPlan-panel'),
        'border-width': 2,
        'border-color': this.#osCssVar('--DnaToolsPlan-accent'),
        'shape': 'round-rectangle',
        'label': 'data(label)',
        'color': this.#osCssVar('--DnaToolsPlan-ink'),
        'font-size': 12,
        'font-weight': 600,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 130,
        'width': 150,
        'height': 42
      } },
      { selector: 'node[kind = "item"]', style: {
        'background-color': 'data(color)',
        'shape': 'data(shape)',
        'label': 'data(id)',
        'color': this.#osCssVar('--DnaToolsPlan-ink'),
        'font-family': 'ui-monospace, Menlo, Consolas, monospace',
        'font-size': 12,
        'font-weight': 600,
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 44,
        'height': 44
      } },
      { selector: 'node[kind = "ghost"]', style: {
        'background-color': 'data(color)',
        'background-opacity': 0.25,
        'border-width': 2,
        'border-style': 'dashed',
        'border-color': this.#osCssVar('--DnaToolsPlan-missing'),
        'label': 'data(id)',
        'color': this.#osCssVar('--DnaToolsPlan-ink-dim'),
        'font-family': 'ui-monospace, Menlo, Consolas, monospace',
        'font-size': 11,
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 38,
        'height': 38
      } },
      { selector: 'edge[kind = "own"]', style: {
        'width': 1.5,
        'line-color': this.#osCssVar('--DnaToolsPlan-line'),
        'line-style': 'dashed',
        'opacity': 0.7,
        'curve-style': 'bezier'
      } },
      { selector: 'edge[kind = "dep"]', style: {
        'width': 2,
        'line-color': this.#osCssVar('--DnaToolsPlan-ink-dim'),
        'target-arrow-color': this.#osCssVar('--DnaToolsPlan-ink-dim'),
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.1
      } },
      { selector: 'node:selected', style: {
        'border-width': 4,
        'border-color': this.#osCssVar('--DnaToolsPlan-accent')
      } }
    ];
  }

  /**
   * @private
   * @brief Label for a top bucket: id + title when the id is a number
   *   that carries information the title does not; the title alone for
   *   a named bucket, whose id is only a slug of the title (showing
   *   both is the "dept of redundancy dept" label).
   * @param {string} osId - Bucket id.
   * @param {string} osTitle - Bucket title.
   * @returns {string} The super-node label.
   */
  #osBucketLabel(osId, osTitle) {
    let osResult = osTitle;

    if (/^[0-9]+$/.test(osId)) {
      osResult = osId + '  ' + osTitle;
    }

    return osResult;
  }

  /**
   * @private
   * @brief Register a bucket and draw its super-node (idempotent).
   * @details Used for both the top buckets (from plan.json) and the
   *   sub-buckets discovered in a parent's "subs" -- the named
   *   tooling-and-governance bucket nests, so a bucket can own child
   *   buckets as well as items.
   * @param {string} osId - Bucket id (also the b: node id, no prefix).
   * @param {string} osLabel - Super-node label text.
   * @param {string} osDir - Bucket directory under the data root.
   * @param {string} osParent - Parent bucket id, or "" for a top bucket.
   * @returns {void}
   */
  #vRegisterBucket(osId, osLabel, osDir, osParent) {
    this.#oBuckets[osId] = {
      osTitle: osLabel,
      osDir: osDir,
      osParent: osParent
    };
    if (this.#oCy.getElementById('b:' + osId).empty()) {
      this.#oCy.add({ data: {
        id: 'b:' + osId,
        kind: 'bucket',
        label: osLabel
      } });
    }
  }

  /**
   * @private
   * @brief Open a closed bucket or close an open one.
   * @param {string} osBucketId - The bucket id (no b: prefix).
   * @returns {Promise<void>}
   */
  async #vToggleBucket(osBucketId) {
    if (this.#oOpen[osBucketId] === true) {
      this.#vCloseBucket(osBucketId);
    } else {
      await this.#vOpenBucket(osBucketId);
    }
    await this.#vShowBucket(osBucketId);
    this.#vLayout();
  }

  /**
   * @private
   * @brief Load a bucket's prose (bucket.md) and render it in the panel.
   *   The bucket header's intro and asides live here -- the channel that
   *   keeps that prose from being lost when the plan moves to the tree.
   * @param {string} osBucketId - The bucket id.
   * @returns {Promise<void>}
   */
  async #vShowBucket(osBucketId) {
    const oBucket = this.#oBuckets[osBucketId];
    if (oBucket === undefined) {
      return;
    }
    if (oBucket.osBody === undefined) {
      this.#vSetPanel(osBucketId + '  ' + oBucket.osTitle, false);
      return;
    }
    const osText = await this.#osFetchText(
      oBucket.osDir + '/' + oBucket.osBody);

    this.#oPanel.classList.remove('DnaToolsPlan-empty');
    this.#oPanel.textContent = '';
    const oPill = document.createElement('div');
    oPill.className = 'DnaToolsPlan-pill';
    oPill.style.background = this.#osCssVar('--DnaToolsPlan-accent');
    oPill.textContent = 'Bucket ' + osBucketId;
    const oPre = document.createElement('pre');
    oPre.textContent = osText;
    this.#oPanel.appendChild(oPill);
    this.#oPanel.appendChild(oPre);
  }

  /**
   * @private
   * @brief Load a bucket's sub-buckets and items, wire edges, lay out.
   * @details A bucket.json may carry "subs" (child sub-bucket dir names)
   *   and/or "nodes". A container (the top T&G bucket, each kind) has subs
   *   and no own nodes; a leaf (implemented / proposed) has nodes. Opening
   *   a container draws its child bucket super-nodes; opening a leaf draws
   *   its item nodes. Tapping a child recurses through the same path.
   * @param {string} osBucketId - The bucket id.
   * @returns {Promise<void>}
   */
  async #vOpenBucket(osBucketId) {
    const oBucket = this.#oBuckets[osBucketId];
    const oData = await this.#oFetchJson(oBucket.osDir + '/bucket.json');
    if (oData === null) {
      return;
    }
    oBucket.osBody = oData.body;
    (oData.subs || []).forEach((osSub) => {
      const osChildId = oBucket.osDir + '/' + osSub;
      // label is the leaf dir name only (proposed, implemented, hooks);
      // the parent super-node it nests under supplies the kind context
      const osLabel = osChildId.split('/').pop();
      this.#vRegisterBucket(osChildId, osLabel, osChildId, osBucketId);
      this.#vAddOwnEdge(osBucketId, 'b:' + osChildId);
    });
    (oData.nodes || []).forEach((oNode) => {
      this.#oItems[oNode.id] = {
        osTitle: oNode.title,
        osType: oNode.type || '',
        osStatus: oNode.status,
        aNeeds: oNode.needs || [],
        osBucket: osBucketId,
        osBody: oNode.body
      };
      const oExisting = this.#oCy.getElementById(oNode.id);
      if (oExisting.empty()) {
        this.#oCy.add({ data: {
          id: oNode.id,
          kind: 'item',
          shape: this.#osShape(oNode.type || ''),
          color: this.#osCssVar('--DnaToolsPlan-park')
        } });
      } else {
        oExisting.data('kind', 'item');
        oExisting.data('shape', this.#osShape(oNode.type || ''));
      }
      this.#vAddOwnEdge(osBucketId, oNode.id);
    });
    this.#oOpen[osBucketId] = true;
    this.#vAddGhosts();
    this.#vAddEdges();
    this.#vRecolor();
  }

  /**
   * @private
   * @brief Add the light "contains" edge from a bucket to a child.
   * @param {string} osBucketId - The parent bucket id.
   * @param {string} osTargetId - The child: an item id, or a b:-prefixed
   *   sub-bucket node id.
   * @returns {void}
   */
  #vAddOwnEdge(osBucketId, osTargetId) {
    const osEdge = 'own:' + osBucketId + '>' + osTargetId;
    if (this.#oCy.getElementById(osEdge).empty()) {
      this.#oCy.add({ data: {
        id: osEdge,
        source: 'b:' + osBucketId,
        target: osTargetId,
        kind: 'own'
      } });
    }
  }

  /**
   * @private
   * @brief Close a bucket: drop its items and its sub-buckets, tidy ghosts.
   * @details Recurses into open child sub-buckets first (a container may
   *   hold buckets, not items), so collapsing the top T&G node tears down
   *   the whole subtree it opened.
   * @param {string} osBucketId - The bucket id.
   * @returns {void}
   */
  #vCloseBucket(osBucketId) {
    const aItems = [];
    Object.keys(this.#oItems).forEach((osId) => {
      if (this.#oItems[osId].osBucket === osBucketId) {
        aItems.push(osId);
        delete this.#oItems[osId];
      }
    });
    aItems.forEach((osId) => {
      this.#oCy.getElementById(osId).remove();
    });

    const aKids = [];
    Object.keys(this.#oBuckets).forEach((osId) => {
      const oRec = this.#oBuckets[osId];
      if (oRec !== undefined && oRec.osParent === osBucketId) {
        aKids.push(osId);
      }
    });
    aKids.forEach((osId) => {
      this.#vCloseBucket(osId);
      this.#oCy.getElementById('b:' + osId).remove();
      delete this.#oBuckets[osId];
    });

    this.#oOpen[osBucketId] = false;
    this.#vCleanGhosts();
  }

  /**
   * @private
   * @brief Remove ghost nodes that no longer have any edge.
   */
  #vCleanGhosts() {
    this.#oCy.nodes('[kind = "ghost"]').forEach((oNode) => {
      if (oNode.degree(false) === 0) {
        oNode.remove();
      }
    });
  }

  /**
   * @private
   * @brief Add a ghost node for any needs target not yet loaded, so the
   *   cross-bucket edge still draws and the layout has structure.
   */
  #vAddGhosts() {
    Object.keys(this.#oItems).forEach((osId) => {
      this.#oItems[osId].aNeeds.forEach((osNeed) => {
        if (this.#oItems[osNeed] === undefined
            && this.#oCy.getElementById(osNeed).empty()) {
          this.#oCy.add({ data: {
            id: osNeed,
            kind: 'ghost',
            color: this.#osCssVar('--DnaToolsPlan-missing')
          } });
        }
      });
    });
  }

  /**
   * @private
   * @brief Add any needs edge whose both endpoints are now present.
   */
  #vAddEdges() {
    Object.keys(this.#oItems).forEach((osId) => {
      this.#oItems[osId].aNeeds.forEach((osNeed) => {
        const osEdge = 'dep:' + osNeed + '>' + osId;
        const bHaveBoth = !this.#oCy.getElementById(osId).empty()
          && !this.#oCy.getElementById(osNeed).empty();
        if (bHaveBoth && this.#oCy.getElementById(osEdge).empty()) {
          this.#oCy.add({ data: {
            id: osEdge, source: osNeed, target: osId, kind: 'dep'
          } });
        }
      });
    });
  }

  /**
   * @private
   * @brief Is a needs target settled -- terminal DONE or DEAD, either
   *   of which clears a blocker (plan-tree.md). Answers from the
   *   boot-time status preload, so a node in an unopened bucket counts
   *   correctly instead of reading as an open blocker.
   * @param {string} osId - Item id.
   * @returns {boolean} True when the item is terminal (DONE/DEAD).
   */
  #bIsSettled(osId) {
    const eStatus = this.#oStatusById[osId];
    return eStatus === 'DONE' || eStatus === 'DEAD';
  }

  /**
   * @private
   * @brief Display status: raw, or BLOCKED when a need is unmet.
   * @param {object} oItem - The item record.
   * @returns {string} Status for coloring.
   */
  #eDisplayStatus(oItem) {
    let eResult = oItem.osStatus;

    if (this.#aBuildable.indexOf(oItem.osStatus) >= 0) {
      const bBlocked = oItem.aNeeds.some((osId) => !this.#bIsSettled(osId));
      if (bBlocked) {
        eResult = 'BLOCKED';
      }
    }

    return eResult;
  }

  /**
   * @private
   * @brief The node shape for a type -- the second axis.
   * @details Unknown types fall back to the untyped ellipse rather
   *   than throwing: --check is what rejects a bad type value, and a
   *   viewer that blanks the graph over one typo is worse than a
   *   viewer that draws it plainly.
   * @param {string} osType - Node type, '' when untyped.
   * @returns {string} A cytoscape node-shape name.
   */
  #osShape(osType) {
    const oDef = this.#oTypeDefs[osType] || this.#oTypeDefs[''];
    return oDef.osShape;
  }

  /**
   * @private
   * @brief The colour for a status.
   * @param {string} eStatus - Status string.
   * @returns {string} A CSS colour value.
   */
  #osColor(eStatus) {
    const oDef = this.#oStatusDefs[eStatus] || this.#oStatusDefs.PARK;
    return this.#osCssVar(oDef.osVar);
  }

  /**
   * @private
   * @brief Recompute every loaded item node's colour.
   */
  #vRecolor() {
    Object.keys(this.#oItems).forEach((osId) => {
      const eStatus = this.#eDisplayStatus(this.#oItems[osId]);
      this.#oCy.getElementById(osId).data('color', this.#osColor(eStatus));
    });
  }

  /**
   * @private
   * @brief Run the Cluster layout (fcose), with a cose fallback if
   *   fcose is not registered. The only layout since Flow was retired
   *   (see the file header).
   */
  #vLayout() {
    const oOpt = {
      name: 'fcose',
      animate: true,
      animationDuration: 400,
      quality: 'default',
      packComponents: true,
      nodeRepulsion: 20000,
      idealEdgeLength: 110,
      padding: 50
    };

    try {
      this.#oCy.layout(oOpt).run();
    } catch (oError) {
      this.#oCy.layout({ name: 'cose', animate: true, padding: 40 }).run();
    }
  }

  /**
   * @private
   * @brief Load an item's prose and render it in the side panel.
   * @param {string} osId - Item id.
   * @returns {Promise<void>}
   */
  async #vShowItem(osId) {
    const oItem = this.#oItems[osId];
    if (oItem === undefined) {
      return;
    }
    const osText = await this.#osFetchText(
      this.#oBuckets[oItem.osBucket].osDir + '/' + oItem.osBody);
    const eStatus = this.#eDisplayStatus(oItem);

    this.#oPanel.classList.remove('DnaToolsPlan-empty');
    this.#oPanel.textContent = '';
    const oPill = document.createElement('div');
    oPill.className = 'DnaToolsPlan-pill';
    oPill.style.background = this.#osColor(eStatus);
    oPill.textContent = (this.#oStatusDefs[eStatus]
      || this.#oStatusDefs.PARK).osLabel;
    /* Both axes, always, and never only one: reporting a node's
       status while hiding its type is how a reader inherits the old
       one-field model (the same reason plan-find reports both). */
    const oType = document.createElement('div');
    oType.className = 'DnaToolsPlan-pill DnaToolsPlan-typepill';
    oType.textContent = (this.#oTypeDefs[oItem.osType]
      || this.#oTypeDefs['']).osLabel;
    const oPre = document.createElement('pre');
    oPre.textContent = osText;
    this.#oPanel.appendChild(oPill);
    this.#oPanel.appendChild(oType);
    this.#oPanel.appendChild(oPre);
  }

  /**
   * @private
   * @brief Build the legend: colour = status, shape = type.
   * @details Two rows because there are two axes, and a legend that
   *   showed only colour would teach the reader the graph has one.
   *   The shape row uses CSS clip-path silhouettes rather than the
   *   cytoscape shapes themselves -- the legend lives in the DOM, not
   *   on the canvas, so it can only approximate them; the point is
   *   "these differ and here is which is which", not pixel parity.
   */
  #vRenderLegend() {
    const aShow = ['READY', 'PARTIAL', 'BLOCKED', 'EVAL', 'SPEC', 'DEFER',
      'PARK', 'DONE', 'DEAD', 'MISSING'];
    aShow.forEach((eStatus) => {
      const oSpan = document.createElement('span');
      const oDot = document.createElement('i');
      oDot.className = 'DnaToolsPlan-dot';
      oDot.style.background = this.#osColor(eStatus);
      oSpan.appendChild(oDot);
      oSpan.appendChild(document.createTextNode(
        this.#oStatusDefs[eStatus].osLabel));
      this.#oLegend.appendChild(oSpan);
    });

    const oBreak = document.createElement('span');
    oBreak.className = 'DnaToolsPlan-legendbreak';
    oBreak.textContent = 'type:';
    this.#oLegend.appendChild(oBreak);

    Object.keys(this.#oTypeDefs).forEach((osType) => {
      const oSpan = document.createElement('span');
      const oMark = document.createElement('i');
      oMark.className = 'DnaToolsPlan-dot DnaToolsPlan-shape-'
        + (osType === '' ? 'untyped' : osType);
      oSpan.appendChild(oMark);
      oSpan.appendChild(document.createTextNode(
        this.#oTypeDefs[osType].osLabel));
      this.#oLegend.appendChild(oSpan);
    });
  }

  /**
   * @private
   * @brief Set the side panel to a plain message.
   * @param {string} osMsg - The message.
   * @param {boolean} bEmpty - Whether to show the dimmed empty style.
   */
  #vSetPanel(osMsg, bEmpty) {
    this.#oPanel.textContent = osMsg;
    if (bEmpty) {
      this.#oPanel.classList.add('DnaToolsPlan-empty');
    } else {
      this.#oPanel.classList.remove('DnaToolsPlan-empty');
    }
  }
}

const oPlanGraph = new PlanGraph();
