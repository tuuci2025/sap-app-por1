import { supabase } from "@/integrations/supabase/client";
import { ShipDateChangeLog } from "@/types/por1";

export async function getChangeLog(): Promise<ShipDateChangeLog[]> {
  const { data, error } = await supabase
    .from("shipdate_changelog")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to fetch changelog:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    timestamp: row.created_at,
    updatedBy: row.updated_by,
    newDate: row.new_date,
    rowCount: row.row_count,
    rows: row.affected_rows || [],
  }));
}

export async function addChangeLogEntry(entry: ShipDateChangeLog): Promise<void> {
  const { error } = await supabase.from("shipdate_changelog").insert({
    updated_by: entry.updatedBy,
    new_date: entry.newDate,
    row_count: entry.rowCount,
    affected_rows: entry.rows,
  });

  if (error) {
    console.error("Failed to save changelog entry:", error);
  }
}