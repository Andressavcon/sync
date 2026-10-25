import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/data/api";
import { kanbanRepository, type Board } from "@/data/repositories/kanbanRepository";

const REFRESH_MS = 60_000; // keeps the "late" icon right as time goes by

/** The week board from the API, filtered by tags. */
export function useBoard(tagIds: string[]) {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A string key, so a new array with the same ids doesn't trigger a new request
  const tagKey = tagIds.join(",");

  const fetchBoard = useCallback(
    () => kanbanRepository.getBoard(tagKey ? tagKey.split(",") : []),
    [tagKey]
  );

  /** Fetches again (after a change made on the page). */
  const reload = useCallback(async () => {
    try {
      setBoard(await fetchBoard());
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [fetchBoard]);

  useEffect(() => {
    let active = true; // don't update after the page is gone or the filter changed
    const load = () =>
      fetchBoard()
        .then((data) => {
          if (!active) return;
          setBoard(data);
          setError(null);
        })
        .catch((e: unknown) => active && setError(getErrorMessage(e)));

    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [fetchBoard]);

  return { board, error, reload };
}
