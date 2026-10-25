import { useCallback, useEffect, useState } from "react";
import { getErrorMessage, isOfflineError } from "@/data/api";
import {
  workoutsRepository,
  type Block,
  type BlockProgress,
  type Day,
} from "@/data/repositories/workoutsRepository";
import { readJson, writeJson } from "@/lib/storage";

/** Today's workout, to keep the timer working without internet */
const CACHE_KEY = "sync:workouts:today";
/** Timer progress that didn't reach the server yet: { blockId: progress } */
const QUEUE_KEY = "sync:workouts:pending-progress";

type Queue = Record<string, BlockProgress>;

interface SyncResult {
  day: Day | null;
  offline: boolean;
  error: string | null;
}

const readQueue = () => readJson<Queue>(QUEUE_KEY) ?? {};

async function syncWithServer(date: string): Promise<SyncResult> {
  const queue = readQueue();
  try {
    for (const [blockId, progress] of Object.entries(queue)) {
      try {
        await workoutsRepository.updateBlock(blockId, progress);
      } catch (e) {
        if (isOfflineError(e)) throw e;
        // block removed or day closed meanwhile: drop it
      }
      delete queue[blockId];
      writeJson(QUEUE_KEY, queue);
    }
    return { day: await workoutsRepository.getDay(date), offline: false, error: null };
  } catch (e) {
    const offline = isOfflineError(e);
    return { day: null, offline, error: offline ? null : getErrorMessage(e) };
  }
}

/** Same rules as the backend (update_block), applied locally right away. */
function applyProgress(block: Block, progress: BlockProgress): Block {
  const next = { ...block };
  if (progress.stepIndex !== undefined) next.stepIndex = progress.stepIndex;
  if (progress.remainingMs !== undefined) next.remainingMs = progress.remainingMs;
  if (progress.state === "not_started") {
    next.stepIndex = 0;
    next.remainingMs = null;
  } else if (progress.state === "done") {
    next.remainingMs = null;
  }
  if (progress.state) next.state = progress.state;
  else if (next.state === "not_started") next.state = "in_progress";
  return next;
}

function withBlock(day: Day, block: Block): Day {
  const blocks = day.blocks.map((b) => (b.id === block.id ? block : b));
  return {
    ...day,
    blocks,
    completed: blocks.length > 0 && blocks.every((b) => b.state === "done"),
  };
}

/** A day's workout (today) with offline progress. */
export function useDay(date: string) {
  const [day, setDay] = useState<Day | null>(() => {
    const cached = readJson<Day>(CACHE_KEY);
    return cached?.day === date ? cached : null;
  });
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: SyncResult) => {
    if (result.day) setDay(result.day);
    setOffline(result.offline);
    setError(result.error);
  }, []);

  const reload = useCallback(async () => apply(await syncWithServer(date)), [apply, date]);

  useEffect(() => {
    if (day) writeJson(CACHE_KEY, day);
  }, [day]);

  useEffect(() => {
    let active = true;
    const sync = () => syncWithServer(date).then((result) => active && apply(result));
    void sync();
    window.addEventListener("online", sync);
    return () => {
      active = false;
      window.removeEventListener("online", sync);
    };
  }, [apply, date]);

  /** Timer progress and manual checks: work offline, sent when possible. */
  const updateBlock = useCallback(async (block: Block, progress: BlockProgress) => {
    setDay((current) => {
      if (!current) return current;
      // Start from the newest version of the block in state (two quick saves in a row)
      const latest = current.blocks.find((b) => b.id === block.id) ?? block;
      return withBlock(current, applyProgress(latest, progress));
    });
    try {
      await workoutsRepository.updateBlock(block.id, progress);
    } catch (e) {
      if (!isOfflineError(e)) {
        setError(getErrorMessage(e));
        return;
      }
      const queue = readQueue();
      queue[block.id] = { ...queue[block.id], ...progress }; // latest values win
      writeJson(QUEUE_KEY, queue);
      setOffline(true);
    }
  }, []);

  /** Adding or removing blocks needs the server. */
  const change = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      try {
        await action();
        await reload();
        return true;
      } catch (e) {
        setOffline(isOfflineError(e));
        setError(
          isOfflineError(e)
            ? "Sem conexão: offline só dá para usar o cronômetro e marcar os blocos."
            : getErrorMessage(e)
        );
        return false;
      }
    },
    [reload]
  );

  return { day, offline, error, updateBlock, change, reload };
}
