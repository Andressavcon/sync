import { useCallback, useEffect, useState } from "react";
import { getErrorMessage, isOfflineError } from "@/data/api";
import {
  shoppingRepository,
  type ShoppingItem,
  type ShoppingList,
} from "@/data/repositories/shoppingRepository";
import { readJson, writeJson } from "@/lib/storage";
import { applyCheck } from "../utils/listOps";

/** Last list received from the server: opens the list without internet */
const CACHE_KEY = "sync:shopping:list";
/** Checks made offline, sent when the connection comes back */
const QUEUE_KEY = "sync:shopping:pending-checks";

interface PendingCheck {
  itemId: string;
  purchased: boolean;
}

interface SyncResult {
  list: ShoppingList | null;
  offline: boolean;
  error: string | null;
  pending: number;
}

const readQueue = () => readJson<PendingCheck[]>(QUEUE_KEY) ?? [];

/** Sends the queued checks, then fetches the list. No React state here: the caller applies it. */
async function syncWithServer(): Promise<SyncResult> {
  const queue = readQueue();
  try {
    while (queue.length > 0) {
      try {
        await shoppingRepository.updateItem(queue[0].itemId, { purchased: queue[0].purchased });
      } catch (e) {
        if (isOfflineError(e)) throw e;
        // Any other error (e.g. item deleted meanwhile): drop this check and go on
      }
      queue.shift();
      writeJson(QUEUE_KEY, queue);
    }
    return { list: await shoppingRepository.getList(), offline: false, error: null, pending: 0 };
  } catch (e) {
    const offline = isOfflineError(e);
    return { list: null, offline, error: offline ? null : getErrorMessage(e), pending: queue.length };
  }
}

/** The shopping list with offline support: cached copy + queue of checks. */
export function useShoppingList() {
  const [list, setList] = useState<ShoppingList | null>(() => readJson(CACHE_KEY));
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(() => readQueue().length);

  const apply = useCallback((result: SyncResult) => {
    if (result.list) setList(result.list);
    setOffline(result.offline);
    setError(result.error);
    setPending(result.pending);
  }, []);

  const reload = useCallback(async () => apply(await syncWithServer()), [apply]);

  // Keep the offline copy up to date
  useEffect(() => {
    if (list) writeJson(CACHE_KEY, list);
  }, [list]);

  // First load, and again whenever the internet comes back
  useEffect(() => {
    let active = true;
    const sync = () => syncWithServer().then((result) => active && apply(result));
    const goOffline = () => setOffline(true);

    void sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", goOffline);
    return () => {
      active = false;
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", goOffline);
    };
  }, [apply]);

  /** Checking works offline: the screen changes now, the server gets it when possible. */
  const check = useCallback(
    async (item: ShoppingItem, purchased: boolean) => {
      setList((current) => current && applyCheck(current, item.id, purchased));
      try {
        await shoppingRepository.updateItem(item.id, { purchased });
      } catch (e) {
        if (!isOfflineError(e)) {
          setError(getErrorMessage(e));
          return;
        }
        // Offline: keep only the latest check of each item
        const queue = readQueue().filter((p) => p.itemId !== item.id);
        queue.push({ itemId: item.id, purchased });
        writeJson(QUEUE_KEY, queue);
        setPending(queue.length);
        setOffline(true);
        return;
      }
      await reload();
    },
    [reload]
  );

  /** Any other change (add, edit, delete...) needs the server. */
  const change = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      try {
        await action();
        await reload();
        return true;
      } catch (e) {
        if (isOfflineError(e)) {
          setOffline(true);
          setError("Sem conexão: offline só dá para marcar e desmarcar itens.");
        } else {
          setError(getErrorMessage(e));
        }
        return false;
      }
    },
    [reload]
  );

  return { list, offline, pending, error, check, change, reload };
}
