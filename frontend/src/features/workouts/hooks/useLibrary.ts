import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/data/api";
import { workoutsRepository, type Library } from "@/data/repositories/workoutsRepository";

/** Programs and standalone workouts from the API. */
export function useLibrary() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLibrary(await workoutsRepository.getLibrary());
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    let active = true;
    workoutsRepository
      .getLibrary()
      .then((data) => active && setLibrary(data))
      .catch((e: unknown) => active && setError(getErrorMessage(e)));
    return () => {
      active = false;
    };
  }, []);

  return { library, error, reload };
}
