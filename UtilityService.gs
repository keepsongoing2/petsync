use strict';
var UtilityService = (function() {
  /**
   * Logs a success message to Apps Script Logger and shows a Spreadsheet toast.
   * @param {string} message - Success message to log and display.
   */
  function logSuccess(message) {
    if (typeof message !== 'string') {
      throw new Error('logSuccess: message must be a string');
    }
    Logger.log('SUCCESS: ' + message);
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(message, 'PetSync Success', 5);
    } catch (e) {
      Logger.log('PetSync toast failed: ' + e.message);
    }
  }

  /**
   * Logs an error object or message to Apps Script Logger and shows a Spreadsheet toast.
   * @param {(Error|string|Object)} error - Error instance, message, or object to log.
   */
  function logError(error) {
    var msg = '';
    if (error instanceof Error) {
      msg = error.message;
    } else if (typeof error === 'string') {
      msg = error;
    } else {
      try {
        msg = JSON.stringify(error);
      } catch (e) {
        msg = String(error);
      }
    }
    Logger.log('ERROR: ' + msg);
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'PetSync Error', 5);
    } catch (e) {
      Logger.log('PetSync error toast failed: ' + e.message);
    }
  }

  /**
   * Validates that a response object contains required keys.
   * @param {Object} response - The response object to validate.
   * @param {string[]} requiredKeys - Array of required property names.
   * @throws {Error} If response is invalid or missing any required key.
   */
  function validateResponse(response, requiredKeys) {
    if (typeof response !== 'object' || response === null) {
      throw new Error('validateResponse: response must be a non-null object');
    }
    if (!Array.isArray(requiredKeys)) {
      throw new Error('validateResponse: requiredKeys must be an array of strings');
    }
    requiredKeys.forEach(function(key) {
      if (!response.hasOwnProperty(key)) {
        throw new Error('validateResponse: missing required key "' + key + '"');
      }
    });
    return true;
  }

  /**
   * Sanitizes a string by stripping HTML tags and trimming whitespace.
   * @param {string} input - The string to sanitize.
   * @returns {string} Sanitized string.
   */
  function sanitizeString(input) {
    if (typeof input !== 'string') {
      throw new Error('sanitizeString: input must be a string');
    }
    return input.replace(/<[^>]*>?/g, '').trim();
  }

  /**
   * Formats a Date object into a string using the given pattern.
   * @param {Date} date - Date object to format.
   * @param {string} [pattern="yyyy-MM-dd'T'HH:mm:ss'Z'"] - Date format pattern.
   * @returns {string} Formatted date string.
   */
  function formatDate(date, pattern) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('formatDate: date must be a valid Date object');
    }
    var fmt = typeof pattern === 'string' ? pattern : "yyyy-MM-dd'T'HH:mm:ss'Z'";
    var tz = Session.getScriptTimeZone();
    return Utilities.formatDate(date, tz, fmt);
  }

  /**
   * Parses a date string into a Date object.
   * @param {string} dateString - ISO 8601 date string.
   * @returns {Date} Parsed Date object.
   */
  function parseDate(dateString) {
    if (typeof dateString !== 'string') {
      throw new Error('parseDate: dateString must be a string');
    }
    var d = new Date(dateString);
    if (isNaN(d.getTime())) {
      throw new Error('parseDate: invalid date string "' + dateString + '"');
    }
    return d;
  }

  /**
   * Calls an external API endpoint using UrlFetchApp.fetch and returns parsed JSON.
   * @param {string} url - Full URL to call.
   * @param {Object} [options] - Fetch options.
   * @param {string} [options.method='get'] - HTTP method.
   * @param {Object} [options.headers] - HTTP headers.
   * @param {(Object|string)} [options.payload] - Request payload.
   * @param {number} [options.timeout=30000] - Timeout in milliseconds.
   * @returns {Object} Parsed JSON response.
   * @throws {Error} If fetch fails, non-200 status, or JSON parse error.
   */
  function callApi(url, options) {
    if (typeof url !== 'string' || url === '') {
      throw new Error('callApi: url must be a non-empty string');
    }
    options = options || {};
    var method = options.method && typeof options.method === 'string'
      ? options.method.toUpperCase()
      : 'GET';
    var fetchOptions = {
      method: method,
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: options.headers || {},
      payload: options.payload && typeof options.payload === 'string'
        ? options.payload
        : options.payload ? JSON.stringify(options.payload) : null,
      validateHttpsCertificates: true,
      followRedirects: true,
      timeout: typeof options.timeout === 'number' ? options.timeout : 30000
    };
    var startTime = new Date().getTime();
    var response;
    try {
      response = UrlFetchApp.fetch(url, fetchOptions);
    } catch (e) {
      logError(e);
      throw new Error('callApi: request failed for ' + url + ' - ' + e.message);
    }
    var duration = new Date().getTime() - startTime;
    Logger.log('callApi: ' + method + ' ' + url + ' took ' + duration + 'ms');
    var code = response.getResponseCode();
    var body = response.getContentText();
    if (code < 200 || code >= 300) {
      throw new Error('callApi: HTTP ' + code + ' - ' + body);
    }
    try {
      return JSON.parse(body);
    } catch (e) {
      throw new Error('callApi: JSON parse error - ' + e.message);
    }
  }

  return {
    logSuccess: logSuccess,
    logError: logError,
    validateResponse: validateResponse,
    sanitizeString: sanitizeString,
    formatDate: formatDate,
    parseDate: parseDate,
    callApi: callApi
  };
})();