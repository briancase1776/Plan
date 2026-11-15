/***************************************************************************//**
 * @file lib/errors.js
 * @brief Error and performance logging framework for DNA Tools.
 * @details Proxy-based API that captures function name, caller,
 *   file, line, column, isConstructor, isAsync, call depth, heap,
 *   and timestamp automatically. Supports level filtering,
 *   deduplication, assertions, and named timers.
 *   Requires config/errors.config.js loaded before this file.
 *   Usage: err.myFunc.warn('something off')
 * Copyright (c) 2026 Brian Case. All rights reserved.
 * AI contributor: Claude (Anthropic)
 * MIT License text omitted for brevity. See LICENCE.TXT
 ******************************************************************************/

/***** level constants *****/

/**
 * @brief Numeric severity values for level comparison.
 * @type {Object}
 */
const kLevels = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
  fatal: 4
};

/**
 * @brief Maps severity level to console output method.
 * @type {Object}
 */
const kConsoleMethods = {
  debug: 'debug',
  info:  'info',
  warn:  'warn',
  error: 'error',
  fatal: 'error'
};

/***** default handler *****/

/***************************************************************************//**
 * @brief Default console output handler.
 * @details Used when oConfig.aHandlers is empty. Routes each level
 *   to the matching console method.
 * @param {string} eLevel - Severity level key.
 * @param {string} osOut  - Formatted output string.
 ******************************************************************************/
function fnConsoleHandler(eLevel, osOut) {
  const osMethod = kConsoleMethods[eLevel] || 'log';
  console[osMethod](osOut);
}

/***** benign browser noise *****/

/**
 * @brief Message substrings of browser-generated error events that
 *   carry no actionable content and are swallowed on arrival.
 * @type {Array}
 */
const kBenignErrors = [
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded'
];

/***************************************************************************//**
 * @brief Swallows known-benign browser warnings before Chrome logs them.
 * @details Chrome records every unhandled error event on an extension
 *   page into the chrome://extensions error list -- including pure
 *   noise like the ResizeObserver loop warning, whose own text says
 *   there is nothing to act on (bugs/offline-resizeobserver-error,
 *   issue #6). Nothing in this codebase registers a window error
 *   handler, so the only way to keep such noise out of the report is
 *   to mark the event handled here, in the one file every page loads
 *   first. Real errors never match kBenignErrors and pass through
 *   untouched. Capture phase, so it runs before any other listener.
 ******************************************************************************/
if (typeof window !== 'undefined') {
  window.addEventListener('error', function(oEvent) {
    const osMsg   = oEvent.message || '';
    const bBenign = kBenignErrors.some(function(osPat) {
      return osMsg.includes(osPat);
    });

    if (bBenign) {
      oEvent.stopImmediatePropagation();
      oEvent.preventDefault();
    }
  }, true);
}

/***** errors class *****/

/***************************************************************************//**
 * @class Errors
 * @brief Internal error framework state and logic.
 * @details Manages deduplication, timers, V8 stack capture,
 *   output formatting, and handler dispatch. Accessed via the
 *   err Proxy singleton defined at the bottom of this file.
 ******************************************************************************/
class Errors {

  /**
   * @brief Deduplication map keyed by funcName|msg.
   * @type {Map}
   */
  #oDedupeMap;

  /**
   * @brief Active timers keyed by funcName|label.
   * @type {Map}
   */
  #oTimerMap;

  /*************************************************************************//**
   * @brief Initializes deduplication and timer maps.
   ****************************************************************************/
  constructor() {
    this.#oDedupeMap = new Map();
    this.#oTimerMap  = new Map();
  }

  /*************************************************************************//**
   * @brief Captures structured V8 stack frames via prepareStackTrace.
   * @returns {Array} V8 CallSite array, or empty array on failure.
   ****************************************************************************/
  #getFrames() {
    let aResult = [];

    const fnPrev            = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, aF) => aF;
    aResult                 = new Error().stack || [];
    Error.prepareStackTrace = fnPrev;

    return aResult;
  }

  /*************************************************************************//**
   * @brief Builds a context object from captured stack frames.
   * @details Frame layout when err.myFunc.method('msg') is called:
   *   [0] #getFrames   [1] #getContext  [2] bind
   *   [3] Proxy get    [4] call site    [5] caller
   * @param {string} osFuncName - Name from Proxy property access.
   * @returns {Object} Context with location, flags, heap, and ts.
   ****************************************************************************/
  #getContext(osFuncName) {
    let oResult = {
      osFuncName: osFuncName,
      osCaller:   '?',
      osFile:     '?',
      nLine:      0,
      nCol:       0,
      bCtor:      false,
      bAsync:     false,
      nDepth:     0,
      dfHeap:     0,
      dfTs:       0
    };

    const aFrames = this.#getFrames();
    const nSite   = 4;
    const nCaller = 5;

    /***** call site *****/
    if (aFrames.length > nSite) {
      const oFrame   = aFrames[nSite];
      const osRaw    = oFrame.getFileName() || '?';
      const nSlash   = osRaw.lastIndexOf('/');
      oResult.osFile = nSlash >= 0
                     ? osRaw.substring(nSlash + 1)
                     : osRaw;
      oResult.nLine  = oFrame.getLineNumber()   || 0;
      oResult.nCol   = oFrame.getColumnNumber() || 0;
      oResult.bCtor  = oFrame.isConstructor()   || false;
      oResult.bAsync = oFrame.isAsync()         || false;
    }

    /***** caller *****/
    if (aFrames.length > nCaller) {
      oResult.osCaller =
        aFrames[nCaller].getFunctionName() || '?';
    }

    /***** extension depth *****/
    const osExtPrefix = 'chrome-extension://';
    oResult.nDepth    = aFrames.filter(function(oF) {
      return (oF.getFileName() || '').includes(osExtPrefix);
    }).length;

    /***** environment *****/
    oResult.dfTs = performance.now();

    if (performance.memory) {
      oResult.dfHeap =
        performance.memory.usedJSHeapSize / 1048576;
    }

    return oResult;
  }

  /*************************************************************************//**
   * @brief Formats output string from context and message.
   * @details Dev mode: human-readable string. Prod mode: JSON.
   * @param {string} eLevel - Severity level.
   * @param {Object} oCtx   - Context from #getContext.
   * @param {string} osMsg  - Log message.
   * @returns {string} Formatted output string.
   ****************************************************************************/
  #format(eLevel, oCtx, osMsg) {
    let osResult = null;

    if (oConfig.bDev) {
      osResult =   '[' + eLevel.toUpperCase() + ']'
               + '[' + oCtx.osFile + ':' + oCtx.nLine + '] '
               + oCtx.osFuncName
               + ' <-- ' + oCtx.osCaller
               + ': ' + osMsg;
    } else {
      osResult = JSON.stringify({
        level:  eLevel,
        func:   oCtx.osFuncName,
        caller: oCtx.osCaller,
        file:   oCtx.osFile,
        line:   oCtx.nLine,
        col:    oCtx.nCol,
        bCtor:  oCtx.bCtor,
        bAsync: oCtx.bAsync,
        depth:  oCtx.nDepth,
        heap:   oCtx.dfHeap.toFixed(1) + 'mb',
        ts:     oCtx.dfTs.toFixed(2),
        msg:    osMsg
      });
    }

    return osResult;
  }

  /*************************************************************************//**
   * @brief Checks and increments dedupe counter for a message.
   * @param {string} osFuncName - Function name key.
   * @param {string} osMsg      - Message key.
   * @returns {number} 0 on first occurrence, repeat count otherwise.
   ****************************************************************************/
  #dedupe(osFuncName, osMsg) {
    let nResult = 0;
    const osKey = osFuncName + '|' + osMsg;
    nResult     = this.#oDedupeMap.get(osKey) || 0;
    this.#oDedupeMap.set(osKey, nResult + 1);
    return nResult;
  }

  /*************************************************************************//**
   * @brief Dispatches formatted output to all registered handlers.
   * @param {string} eLevel - Severity level.
   * @param {string} osOut  - Formatted output string.
   ****************************************************************************/
  #output(eLevel, osOut) {
    const aH = oConfig.aHandlers.length
             ? oConfig.aHandlers
             : [fnConsoleHandler];

    for (let i = 0; i < aH.length; i++) {
      aH[i](eLevel, osOut);
    }
  }

  /*************************************************************************//**
   * @brief Core handler: filters by level, deduplicates, outputs.
   * @details Suppresses repeated messages silently. Every 100th
   *   repeat is reported with a suppressed count suffix.
   * @param {string} eLevel - Severity level.
   * @param {Object} oCtx   - Context from #getContext.
   * @param {string} osMsg  - Log message.
   ****************************************************************************/
  #handle(eLevel, oCtx, osMsg) {
    const nThreshold = kLevels[oConfig.eLevel] ?? 0;
    const bAbove     = kLevels[eLevel] >= nThreshold;

    if (bAbove) {
      const nCount     = this.#dedupe(oCtx.osFuncName, osMsg);
      const bFirstTime = nCount === 0;
      const bReport100 = nCount > 0 && nCount % 100 === 0;

      if (bFirstTime || bReport100) {
        const osOut100 = bReport100
          ? osMsg + ' (x' + nCount + ' suppressed)'
          : osMsg;
        this.#output(
          eLevel,
          this.#format(eLevel, oCtx, osOut100)
        );
      }
    }
  }

  /*************************************************************************//**
   * @brief Binds a function name and returns a logging method set.
   * @details Context is captured once at bind time when err.myFunc
   *   is accessed. All returned methods share that context.
   *   Methods: debug, info, warn, error, throw, assert, time.
   * @param {string} osFuncName - Name accessed via Proxy.
   * @returns {Object} Bound logging methods.
   ****************************************************************************/
  bind(osFuncName) {
    const oCtx  = this.#getContext(osFuncName);
    const oSelf = this;

    let oResult = {

      /** @brief Log at debug severity. @param {string} osMsg */
      debug: function(osMsg) {
        oSelf.#handle('debug', oCtx, osMsg);
      },

      /** @brief Log at info severity. @param {string} osMsg */
      info: function(osMsg) {
        oSelf.#handle('info', oCtx, osMsg);
      },

      /** @brief Log at warn severity. @param {string} osMsg */
      warn: function(osMsg) {
        oSelf.#handle('warn', oCtx, osMsg);
      },

      /** @brief Log at error severity. @param {string} osMsg */
      error: function(osMsg) {
        oSelf.#handle('error', oCtx, osMsg);
      },

      /** @brief Log at fatal severity then throw.
       *  @param {string} osMsg @throws {Error} Always. */
      throw: function(osMsg) {
        oSelf.#handle('fatal', oCtx, osMsg);
        throw new Error(osMsg);
      },

      /** @brief Assert condition; log and throw if falsy.
       *  @param {boolean} bCond @param {string} osMsg
       *  @throws {Error} If bCond is falsy. */
      assert: function(bCond, osMsg) {
        if (!bCond) {
          oSelf.#handle('fatal', oCtx, osMsg);
          throw new Error(osMsg);
        }
      },

      /** @brief Start named timer; returns stop function.
       *  @details No-op if oConfig.bTimers is false.
       *  @param {string} osLabel
       *  @returns {Function} Call to log elapsed ms. */
      time: function(osLabel) {
        let fnResult = function() {};

        if (oConfig.bTimers) {
          const osKey   = oCtx.osFuncName + '|' + osLabel;
          const dfStart = performance.now();
          oSelf.#oTimerMap.set(osKey, dfStart);

          fnResult = function() {
            const dfMs = performance.now() - dfStart;
            oSelf.#oTimerMap.delete(osKey);
            oSelf.#handle(
              'debug', oCtx,
              osLabel + ' took ' + dfMs.toFixed(2) + 'ms'
            );
          };
        }

        return fnResult;
      }

    };

    return oResult;
  }

}

/***** singleton and proxy *****/

/**
 * @brief Singleton Errors instance.
 * @type {Errors}
 */
const oErrors = new Errors();

/***************************************************************************//**
 * @brief Proxy providing the err.funcName.level(msg) API.
 * @details Accessing any property on err returns a bound set of
 *   logging methods with call context captured at that point.
 *   Non-string keys (e.g. Symbol) return undefined.
 *   Example: err.processMatch.warn('score below threshold')
 ******************************************************************************/
const err = new Proxy({}, {

  /*************************************************************************//**
   * @brief Proxy get trap: binds a function name to log methods.
   * @param {Object} _          - Unused proxy target.
   * @param {string} osFuncName - Property name used as function name.
   * @returns {Object|undefined} Bound log methods, or undefined.
   ****************************************************************************/
  get(_, osFuncName) {
    let oResult = undefined;

    if (typeof osFuncName === 'string') {
      oResult = oErrors.bind(osFuncName);
    }

    return oResult;
  }

});
