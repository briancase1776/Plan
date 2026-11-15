/***************************************************************************//**
 * @file config/errors.config.js
 * @brief Error framework configuration.
 * @details Edit this file to control log level, output mode, timer
 *   visibility, and output handlers. Must be loaded before
 *   lib/errors.js in manifest.json.
 * Copyright (c) 2026 Brian Case. All rights reserved.
 * AI contributor: Claude (Anthropic)
 * MIT License text omitted for brevity. See LICENCE.TXT
 ******************************************************************************/

/**
 * @brief Minimum log level: 'debug'|'info'|'warn'|'error'|'fatal'
 * @type {string}
 */
const eLevel = 'debug';

/**
 * @brief Output mode: true = dev (pretty), false = prod (JSON)
 * @type {boolean}
 */
const bDev = true;

/**
 * @brief Enable timer output.
 * @type {boolean}
 */
const bTimers = true;

/**
 * @brief Output handlers. Empty = use console default.
 * @details Each handler: function(eLevel, osOut) where eLevel is
 *   the severity string and osOut is the formatted output string.
 * @type {Array<Function>}
 */
const aHandlers = [];

/**
 * @brief Errors framework configuration object.
 * @type {Object}
 */
const oConfig = {
  eLevel:    eLevel,
  bDev:      bDev,
  bTimers:   bTimers,
  aHandlers: aHandlers
};
