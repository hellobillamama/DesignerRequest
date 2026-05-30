/**
 * ============================================================
 * GOOGLE APPS SCRIPT — Paste this into your Google Sheet
 * ============================================================
 * 
 * HOW TO USE:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete the default code
 * 4. Paste ALL of this code
 * 5. Click Save (Ctrl+S)
 * 6. Click Deploy → New Deployment
 * 7. Type: Web app
 * 8. Execute as: Me
 * 9. Who has access: Anyone
 * 10. Click Deploy → Copy the URL
 * 11. Paste URL in your .env.local as NEXT_PUBLIC_GOOGLE_SCRIPT_URL
 * ============================================================
 */

// Handle GET requests (read data)
function doGet(e) {
  var action = e.parameter.action;
  var sheet = e.parameter.sheet;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getAll') {
    return getAllData(ss, sheet);
  }
  
  if (action === 'getHistory') {
    var requestId = e.parameter.requestId;
    return getHistory(ss, requestId);
  }
  
  if (action === 'search') {
    var query = e.parameter.query;
    return searchData(ss, query);
  }
  
  return jsonResponse({ error: 'Unknown action' });
}

// Handle POST requests (write data)
function doPost(e) {
  var action = e.parameter.action;
  var sheet = e.parameter.sheet;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'create') {
    var data = JSON.parse(e.parameter.data);
    return createRow(ss, sheet, data);
  }
  
  if (action === 'update') {
    var id = e.parameter.id;
    var data = JSON.parse(e.parameter.data);
    return updateRow(ss, sheet, id, data);
  }
  
  return jsonResponse({ error: 'Unknown action' });
}

// ============ GET ALL DATA ============
function getAllData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ data: [] });
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ data: [] });
  
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j] !== undefined ? String(data[i][j]) : '';
    }
    rows.push(row);
  }
  
  return jsonResponse({ data: rows });
}

// ============ GET HISTORY FOR A REQUEST ============
function getHistory(ss, requestId) {
  var sheet = ss.getSheetByName('StatusHistory');
  if (!sheet) return jsonResponse({ data: [] });
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ data: [] });
  
  var headers = data[0];
  var requestIdCol = headers.indexOf('request_id');
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][requestIdCol]) === requestId) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j] !== undefined ? String(data[i][j]) : '';
      }
      rows.push(row);
    }
  }
  
  return jsonResponse({ data: rows });
}

// ============ SEARCH ============
function searchData(ss, query) {
  var sheet = ss.getSheetByName('MaterialRequests');
  if (!sheet) return jsonResponse({ data: [] });
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ data: [] });
  
  var headers = data[0];
  var q = query.toLowerCase();
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var match = false;
    for (var j = 0; j < data[i].length; j++) {
      if (String(data[i][j]).toLowerCase().indexOf(q) !== -1) {
        match = true;
        break;
      }
    }
    if (match) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j] !== undefined ? String(data[i][j]) : '';
      }
      rows.push(row);
    }
  }
  
  return jsonResponse({ data: rows });
}

// ============ CREATE ROW ============
function createRow(ss, sheetName, data) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ error: 'Sheet not found: ' + sheetName });
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = [];
  
  for (var i = 0; i < headers.length; i++) {
    newRow.push(data[headers[i]] || '');
  }
  
  sheet.appendRow(newRow);
  return jsonResponse({ success: true });
}

// ============ UPDATE ROW ============
function updateRow(ss, sheetName, id, data) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ error: 'Sheet not found: ' + sheetName });
  
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = 0; // First column is always the ID
  
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][idCol]) === id) {
      // Found the row, update it
      var rowNum = i + 1; // Sheets are 1-indexed
      for (var j = 0; j < headers.length; j++) {
        if (data[headers[j]] !== undefined) {
          sheet.getRange(rowNum, j + 1).setValue(data[headers[j]]);
        }
      }
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ error: 'Row not found with id: ' + id });
}

// ============ HELPER ============
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
