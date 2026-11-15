/***************************************************************************//**
 * @file background.js
 * @brief Opens the plan graph page (html/plan.html) when the extension's
 *   toolbar button is clicked.
 * @details The page is the whole extension, so the toolbar button opens
 *   it directly; there is no popup.
 *
 * Copyright (c) 2026 Brian Case. All rights reserved.
 * AI contributor: Claude (Anthropic)
 * MIT License -- see LICENCE.TXT
 ******************************************************************************/

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('html/plan.html') });
});
