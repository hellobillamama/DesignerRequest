/**
 * Google Sheets Database Layer (Client-Side via Apps Script)
 * 
 * ALL 7 users share the same Google Sheet as the single database.
 * Data is read/written directly to the sheet — no localStorage needed.
 * Auto-refresh every 10 seconds keeps all users in sync.
 * 
 * ============ SETUP (5 minutes) ============
 * 
 * STEP 1: Create Google Sheet
 *   - Go to https://sheets.google.com → Create new spreadsheet
 *   - Name it: "Material Tracker Database"
 *   - Create 2 tabs at the bottom:
 *     Tab 1: "MaterialRequests"
 *     Tab 2: "StatusHistory"
 *   - In "MaterialRequests" tab, add Row 1 headers:
 *     request_id | request_date | material_name | process_type | quantity | unit |
 *     image_url | requested_by | department | approved_by | current_holder |
 *     sent_to | expected_return_date | priority | status | remarks | created_at | updated_at
 *   - In "StatusHistory" tab, add Row 1 headers:
 *     history_id | request_id | old_status | new_status | updated_by | update_time | comments
 * 
 * STEP 2: Add Google Apps Script
 *   - In your Google Sheet → Extensions → Apps Script
 *   - Delete default code → Paste code from GOOGLE_APPS_SCRIPT.js
 *   - Deploy → New Deployment → Web app → Anyone → Deploy
 *   - Copy the URL
 * 
 * STEP 3: Set Environment Variable
 *   - .env.local → NEXT_PUBLIC_GOOGLE_SCRIPT_URL=your_url
 * 
 * STEP 4: Deploy to Vercel
 *   - Add the same env variable in Vercel dashboard
 *   - Share the Vercel URL with all 7 team members
 * ============================================
 */

import { MaterialRequest, StatusHistory, Status, ProcessType } from './types';

const SCRIPT_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || '') 
  : '';

export function isGoogleSheetsConfigured(): boolean {
  return !!SCRIPT_URL && SCRIPT_URL.length > 10;
}

// ============ API CALLS ============

async function fetchFromScript(params: Record<string, string>): Promise<unknown> {
  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });
  return response.json();
}

async function postToScript(params: Record<string, string>): Promise<unknown> {
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  return response.json();
}

// ============ MATERIAL REQUESTS ============

export async function getAllRequestsFromSheet(): Promise<MaterialRequest[]> {
  try {
    const result = await fetchFromScript({ action: 'getAll', sheet: 'MaterialRequests' }) as { data?: Record<string, string>[] };
    if (!result.data) return [];
    return result.data.map((row) => ({
      request_id: row.request_id || '',
      request_date: row.request_date || '',
      material_name: row.material_name || '',
      process_type: (row.process_type as ProcessType) || 'Plating',
      quantity: Number(row.quantity) || 0,
      unit: row.unit || 'pcs',
      image_url: row.image_url || '',
      requested_by: row.requested_by || '',
      department: row.department || '',
      approved_by: row.approved_by || '',
      current_holder: row.current_holder || '',
      sent_to: row.sent_to || '',
      expected_return_date: row.expected_return_date || '',
      priority: (row.priority as MaterialRequest['priority']) || 'Medium',
      status: (row.status as Status) || 'Ordered',
      remarks: row.remarks || '',
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
    }));
  } catch (e) {
    console.error('Failed to fetch from Google Sheets:', e);
    return [];
  }
}

export async function createRequestInSheet(req: MaterialRequest): Promise<boolean> {
  try {
    await postToScript({
      action: 'create',
      sheet: 'MaterialRequests',
      data: JSON.stringify(req),
    });
    return true;
  } catch (e) {
    console.error('Failed to create in Sheet:', e);
    return false;
  }
}

export async function updateRequestInSheet(req: MaterialRequest): Promise<boolean> {
  try {
    await postToScript({
      action: 'update',
      sheet: 'MaterialRequests',
      id: req.request_id,
      data: JSON.stringify(req),
    });
    return true;
  } catch (e) {
    console.error('Failed to update in Sheet:', e);
    return false;
  }
}

// ============ STATUS HISTORY ============

export async function getHistoryFromSheet(requestId: string): Promise<StatusHistory[]> {
  try {
    const result = await fetchFromScript({ action: 'getHistory', sheet: 'StatusHistory', requestId }) as { data?: Record<string, string>[] };
    if (!result.data) return [];
    return result.data.map((row) => ({
      history_id: row.history_id || '',
      request_id: row.request_id || '',
      old_status: (row.old_status as StatusHistory['old_status']) || '',
      new_status: (row.new_status as Status) || 'Ordered',
      updated_by: row.updated_by || '',
      update_time: row.update_time || '',
      comments: row.comments || '',
    }));
  } catch (e) {
    console.error('Failed to fetch history:', e);
    return [];
  }
}

export async function addHistoryToSheet(entry: StatusHistory): Promise<boolean> {
  try {
    await postToScript({
      action: 'create',
      sheet: 'StatusHistory',
      data: JSON.stringify(entry),
    });
    return true;
  } catch (e) {
    console.error('Failed to add history:', e);
    return false;
  }
}
