import type { Request, Response } from 'express';
import { forbidden } from './errors';

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n');
}

/** Sends JSON, or CSV (Excel-compatible, UTF-8 BOM) when ?format=csv.
   Export is permission-checked on the server (SRS 68). */
export function sendRows(req: Request, res: Response, rows: Record<string, unknown>[], fileName: string, extra: Record<string, unknown> = {}) {
  if (req.query.format === 'csv') {
    if (!req.user?.permissions.has('REPORT_EXPORT')) throw forbidden('You are not authorised to export data.');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
    res.send('﻿' + toCsv(rows));
    return;
  }
  res.json({ rows, ...extra });
}
