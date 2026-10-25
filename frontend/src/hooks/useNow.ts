import { useEffect, useState } from "react";

/** Data/hora atual, atualizada a cada minuto (para o "atrasado" se manter correto). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
