/**
 * Config.gs
 * Purpose: Load and expose PetSync configuration settings.
 * Stores API settings, sheet names and ranges, endpoints, and trigger configs.
 * Loads defaults and overrides from ScriptProperties and UserProperties.
 */

var Config = (function() {
  'use strict';

  // Default configuration values.
  var DEFAULTS = {
    apiUrl: 'https://api.example.com/petsync',
    apiKey: '', // Must be set via script properties or user properties.
    endpoints: {
      fetchPets: '/pets',
      fetchOwners: '/owners'
    },
    sheetName: 'Pets',
    fullRefreshRange: 'A2:Z',
    incrementalRefreshRange: 'A2:Z',
    triggerName: 'PetSync_FetchData'
  };

  // Load overrides from Script and User Properties.
  function loadOverrides() {
    var overrides = {};
    var scriptProps = PropertiesService.getScriptProperties().getProperties();
    var userProps = PropertiesService.getUserProperties().getProperties();
    var allProps = Object.assign({}, scriptProps, userProps);
    Object.keys(allProps).forEach(function(key) {
      var val = allProps[key];
      switch(key) {
        case 'API_URL':
          overrides.apiUrl = val;
          break;
        case 'API_KEY':
          overrides.apiKey = val;
          break;
        case 'ENDPOINTS':
          try {
            overrides.endpoints = JSON.parse(val);
          } catch(e) {
            throw new Error('Invalid JSON for ENDPOINTS in PropertiesService');
          }
          break;
        case 'SHEET_NAME':
          overrides.sheetName = val;
          break;
        case 'FULL_REFRESH_RANGE':
          overrides.fullRefreshRange = val;
          break;
        case 'INCREMENTAL_REFRESH_RANGE':
          overrides.incrementalRefreshRange = val;
          break;
        case 'TRIGGER_NAME':
          overrides.triggerName = val;
          break;
        default:
          break;
      }
    });
    return overrides;
  }

  // Deep merge defaults with overrides.
  function mergeConfig(defaults, overrides) {
    var merged = JSON.parse(JSON.stringify(defaults));
    Object.keys(overrides).forEach(function(key) {
      if (overrides[key] !== undefined) {
        if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key]) && merged[key]) {
          merged[key] = mergeConfig(merged[key], overrides[key]);
        } else {
          merged[key] = overrides[key];
        }
      }
    });
    return merged;
  }

  // Validate final config.
  function validate(config) {
    if (!config.apiUrl || typeof config.apiUrl !== 'string' || !/^https?:\/\//.test(config.apiUrl)) {
      throw new Error('Config validation failed: apiUrl must be a valid HTTP(S) URL');
    }
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('Config validation failed: apiKey is required and must be a string');
    }
    if (!config.endpoints || typeof config.endpoints !== 'object') {
      throw new Error('Config validation failed: endpoints must be an object');
    }
    Object.keys(config.endpoints).forEach(function(name) {
      var path = config.endpoints[name];
      if (typeof path !== 'string' || !path) {
        throw new Error('Config validation failed: endpoint "' + name + '" must be a non-empty string');
      }
      if (!path.startsWith('/')) {
        throw new Error('Config validation failed: endpoint "' + name + '" should start with "/"');
      }
    });
    if (!config.sheetName || typeof config.sheetName !== 'string') {
      throw new Error('Config validation failed: sheetName is required and must be a string');
    }
    if (!config.fullRefreshRange || typeof config.fullRefreshRange !== 'string') {
      throw new Error('Config validation failed: fullRefreshRange is required and must be a string');
    }
    if (!config.incrementalRefreshRange || typeof config.incrementalRefreshRange !== 'string') {
      throw new Error('Config validation failed: incrementalRefreshRange is required and must be a string');
    }
    if (!config.triggerName || typeof config.triggerName !== 'string') {
      throw new Error('Config validation failed: triggerName is required and must be a string');
    }
  }

  // Build the frozen config object.
  var _config = (function() {
    var overrides = loadOverrides();
    var cfg = mergeConfig(DEFAULTS, overrides);
    validate(cfg);
    return Object.freeze(cfg);
  })();

  // Exposed API.
  return {
    getApiConfig: function() {
      return Object.freeze({
        apiUrl: _config.apiUrl,
        apiKey: _config.apiKey,
        endpoints: Object.freeze(Object.assign({}, _config.endpoints))
      });
    },
    getSheetRanges: function() {
      return Object.freeze({
        sheetName: _config.sheetName,
        fullRefreshRange: _config.fullRefreshRange,
        incrementalRefreshRange: _config.incrementalRefreshRange,
        incrementalRange: _config.incrementalRefreshRange
      });
    },
    getTriggerName: function() {
      return _config.triggerName;
    },
    // For testing: expose internal config.
    _getRawConfig: function() {
      return _config;
    }
  };
})();

// Basic assertions to test config loading.
(function testConfig() {
  var apiConf = Config.getApiConfig();
  if (!apiConf.apiUrl || !apiConf.apiKey) {
    throw new Error('Config test failed: API configuration incomplete.');
  }
  var ranges = Config.getSheetRanges();
  if (!ranges.sheetName || !ranges.fullRefreshRange || !ranges.incrementalRefreshRange) {
    throw new Error('Config test failed: Sheet ranges configuration incomplete.');
  }
})();