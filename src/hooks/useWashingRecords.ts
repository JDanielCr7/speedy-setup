import { useCallback, useEffect, useState } from "react";
import { washingRecordService } from "@/services/washingRecordService";
import type { WashingRecord } from "@/types/washingRecord";

export function useWashingRecords() {
  const [records, setRecords] = useState<WashingRecord[]>([]);

  const refresh = useCallback(() => {
    setRecords(washingRecordService.getAll());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    (record: Omit<WashingRecord, "id" | "createdAt">) => {
      const created = washingRecordService.create(record);
      refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    (id: string, patch: Partial<WashingRecord>) => {
      const updated = washingRecordService.update(id, patch);
      refresh();
      return updated;
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string) => {
      washingRecordService.remove(id);
      refresh();
    },
    [refresh],
  );

  const restoreDemo = useCallback(() => {
    washingRecordService.restoreDemoData();
    refresh();
  }, [refresh]);

  const clearAll = useCallback(() => {
    washingRecordService.clear();
    refresh();
  }, [refresh]);

  return { records, refresh, create, update, remove, restoreDemo, clearAll };
}
