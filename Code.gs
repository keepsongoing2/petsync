/**
 * Code.gs
 * Main business logic for PetSync: UI hooks, data fetching, and sheet writing.
 */

/**
 * Adds the "PetSync" custom menu to the spreadsheet UI on open.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('PetSync')
    .addItem('Open Sidebar', 'openSidebar')
    .addItem('Configure Auto Sync', 'setupTimeTrigger')
    .addToUi();
}

/**
 * Opens the PetSync sidebar UI.
 */
function openSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('PetSync')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Configures the automatic synchronization trigger.
 * @param {number} [intervalMinutes=60] The interval in minutes between syncs.
 * @param {boolean} [enabled=true] Whether to enable or disable the trigger.
 */
function setupTimeTrigger(intervalMinutes, enabled) {
  const triggers = ScriptApp.getProjectTriggers();
  // Disable triggers if enabled=false
  if (enabled === false) {
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'fetchData') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    SpreadsheetApp.getUi().alert('Auto sync disabled.');
    return;
  }
  // Remove existing fetchData triggers
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'fetchData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  // Create new trigger with specified interval or default hourly
  const minutes = typeof intervalMinutes === 'number' ? intervalMinutes : 60;
  ScriptApp.newTrigger('fetchData')
    .timeBased()
    .everyMinutes(minutes)
    .create();
  SpreadsheetApp.getUi().alert(`Auto sync set to every ${minutes} minutes.`);
}

/**
 * Fetches data from configured API endpoints, validates, writes to sheet, and sets up triggers.
 * @returns {{success: boolean, rows: number}}
 */
function fetchData() {
  try {
    const config = getApiConfig();
    if (!config || !config.apiUrl || !Array.isArray(config.endpoints)) {
      throw new Error('Invalid API configuration');
    }
    const allData = [];
    config.endpoints.forEach(function(endpoint) {
      const url = config.apiUrl + endpoint;
      const options = {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + config.apiKey },
        muteHttpExceptions: true
      };
      const response = UrlFetchApp.fetch(url, options);
      const json = JSON.parse(response.getContentText());
      validateResponse(json);
      if (Array.isArray(json.data)) {
        allData.push.apply(allData, json.data);
      }
    });
    const result = writeData(allData);
    setupTriggers();
    logSuccess(`Data fetch complete: ${result.rows} rows written.`);
    return result;
  } catch (error) {
    logError(error);
    throw error;
  }
}

/**
 * Writes a 2D array of data to the spreadsheet.
 * Supports full or incremental refresh based on configuration.
 * @param {Array<Array>} data 2D array of values
 * @returns {{success: boolean, rows: number}}
 */
function writeData(data) {
  if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
    throw new Error('writeData received invalid data format');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ranges = getSheetRanges();
  const sheet = ranges.sheetName
    ? ss.getSheetByName(ranges.sheetName) || ss.getActiveSheet()
    : ss.getActiveSheet();
  const rows = data.length;
  const cols = data[0].length;
  let startCell;
  if (ranges.fullRefresh) {
    startCell = sheet.getRange(ranges.fullRefreshRange);
    sheet.getRange(ranges.fullRefreshRange).clearContent();
  } else {
    startCell = sheet.getRange(ranges.incrementalRange);
  }
  const writeRange = sheet.getRange(
    startCell.getRow(),
    startCell.getColumn(),
    rows,
    cols
  );
  writeRange.setValues(data);
  return { success: true, rows: rows };
}

/**
 * Ensures a time-driven trigger exists for fetchData to run periodically.
 */
function setupTriggers() {
  const existing = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'fetchData';
  });
  if (!existing) {
    ScriptApp.newTrigger('fetchData')
      .timeBased()
      .everyHours(1)
      .create();
  }
}