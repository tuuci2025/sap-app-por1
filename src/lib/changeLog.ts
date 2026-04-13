import { ShipDateChangeLog } from "@/types/por1";

const STORAGE_KEY = "por1_shipdate_changelog";

export function getChangeLog(): ShipDateChangeLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addChangeLogEntry(entry: ShipDateChangeLog): void {
  const log = getChangeLog();
  log.unshift({ ...entry, id: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export function clearChangeLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}