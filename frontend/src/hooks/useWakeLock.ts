import { useEffect } from "react";

/** Mantém a tela acesa enquanto `ativo` for verdadeiro (Wake Lock API). */
export function useWakeLock(ativo: boolean): void {
  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;

    let trava: WakeLockSentinel | null = null;
    let cancelado = false;

    const pedir = async () => {
      try {
        const nova = await navigator.wakeLock.request("screen");
        if (cancelado) void nova.release();
        else trava = nova;
      } catch {
        // o navegador pode negar (ex.: economia de bateria): segue sem
      }
    };

    // a trava é perdida ao sair da aba; pede de novo ao voltar
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void pedir();
    };

    void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      void trava?.release();
    };
  }, [ativo]);
}
