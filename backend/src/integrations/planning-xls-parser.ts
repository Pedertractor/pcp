import XLSX from 'xlsx';

import { excelSerialToDate } from '../lib/excel-serial-date.js';
import type { PlanningRow } from '../types/planning.types.js';

function cellString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function cellNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cellAreaM2(value: unknown): number | null {
  const raw = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  if (raw === '' || raw === null || raw === undefined) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 10_000) / 10_000
    : null;
}

function parseTargetDate(row: Record<string, unknown>, fallback: Date): Date {
  const serial = row.DTINI_PROC ?? row.DTFIM_PROC;
  if (typeof serial === 'number' && serial > 0) {
    return excelSerialToDate(serial);
  }
  return fallback;
}

function mapRow(
  row: Record<string, unknown>,
  referenceDate: Date,
): PlanningRow | null {
  const ofNumber = cellString(row.OFAB);
  if (!ofNumber) {
    return null;
  }

  const lineCode = cellString(row.LINHA);
  const machineRaw = row.MAQUINA;
  const machineCode = cellString(machineRaw);
  if (!lineCode || !machineCode) {
    return null;
  }

  return {
    ofNumber,
    partCode: cellString(row.PRODUTO) || '—',
    costCenter: cellString(row.CCUSTO),
    lineCode,
    machineCode,
    quantity: Math.max(0, Math.round(cellNumber(row.QTE))),
    colorName: cellString(row.COR) || null,
    area: cellAreaM2(row.AREA),
    operation: cellString(row.OPERACAO) || null,
    statusDate: cellString(row.STATUS_DATA) || null,
    targetDate: parseTargetDate(row, referenceDate),
  };
}

export function parsePlanningXlsBuffer(
  buffer: Buffer,
  referenceDate: Date,
): PlanningRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  const rows: PlanningRow[] = [];
  for (const raw of rawRows) {
    const mapped = mapRow(raw, referenceDate);
    if (mapped) {
      rows.push(mapped);
    }
  }
  return rows;
}
