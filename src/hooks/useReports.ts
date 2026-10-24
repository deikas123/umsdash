import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

export interface ReportResult {
  data: Record<string, unknown>[];
  summary: Record<string, string | number>;
  chartData: { name: string; value: number; [k: string]: any }[];
  chartData2: { name: string; value: number; [k: string]: any }[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

function diffHours(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 3_600_000;
}

function daysRemaining(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function monthLabel(dateStr: string): string {
  return format(new Date(dateStr), 'MMM yyyy');
}

function zeroSummary(keys: string[]): Record<string, string | number> {
  return Object.fromEntries(keys.map(k => [k, 0]));
}

// ── per-report query builders ─────────────────────────────────────────────────

async function queryDocumentSummary(filters: ReportFilters) {
  try {
    let q = supabase.from('documents').select('id, title, status, category_id, customer_id, created_at, uploaded_by');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.category && filters.category !== 'all') q = q.eq('category_id', filters.category);
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
    const { data: docs } = await q;

    const [{ data: cats }, { data: customers }, { data: profiles }] = await Promise.all([
      supabase.from('document_categories').select('id, name'),
      supabase.from('customers').select('id, full_name'),
      supabase.from('profiles').select('user_id, full_name'),
    ]);

    const catMap: Record<string, string> = Object.fromEntries((cats || []).map(c => [c.id, c.name]));
    const custMap: Record<string, string> = Object.fromEntries((customers || []).map(c => [c.id, c.full_name]));
    const profMap: Record<string, string> = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

    const rows = (docs || []).map(d => ({
      ...d,
      category_name: catMap[d.category_id] || '—',
      customer_name: custMap[d.customer_id] || '—',
      uploader_name: profMap[d.uploaded_by] || d.uploaded_by || '—',
    }));

    const byStatus: Record<string, number> = {};
    rows.forEach(r => { byStatus[r.status as string] = (byStatus[r.status as string] || 0) + 1; });

    const monthly: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const label = format(subMonths(new Date(), i), 'MMM yyyy');
      monthly[label] = 0;
    }
    rows.forEach(r => {
      const m = monthLabel(r.created_at as string);
      if (m in monthly) monthly[m]++;
    });

    return {
      rows,
      summary: {
        total: rows.length,
        pending: byStatus['pending'] || 0,
        approved: byStatus['approved'] || 0,
        archived: byStatus['archived'] || 0,
      },
      chartData: [
        { name: 'Pending', value: byStatus['pending'] || 0 },
        { name: 'Approved', value: byStatus['approved'] || 0 },
        { name: 'Archived', value: byStatus['archived'] || 0 },
      ],
      chartData2: Object.entries(monthly).map(([name, value]) => ({ name, value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['total', 'pending', 'approved', 'archived']), chartData: [], chartData2: [] };
  }
}

async function queryCustomerReport(filters: ReportFilters) {
  try {
    let q = supabase.from('customers').select('id, full_name, account_number, email, phone, created_at');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    const { data: customers } = await q;

    const { data: docs } = await supabase.from('documents').select('customer_id, created_at');

    const docCount: Record<string, number> = {};
    const lastUpload: Record<string, string> = {};
    (docs || []).forEach(d => {
      if (!d.customer_id) return;
      docCount[d.customer_id] = (docCount[d.customer_id] || 0) + 1;
      if (!lastUpload[d.customer_id] || d.created_at > lastUpload[d.customer_id]) {
        lastUpload[d.customer_id] = d.created_at;
      }
    });

    const rows = (customers || []).map(c => ({
      ...c,
      doc_count: docCount[c.id] || 0,
      last_upload_date: lastUpload[c.id] ? format(new Date(lastUpload[c.id]), 'dd MMM yyyy') : 'Never',
    }));

    const total = rows.length;
    const withDocs = rows.filter(r => (r.doc_count as number) > 0).length;
    const totalDocs = rows.reduce((s, r) => s + (r.doc_count as number), 0);
    const top10 = [...rows].sort((a, b) => (b.doc_count as number) - (a.doc_count as number)).slice(0, 10);

    return {
      rows,
      summary: {
        totalCustomers: total,
        customersWithDocs: withDocs,
        avgDocsPerCustomer: total > 0 ? (totalDocs / total).toFixed(1) : '0',
        totalDocs,
      },
      chartData: top10.map(r => ({ name: r.full_name as string, value: r.doc_count as number })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalCustomers', 'customersWithDocs', 'avgDocsPerCustomer', 'totalDocs']), chartData: [] };
  }
}

async function queryDocumentExpiry(filters: ReportFilters) {
  try {
    const today = new Date();
    let q = supabase.from('documents').select('id, title, expiry_date, customer_id').not('expiry_date', 'is', null);

    const win = filters.window || '90';
    if (win !== 'all') {
      const future = new Date(today);
      future.setDate(future.getDate() + parseInt(win));
      q = q.lte('expiry_date', future.toISOString().split('T')[0]);
    }
    if (filters.dateFrom) q = q.gte('expiry_date', filters.dateFrom);
    if (filters.dateTo) q = q.lte('expiry_date', filters.dateTo);

    const { data: docs } = await q;
    const { data: customers } = await supabase.from('customers').select('id, full_name');
    const custMap: Record<string, string> = Object.fromEntries((customers || []).map(c => [c.id, c.full_name]));

    const rows = (docs || []).map(d => ({
      ...d,
      customer_name: custMap[d.customer_id] || '—',
      days_remaining: daysRemaining(d.expiry_date as string),
    }));

    const now = Date.now();
    const exp30 = rows.filter(r => { const dr = r.days_remaining as number; return dr >= 0 && dr <= 30; }).length;
    const exp60 = rows.filter(r => { const dr = r.days_remaining as number; return dr > 30 && dr <= 60; }).length;
    const exp90 = rows.filter(r => { const dr = r.days_remaining as number; return dr > 60 && dr <= 90; }).length;
    const expired = rows.filter(r => (r.days_remaining as number) < 0).length;

    const monthly: Record<string, number> = {};
    rows.forEach(r => {
      const m = monthLabel(r.expiry_date as string);
      monthly[m] = (monthly[m] || 0) + 1;
    });

    return {
      rows,
      summary: { expiring30: exp30, expiring60: exp60, expiring90: exp90, alreadyExpired: expired },
      chartData: Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['expiring30', 'expiring60', 'expiring90', 'alreadyExpired']), chartData: [] };
  }
}

async function queryUploadActivity(filters: ReportFilters) {
  try {
    let q = supabase.from('documents').select('id, uploaded_by, created_at');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    const { data: docs } = await q;
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name');
    const profMap: Record<string, string> = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

    const matrix: Record<string, Record<string, number>> = {};
    (docs || []).forEach(d => {
      const uploader = profMap[d.uploaded_by] || d.uploaded_by || 'Unknown';
      const month = format(new Date(d.created_at), 'MMM yyyy');
      if (!matrix[uploader]) matrix[uploader] = {};
      matrix[uploader][month] = (matrix[uploader][month] || 0) + 1;
    });

    const monthly: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const label = format(subMonths(new Date(), i), 'MMM yyyy');
      monthly[label] = 0;
    }
    (docs || []).forEach(d => {
      const m = format(new Date(d.created_at), 'MMM yyyy');
      if (m in monthly) monthly[m]++;
    });

    const uploaderTotals: Record<string, number> = {};
    Object.entries(matrix).forEach(([u, months]) => {
      uploaderTotals[u] = Object.values(months).reduce((s, v) => s + v, 0);
    });
    const topUploader = Object.entries(uploaderTotals).sort((a, b) => b[1] - a[1])[0];

    const rows: Record<string, unknown>[] = [];
    Object.entries(matrix).forEach(([uploader, months]) => {
      Object.entries(months).forEach(([month, count]) => {
        rows.push({ uploader_name: uploader, month, upload_count: count });
      });
    });

    const thisMonth = format(new Date(), 'MMM yyyy');
    return {
      rows,
      summary: {
        totalUploads: docs?.length || 0,
        topUploader: topUploader ? `${topUploader[0]} (${topUploader[1]})` : '—',
        uploadsThisMonth: monthly[thisMonth] || 0,
        uniqueUploaders: Object.keys(matrix).length,
      },
      chartData: Object.entries(monthly).map(([name, value]) => ({ name, value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalUploads', 'topUploader', 'uploadsThisMonth', 'uniqueUploaders']), chartData: [] };
  }
}

async function queryCategoryDistribution(filters: ReportFilters) {
  try {
    const { data: cats } = await supabase.from('document_categories').select('id, name');
    let q = supabase.from('documents').select('id, category_id, created_at');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    const { data: docs } = await q;

    const catCount: Record<string, { name: string; count: number }> = {};
    (cats || []).forEach(c => { catCount[c.id] = { name: c.name, count: 0 }; });
    (docs || []).forEach(d => {
      if (d.category_id && catCount[d.category_id]) catCount[d.category_id].count++;
    });

    const total = docs?.length || 0;
    const rows = Object.values(catCount).map(c => ({
      category_name: c.name,
      doc_count: c.count,
      percentage: total > 0 ? ((c.count / total) * 100).toFixed(1) + '%' : '0%',
    })).sort((a, b) => (b.doc_count as number) - (a.doc_count as number));

    const largest = rows[0];
    const empty = rows.filter(r => (r.doc_count as number) === 0).length;

    return {
      rows,
      summary: {
        totalCategories: cats?.length || 0,
        totalDocs: total,
        largestCategory: largest ? `${largest.category_name} (${largest.doc_count})` : '—',
        emptyCategoryCount: empty,
      },
      chartData: rows.map(r => ({ name: r.category_name as string, value: r.doc_count as number })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalCategories', 'totalDocs', 'largestCategory', 'emptyCategoryCount']), chartData: [] };
  }
}

async function queryDeletionRequests(filters: ReportFilters) {
  try {
    let q = supabase.from('deletion_requests').select('id, document_id, requested_by, status, reason, reviewed_by, reviewed_at, created_at');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
    const { data: reqs } = await q;

    const docIds = [...new Set((reqs || []).map(r => r.document_id).filter(Boolean))];
    const profIds = [...new Set((reqs || []).flatMap(r => [r.requested_by, r.reviewed_by]).filter(Boolean))];

    const [{ data: docs }, { data: profs }] = await Promise.all([
      docIds.length > 0 ? supabase.from('documents').select('id, title').in('id', docIds) : Promise.resolve({ data: [] }),
      profIds.length > 0 ? supabase.from('profiles').select('user_id, full_name').in('user_id', profIds) : Promise.resolve({ data: [] }),
    ]);

    const docMap: Record<string, string> = Object.fromEntries((docs || []).map(d => [d.id, d.title]));
    const profMap: Record<string, string> = Object.fromEntries((profs || []).map(p => [p.user_id, p.full_name]));

    const rows = (reqs || []).map(r => ({
      ...r,
      document_title: docMap[r.document_id] || '—',
      requested_by_name: profMap[r.requested_by] || r.requested_by || '—',
      reviewed_by_name: r.reviewed_by ? (profMap[r.reviewed_by] || r.reviewed_by) : '—',
    }));

    const byStatus: Record<string, number> = {};
    rows.forEach(r => { byStatus[r.status as string] = (byStatus[r.status as string] || 0) + 1; });

    return {
      rows,
      summary: {
        total: rows.length,
        pending: byStatus['pending'] || 0,
        approved: byStatus['approved'] || 0,
        rejected: byStatus['rejected'] || 0,
      },
      chartData: Object.entries(byStatus).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['total', 'pending', 'approved', 'rejected']), chartData: [] };
  }
}

async function queryIncidentReport(filters: ReportFilters) {
  try {
    let q = supabase.from('incidents').select('incident_number, incident_type, severity, status, department, created_at, updated_at');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.severity && filters.severity !== 'all') q = q.eq('severity', filters.severity);
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
    if (filters.department && filters.department !== 'all') q = q.eq('department', filters.department);
    const { data: incidents } = await q;

    const rows = (incidents || []).map(i => ({
      ...i,
      resolution_time: i.status === 'resolved' && i.updated_at && i.created_at
        ? diffHours(i.updated_at, i.created_at).toFixed(1) + 'h'
        : '—',
    }));

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    rows.forEach(r => {
      byStatus[r.status as string] = (byStatus[r.status as string] || 0) + 1;
      bySeverity[r.severity as string] = (bySeverity[r.severity as string] || 0) + 1;
    });

    const monthly: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      monthly[format(subMonths(new Date(), i), 'MMM yyyy')] = 0;
    }
    rows.forEach(r => {
      const m = monthLabel(r.created_at as string);
      if (m in monthly) monthly[m]++;
    });

    return {
      rows,
      summary: {
        total: rows.length,
        open: byStatus['open'] || 0,
        resolved: byStatus['resolved'] || 0,
        critical: (bySeverity['critical'] || 0) + (bySeverity['high'] || 0),
      },
      chartData: Object.entries(monthly).map(([name, value]) => ({ name, value })),
      chartData2: Object.entries(bySeverity).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['total', 'open', 'resolved', 'critical']), chartData: [], chartData2: [] };
  }
}

async function queryVendorSLA(filters: ReportFilters) {
  try {
    let q = supabase.from('vendor_issues').select('vendor, status, downtime, uptime_percentage, rca_status, created_at, issue');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    const { data: issues } = await q;

    const vendors: Record<string, { count: number; downtime: number; uptimes: number[] }> = {};
    (issues || []).forEach(i => {
      if (!vendors[i.vendor]) vendors[i.vendor] = { count: 0, downtime: 0, uptimes: [] };
      vendors[i.vendor].count++;
      vendors[i.vendor].downtime += parseFloat(String(i.downtime || 0));
      vendors[i.vendor].uptimes.push(i.uptime_percentage != null ? Number(i.uptime_percentage) : 100);
    });

    const rows = Object.entries(vendors).map(([vendor, v]) => {
      const avg = v.uptimes.length > 0 ? v.uptimes.reduce((a, b) => a + b, 0) / v.uptimes.length : 100;
      const sla_status = avg >= 99.5 ? '✅' : avg >= 95 ? '⚠️' : '❌';
      return {
        vendor,
        total_issues: v.count,
        downtime_hours: v.downtime.toFixed(1) + 'h',
        avg_uptime_pct: avg.toFixed(1) + '%',
        sla_target: '99.5%',
        sla_status,
        _avg: avg,
      };
    });

    const meeting = rows.filter(r => r._avg >= 99.5).length;
    const allAvgs = rows.map(r => r._avg);
    const avgUptime = allAvgs.length > 0 ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(1) : '0';

    return {
      rows: rows.map(({ _avg, ...rest }) => rest),
      summary: {
        totalVendors: rows.length,
        meetingSLA: meeting,
        breachingSLA: rows.length - meeting,
        avgUptimePercent: avgUptime + '%',
      },
      chartData: rows.map(r => ({ name: r.vendor, value: parseFloat(r._avg.toFixed(1)) })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalVendors', 'meetingSLA', 'breachingSLA', 'avgUptimePercent']), chartData: [] };
  }
}

async function queryPasswordExpiry(filters: ReportFilters) {
  try {
    const today = new Date().toISOString().split('T')[0];
    let q = supabase.from('passwords').select('id, system_name, username, expiry_date, rotation_days, assigned_to');

    const win = filters.window || '30';
    if (win === 'expired') {
      q = q.lt('expiry_date', today);
    } else if (win === '30') {
      q = q.gte('expiry_date', today).lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    } else if (win === '60') {
      q = q.gte('expiry_date', today).lte('expiry_date', new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]);
    }
    if (filters.dateFrom) q = q.gte('expiry_date', filters.dateFrom);
    if (filters.dateTo) q = q.lte('expiry_date', filters.dateTo);

    const { data: passwords } = await q;
    const rows = (passwords || []).map(p => ({
      ...p,
      days_remaining: p.expiry_date ? daysRemaining(p.expiry_date as string) : null,
      assigned_to: p.assigned_to || '—',
    }));

    const expired = rows.filter(r => (r.days_remaining as number) < 0).length;
    const exp30 = rows.filter(r => { const d = r.days_remaining as number; return d >= 0 && d <= 30; }).length;
    const exp60 = rows.filter(r => { const d = r.days_remaining as number; return d > 30 && d <= 60; }).length;

    return {
      rows,
      summary: {
        totalPasswords: rows.length,
        expiredCount: expired,
        expiring30Days: exp30,
        expiring60Days: exp60,
      },
      chartData: [
        { name: 'Expired', value: expired },
        { name: '<30 days', value: exp30 },
        { name: '30–60 days', value: exp60 },
        { name: '60+ days', value: rows.length - expired - exp30 - exp60 },
      ],
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalPasswords', 'expiredCount', 'expiring30Days', 'expiring60Days']), chartData: [] };
  }
}

async function queryEscalationReport(filters: ReportFilters) {
  try {
    let q = supabase.from('escalations').select('id, title, status, current_level, created_at, resolved_at, source_table, assigned_to');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
    if (filters.level && filters.level !== 'all') q = q.eq('current_level', parseInt(filters.level));
    const { data: escalations } = await q;

    const resolved = (escalations || []).filter(e => e.resolved_at);
    const resHours = resolved.map(e => diffHours(e.resolved_at!, e.created_at));
    const avgRes = resHours.length > 0 ? (resHours.reduce((a, b) => a + b, 0) / resHours.length).toFixed(1) : '—';

    const byStatus: Record<string, number> = {};
    (escalations || []).forEach(e => { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });
    const openCount = (byStatus['open'] || 0) + (byStatus['in_progress'] || 0);

    const rows = (escalations || []).map(e => ({
      ...e,
      resolution_hours: e.resolved_at ? diffHours(e.resolved_at, e.created_at).toFixed(1) + 'h' : '—',
    }));

    return {
      rows,
      summary: {
        total: rows.length,
        open: openCount,
        resolved: byStatus['resolved'] || 0,
        avgResolutionHours: avgRes !== '—' ? avgRes + 'h' : '—',
      },
      chartData: Object.entries(byStatus).map(([name, value]) => ({ name: name.replace('_', ' '), value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['total', 'open', 'resolved', 'avgResolutionHours']), chartData: [] };
  }
}

async function querySmsActivity(filters: ReportFilters) {
  try {
    let q = supabase.from('sms_logs').select('id, recipient_phone, recipient_name, sms_type, status, sent_by, created_at, message');
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
    if (filters.sms_type && filters.sms_type !== 'all') q = q.eq('sms_type', filters.sms_type);
    const { data: sms } = await q;

    const total = sms?.length || 0;
    const delivered = (sms || []).filter(s => s.status === 'delivered').length;
    const failed = (sms || []).filter(s => s.status === 'failed').length;

    const byType: Record<string, number> = {};
    (sms || []).forEach(s => { byType[s.sms_type] = (byType[s.sms_type] || 0) + 1; });

    return {
      rows: (sms || []).map(s => ({
        ...s,
        recipient_name: s.recipient_name || '—',
        message_preview: s.message ? s.message.slice(0, 40) + (s.message.length > 40 ? '…' : '') : '—',
      })),
      summary: {
        total,
        delivered,
        failed,
        successRate: total > 0 ? ((delivered / total) * 100).toFixed(1) + '%' : '0%',
      },
      chartData: [
        { name: 'Delivered', value: delivered },
        { name: 'Failed', value: failed },
        { name: 'Pending', value: total - delivered - failed },
      ],
      chartData2: Object.entries(byType).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['total', 'delivered', 'failed', 'successRate']), chartData: [], chartData2: [] };
  }
}

async function queryUserActivity(filters: ReportFilters) {
  try {
    let q = (supabase as any).from('user_activity_summary').select('*');
    if (filters.role && filters.role !== 'all') q = q.eq('role', filters.role);
    if (filters.department && filters.department !== 'all') q = q.eq('department', filters.department);
    const { data: users } = await q;

    const thirtyAgo = subDays(new Date(), 30).toISOString();
    let rows = (users || []) as Record<string, any>[];
    if (filters.activity === 'active') {
      rows = rows.filter(r => r.last_active_at && r.last_active_at >= thirtyAgo);
    } else if (filters.activity === 'inactive') {
      rows = rows.filter(r => !r.last_active_at || r.last_active_at < thirtyAgo);
    }

    const total = rows.length;
    const activeLast30 = rows.filter(r => r.last_active_at && r.last_active_at >= thirtyAgo).length;
    const admins = rows.filter(r => r.role === 'admin').length;
    const top10 = [...rows].sort((a, b) => (b.docs_uploaded || 0) - (a.docs_uploaded || 0)).slice(0, 10);

    return {
      rows,
      summary: {
        total,
        activeLast30,
        inactive: total - activeLast30,
        adminCount: admins,
      },
      chartData: top10.map(r => ({ name: r.full_name || r.email || '—', value: r.docs_uploaded || 0 })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['total', 'activeLast30', 'inactive', 'adminCount']), chartData: [] };
  }
}

async function queryGamification() {
  try {
    const sevenAgo = subDays(new Date(), 7).toISOString();
    const thirtyAgo = subDays(new Date(), 30).toISOString();

    const [
      { data: xpData },
      { data: streaks },
      { data: achievements },
      { data: transactions },
      { data: profiles },
    ] = await Promise.all([
      supabase.from('user_xp').select('user_id, total_xp, level'),
      supabase.from('upload_streaks').select('user_id, current_streak, longest_streak'),
      supabase.from('user_achievements').select('user_id, achievement_key'),
      supabase.from('xp_transactions').select('user_id, amount, created_at').gte('created_at', sevenAgo),
      supabase.from('profiles').select('user_id, full_name, email'),
    ]);

    const streakMap: Record<string, { current: number; longest: number }> = {};
    (streaks || []).forEach(s => { streakMap[s.user_id] = { current: s.current_streak, longest: s.longest_streak }; });

    const achMap: Record<string, number> = {};
    (achievements || []).forEach(a => { achMap[a.user_id] = (achMap[a.user_id] || 0) + 1; });

    const weeklyXp: Record<string, number> = {};
    (transactions || []).forEach(t => { weeklyXp[t.user_id] = (weeklyXp[t.user_id] || 0) + (t.amount || 0); });

    const profMap: Record<string, { name: string; email: string }> = {};
    (profiles || []).forEach(p => { profMap[p.user_id] = { name: p.full_name, email: p.email }; });

    const rows = (xpData || []).map(x => ({
      user_id: x.user_id,
      full_name: profMap[x.user_id]?.name || '—',
      email: profMap[x.user_id]?.email || '—',
      level: x.level || 1,
      total_xp: x.total_xp || 0,
      weekly_xp: weeklyXp[x.user_id] || 0,
      current_streak: streakMap[x.user_id]?.current || 0,
      longest_streak: streakMap[x.user_id]?.longest || 0,
      achievements_count: achMap[x.user_id] || 0,
    }));

    const totalXp = rows.reduce((s, r) => s + r.total_xp, 0);
    const activeStreaks = rows.filter(r => r.current_streak > 0).length;
    const totalAch = (achievements || []).length;
    const avgLevel = rows.length > 0 ? (rows.reduce((s, r) => s + (r.level as number), 0) / rows.length).toFixed(1) : '0';

    const top10 = [...rows].sort((a, b) => (b.total_xp as number) - (a.total_xp as number)).slice(0, 10);

    // XP over time (last 30 days)
    const { data: allTx } = await supabase.from('xp_transactions').select('amount, created_at').gte('created_at', thirtyAgo);
    const dailyXp: Record<string, number> = {};
    (allTx || []).forEach(t => {
      const d = format(new Date(t.created_at), 'dd MMM');
      dailyXp[d] = (dailyXp[d] || 0) + (t.amount || 0);
    });

    return {
      rows,
      summary: {
        totalXpAwarded: totalXp,
        activeStreaks,
        achievementsUnlocked: totalAch,
        avgLevel,
      },
      chartData: top10.map(r => ({ name: r.full_name as string, value: r.total_xp as number })),
      chartData2: Object.entries(dailyXp).map(([name, value]) => ({ name, value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalXpAwarded', 'activeStreaks', 'achievementsUnlocked', 'avgLevel']), chartData: [], chartData2: [] };
  }
}

async function queryAuditTrail(filters: ReportFilters) {
  try {
    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000);
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.action) q = q.ilike('action', `%${filters.action}%`);
    if (filters.entity_type) q = q.eq('entity_type', filters.entity_type);
    const { data: logs } = await q;

    const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
      : { data: [] };
    const profMap: Record<string, string> = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

    let rows = (logs || []).map(l => ({
      ...l,
      user_name: profMap[l.user_id] || l.user_id || '—',
      details_preview: l.details ? JSON.stringify(l.details).slice(0, 60) + (JSON.stringify(l.details).length > 60 ? '…' : '') : '—',
      entity_id_short: l.entity_id ? l.entity_id.slice(0, 12) : '—',
    }));

    if (filters.user) {
      const search = filters.user.toLowerCase();
      rows = rows.filter(r => (r.user_name as string).toLowerCase().includes(search));
    }

    const today = startOfDay(new Date()).toISOString();
    const weekAgo = subDays(new Date(), 7).toISOString();
    const todayEvents = rows.filter(r => (r.created_at as string) >= today).length;
    const weekEvents = rows.filter(r => (r.created_at as string) >= weekAgo).length;
    const uniqueUsers = new Set(rows.map(r => r.user_id)).size;

    const thirtyAgo = subDays(new Date(), 30).toISOString();
    const { data: allLogs } = await supabase.from('audit_logs').select('created_at').gte('created_at', thirtyAgo);
    const dailyEvents: Record<string, number> = {};
    (allLogs || []).forEach(l => {
      const d = format(new Date(l.created_at), 'dd MMM');
      dailyEvents[d] = (dailyEvents[d] || 0) + 1;
    });

    return {
      rows,
      summary: {
        totalEvents: rows.length,
        todayEvents,
        thisWeekEvents: weekEvents,
        uniqueUsers,
      },
      chartData: Object.entries(dailyEvents).map(([name, value]) => ({ name, value })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalEvents', 'todayEvents', 'thisWeekEvents', 'uniqueUsers']), chartData: [] };
  }
}

async function queryStorageUsage() {
  try {
    const [{ data: docs }, { data: folderDocs }, { data: profiles }] = await Promise.all([
      supabase.from('documents').select('uploaded_by, file_size'),
      (supabase as any).from('folder_documents').select('uploaded_by, file_size'),
      supabase.from('profiles').select('user_id, full_name, email'),
    ]);

    const profMap: Record<string, { name: string; email: string }> = {};
    (profiles || []).forEach(p => { profMap[p.user_id] = { name: p.full_name, email: p.email }; });

    const docUsage: Record<string, { bytes: number; count: number }> = {};
    (docs || []).forEach((d: any) => {
      if (!d.uploaded_by) return;
      if (!docUsage[d.uploaded_by]) docUsage[d.uploaded_by] = { bytes: 0, count: 0 };
      docUsage[d.uploaded_by].bytes += d.file_size || 0;
      docUsage[d.uploaded_by].count++;
    });

    const folderUsage: Record<string, { bytes: number; count: number }> = {};
    (folderDocs || []).forEach((d: any) => {
      if (!d.uploaded_by) return;
      if (!folderUsage[d.uploaded_by]) folderUsage[d.uploaded_by] = { bytes: 0, count: 0 };
      folderUsage[d.uploaded_by].bytes += d.file_size || 0;
      folderUsage[d.uploaded_by].count++;
    });

    const rows: Record<string, unknown>[] = [];
    const allUserIds = new Set([...Object.keys(docUsage), ...Object.keys(folderUsage)]);
    allUserIds.forEach(uid => {
      const prof = profMap[uid] || { name: uid, email: '—' };
      if (docUsage[uid]) {
        rows.push({
          user_id: uid,
          full_name: prof.name,
          email: prof.email,
          bucket: 'Documents',
          file_count: docUsage[uid].count,
          total_mb: toMB(docUsage[uid].bytes),
          _bytes: docUsage[uid].bytes,
        });
      }
      if (folderUsage[uid]) {
        rows.push({
          user_id: uid,
          full_name: prof.name,
          email: prof.email,
          bucket: 'Folders',
          file_count: folderUsage[uid].count,
          total_mb: toMB(folderUsage[uid].bytes),
          _bytes: folderUsage[uid].bytes,
        });
      }
    });

    const totalBytes = rows.reduce((s, r) => s + (r._bytes as number), 0);
    const totalMB = parseFloat(toMB(totalBytes));
    const uniqueUsers = allUserIds.size;
    const avgMB = uniqueUsers > 0 ? (totalMB / uniqueUsers).toFixed(2) : '0';

    const userTotals: Record<string, { name: string; bytes: number }> = {};
    rows.forEach(r => {
      const uid = r.user_id as string;
      if (!userTotals[uid]) userTotals[uid] = { name: r.full_name as string, bytes: 0 };
      userTotals[uid].bytes += r._bytes as number;
    });
    const top = Object.values(userTotals).sort((a, b) => b.bytes - a.bytes)[0];

    return {
      rows: rows.map(({ _bytes, ...rest }) => rest),
      summary: {
        totalStorageMB: totalMB.toFixed(2) + ' MB',
        topConsumer: top ? `${top.name} (${toMB(top.bytes)} MB)` : '—',
        avgPerUserMB: avgMB + ' MB',
        totalFiles: rows.reduce((s, r) => s + (r.file_count as number), 0),
      },
      chartData: Object.entries(userTotals)
        .sort((a, b) => b[1].bytes - a[1].bytes)
        .slice(0, 10)
        .map(([, v]) => ({ name: v.name, value: parseFloat(toMB(v.bytes)) })),
    };
  } catch {
    return { rows: [], summary: zeroSummary(['totalStorageMB', 'topConsumer', 'avgPerUserMB', 'totalFiles']), chartData: [] };
  }
}

async function queryCustom(filters: ReportFilters) {
  try {
    const { table, columns: cols, customFilters = [], dateFrom, dateTo, chartType, chartColumn } = filters;
    if (!table || !cols || cols.length === 0) {
      return { rows: [], summary: {}, chartData: [] };
    }

    let q = (supabase as any).from(table).select((cols as string[]).join(','));

    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

    (customFilters as { column: string; operator: string; value: string }[]).forEach(f => {
      if (!f.column || !f.value) return;
      if (f.operator === 'equals') q = q.eq(f.column, f.value);
      else if (f.operator === 'contains') q = q.ilike(f.column, `%${f.value}%`);
      else if (f.operator === 'greater_than') q = q.gt(f.column, f.value);
      else if (f.operator === 'less_than') q = q.lt(f.column, f.value);
    });

    const { data } = await q;
    const rows = (data || []) as Record<string, unknown>[];

    let chartData: { name: string; value: number }[] = [];
    if (chartType && chartType !== 'none' && chartColumn) {
      const countMap: Record<string, number> = {};
      rows.forEach(r => {
        const key = String(r[chartColumn] ?? 'Unknown');
        countMap[key] = (countMap[key] || 0) + 1;
      });
      chartData = Object.entries(countMap).map(([name, value]) => ({ name, value }));
    }

    return {
      rows,
      summary: { totalRows: rows.length },
      chartData,
    };
  } catch {
    return { rows: [], summary: { totalRows: 0 }, chartData: [] };
  }
}

// ── main hook ─────────────────────────────────────────────────────────────────

export function useReports(reportType: string, filters: ReportFilters): ReportResult {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: ['reports', reportType, filters],
    queryFn: async () => {
      switch (reportType) {
        case 'document-summary': return queryDocumentSummary(filters);
        case 'customer-report': return queryCustomerReport(filters);
        case 'document-expiry': return queryDocumentExpiry(filters);
        case 'upload-activity': return queryUploadActivity(filters);
        case 'category-distribution': return queryCategoryDistribution(filters);
        case 'deletion-requests': return queryDeletionRequests(filters);
        case 'incident-report': return queryIncidentReport(filters);
        case 'vendor-sla': return queryVendorSLA(filters);
        case 'password-expiry': return queryPasswordExpiry(filters);
        case 'escalation-report': return queryEscalationReport(filters);
        case 'sms-activity': return querySmsActivity(filters);
        case 'user-activity': return queryUserActivity(filters);
        case 'gamification': return queryGamification();
        case 'audit-trail': return queryAuditTrail(filters);
        case 'storage-usage': return queryStorageUsage();
        case 'custom': return queryCustom(filters);
        default: return { rows: [], summary: {}, chartData: [] };
      }
    },
    enabled: !!reportType,
    staleTime: 60_000,
  });

  return {
    data: (data as any)?.rows ?? [],
    summary: (data as any)?.summary ?? {},
    chartData: (data as any)?.chartData ?? [],
    chartData2: (data as any)?.chartData2 ?? [],
    isLoading: isPending || isFetching,
    error: error as Error | null,
    refetch,
  };
}
