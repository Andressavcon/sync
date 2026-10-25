import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/data/api";

/**
 * Loads data from the API and loads again when `key` changes or `reload()` is called.
 * `key` says what is being loaded (e.g. "invoice:<card>:2026-11").
 */
export function useApiData<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // Always call the newest `load` without restarting the effect on every render
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;
    loadRef
      .current()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => active && setError(getErrorMessage(e)));
    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, error, reload };
}
