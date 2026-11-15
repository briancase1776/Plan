/***************************************************************************//**
 * @file background.js
 * @brief Opens the plan graph page (html/plan.html) when the extension's
 *   toolbar button is clicked.
 * @details In DNA Tools the page was opened from that extension's popup;
 *   here it is the whole extension, so the button opens it directly.
 *
 * Copyright (c) 2026 Brian Case. All rights reserved.
 * AI contributor: Claude (Anthropic)
 * MIT License -- see LICENCE.TXT
 ******************************************************************************/

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('html/plan.html') });
});
