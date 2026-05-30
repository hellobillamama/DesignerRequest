/**
 * Data Layer — Google Sheets as primary database
 * 
 * For 7 users working together:
 * - Google Sheets = single source of truth
 * - localStorage = fast cache (for instant UI)
 * - Auto-refresh every 10 seconds pulls latest from Sheet
 * - Every write goes to Sheet first, then updates cache
 */

import { MaterialRequest, StatusHistory, Vendor, Status, ProcessType, PROCESS_SLA } from './types';
import {
  isGoogleSheetsConfigured,
  getAllRequestsFromSheet,
  createRequestInSheet,
  updateRequestInSheet,
  addHistoryToSheet,
  getHistoryFromSheet,
} from './sheets';

const STORAGE_KEYS = {
  REQUESTS: 'material_tracker_requests',
  HISTORY: 'material_tracker_history',
  LAST_SYNC: 'material_tracker_last_sync',
};

// ============ LOCAL CACHE HELPERS ============

function getFromCache<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToCache<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ============ SYNC ENGINE ============

/**
 * Fetch all data from Google Sheets and update local cache.
 * Returns true if successful.
 */
export async function syncFromGoogleSheets(): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) return false;

  try {
    const requests = await getAllRequestsFromSheet();
    if (requests && requests.length >= 0) {
      saveToCache(STORAGE_KEYS.REQUESTS, requests);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      }
    }
    return true;
  } catch (e) {
    console.error('Sync failed:', e);
    return false;
  }
}

/**
 * Start auto-refresh interval (every 10 seconds).
 * Returns a cleanup function.
 */
export function startAutoSync(onUpdate: () => void): () => void {
  if (!isGoogleSheetsConfigured()) return () => {};

  const interval = setInterval(async () => {
    const success = await syncFromGoogleSheets();
    if (success) {
      onUpdate();
    }
  }, 10000); // Every 10 seconds

  return () => clearInterval(interval);
}

// ============ SEED DATA (only if no Google Sheets) ============

export function seedDemoData(): void {
  if (typeof window === 'undefined') return;
  if (isGoogleSheetsConfigured()) return; // Don't seed if Sheets is connected

  const existing = localStorage.getItem(STORAGE_KEYS.REQUESTS);
  if (existing) return;

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();
  const pastDate = new Date(Date.now() - 432000000).toISOString().split('T')[0];

  const demoRequests: MaterialRequest[] = [
    {
      request_id: 'MR-001',
      request_date: threeDaysAgo.split('T')[0],
      material_name: 'Gold Wire 22K',
      process_type: 'Plating',
      quantity: 50,
      unit: 'grams',
      image_url: '',
      requested_by: 'Rahul Sharma',
      department: 'Design',
      approved_by: 'Amit Patel',
      current_holder: 'Ramesh Karigar',
      sent_to: 'Ramesh Karigar',
      expected_return_date: pastDate,
      priority: 'High',
      status: 'In Process',
      remarks: 'Needed for wedding collection',
      created_at: threeDaysAgo,
      updated_at: yesterday,
    },
    {
      request_id: 'MR-002',
      request_date: twoDaysAgo.split('T')[0],
      material_name: 'Kundan Stones',
      process_type: 'Jaipur Ordered',
      quantity: 200,
      unit: 'pcs',
      image_url: '',
      requested_by: 'Priya Singh',
      department: 'Store',
      approved_by: '',
      current_holder: 'Store',
      sent_to: '',
      expected_return_date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
      priority: 'Medium',
      status: 'Ordered',
      remarks: 'For necklace set',
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo,
    },
    {
      request_id: 'MR-003',
      request_date: yesterday.split('T')[0],
      material_name: 'Silver Sheet',
      process_type: 'Dyeing',
      quantity: 100,
      unit: 'grams',
      image_url: '',
      requested_by: 'Deepak Kumar',
      department: 'Production',
      approved_by: 'Amit Patel',
      current_holder: 'Plating Unit',
      sent_to: 'Plating Unit',
      expected_return_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      priority: 'High',
      status: 'In Process',
      remarks: 'Rhodium plating needed',
      created_at: yesterday,
      updated_at: now,
    },
    {
      request_id: 'MR-004',
      request_date: threeDaysAgo.split('T')[0],
      material_name: 'Diamond Solitaire 0.5ct',
      process_type: 'Purchase',
      quantity: 5,
      unit: 'pcs',
      image_url: '',
      requested_by: 'Rahul Sharma',
      department: 'Design',
      approved_by: 'Amit Patel',
      current_holder: '',
      sent_to: '',
      expected_return_date: pastDate,
      priority: 'Urgent',
      status: 'Ordered',
      remarks: 'Urgent purchase needed',
      created_at: threeDaysAgo,
      updated_at: yesterday,
    },
    {
      request_id: 'MR-005',
      request_date: now.split('T')[0],
      material_name: 'Pearl Strand AAA',
      process_type: 'Wrapping',
      quantity: 10,
      unit: 'pcs',
      image_url: '',
      requested_by: 'Priya Singh',
      department: 'QC',
      approved_by: '',
      current_holder: 'QC Department',
      sent_to: 'QC Department',
      expected_return_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
      priority: 'Medium',
      status: 'In Process',
      remarks: 'Quality check before dispatch',
      created_at: now,
      updated_at: now,
    },
  ];

  const demoHistory: StatusHistory[] = [
    {
      history_id: 'H-001',
      request_id: 'MR-001',
      old_status: '',
      new_status: 'Ordered',
      updated_by: 'Rahul Sharma',
      update_time: threeDaysAgo,
      comments: 'New request created',
    },
    {
      history_id: 'H-002',
      request_id: 'MR-001',
      old_status: 'Ordered',
      new_status: 'In Process',
      updated_by: 'Amit Patel',
      update_time: twoDaysAgo,
      comments: 'Sent for plating',
    },
  ];

  saveToCache(STORAGE_KEYS.REQUESTS, demoRequests);
  saveToCache(STORAGE_KEYS.HISTORY, demoHistory);
}

// ============ READ DATA (from cache) ============

export function getAllRequestsLocal(): MaterialRequest[] {
  return getFromCache<MaterialRequest>(STORAGE_KEYS.REQUESTS);
}

export function getRequestByIdLocal(id: string): MaterialRequest | null {
  const requests = getAllRequestsLocal();
  return requests.find((r) => r.request_id === id) || null;
}

// ============ WRITE DATA (to Sheet + cache) ============

export async function createRequestLocal(req: MaterialRequest): Promise<void> {
  // Update local cache immediately (instant UI)
  const requests = getAllRequestsLocal();
  requests.push(req);
  saveToCache(STORAGE_KEYS.REQUESTS, requests);

  // Write to Google Sheets
  if (isGoogleSheetsConfigured()) {
    await createRequestInSheet(req);
  }
}

export async function updateRequestLocal(req: MaterialRequest): Promise<void> {
  // Update local cache immediately
  const requests = getAllRequestsLocal();
  const index = requests.findIndex((r) => r.request_id === req.request_id);
  if (index !== -1) {
    requests[index] = req;
    saveToCache(STORAGE_KEYS.REQUESTS, requests);
  }

  // Write to Google Sheets
  if (isGoogleSheetsConfigured()) {
    await updateRequestInSheet(req);
  }
}

// ============ STATUS HISTORY ============

export function getHistoryByRequestIdLocal(requestId: string): StatusHistory[] {
  const history = getFromCache<StatusHistory>(STORAGE_KEYS.HISTORY);
  return history.filter((h) => h.request_id === requestId);
}

export async function addStatusHistoryLocal(entry: StatusHistory): Promise<void> {
  // Update local cache
  const history = getFromCache<StatusHistory>(STORAGE_KEYS.HISTORY);
  history.push(entry);
  saveToCache(STORAGE_KEYS.HISTORY, history);

  // Write to Google Sheets
  if (isGoogleSheetsConfigured()) {
    await addHistoryToSheet(entry);
  }
}

// ============ DASHBOARD ============

export function getDashboardStatsLocal() {
  const requests = getAllRequestsLocal();
  const now = new Date();

  const pending = requests.filter((r) => r.status !== 'Closed');

  const delayed = requests.filter(
    (r) =>
      r.expected_return_date &&
      new Date(r.expected_return_date) < now &&
      !['Received', 'Closed'].includes(r.status)
  );

  const ordered = requests.filter((r) => r.status === 'Ordered');
  const inProcess = requests.filter((r) => r.status === 'In Process');

  const priorityOrder: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  const recentPending = [...pending]
    .sort((a, b) => {
      const aPrio = priorityOrder[a.priority] ?? 2;
      const bPrio = priorityOrder[b.priority] ?? 2;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, 10);

  return {
    totalPending: pending.length,
    delayed: delayed.length,
    ordered: ordered.length,
    inProcess: inProcess.length,
    recentUpdates: recentPending,
  };
}

// ============ SEARCH ============

export function searchRequestsLocal(query: string): MaterialRequest[] {
  const requests = getAllRequestsLocal();
  const q = query.toLowerCase();
  return requests.filter(
    (r) =>
      r.material_name.toLowerCase().includes(q) ||
      r.request_id.toLowerCase().includes(q) ||
      r.requested_by.toLowerCase().includes(q) ||
      r.current_holder.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.remarks.toLowerCase().includes(q) ||
      r.process_type.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
  );
}

// ============ CLOSED ITEMS ============

export function getClosedRequestsLocal(): MaterialRequest[] {
  const requests = getAllRequestsLocal();
  return requests
    .filter((r) => r.status === 'Closed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}
