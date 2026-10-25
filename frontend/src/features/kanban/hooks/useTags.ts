import { useCallback, useEffect, useState } from "react";
import { kanbanRepository, type Tag } from "@/data/repositories/kanbanRepository";

/** The user's tags from the API (connection errors show up on the board request). */
export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);

  const reload = useCallback(async () => {
    try {
      setTags(await kanbanRepository.listTags());
    } catch {
      // the board shows the connection error
    }
  }, []);

  useEffect(() => {
    let active = true; // don't update after the page is gone
    kanbanRepository
      .listTags()
      .then((list) => active && setTags(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return { tags, reload };
}
