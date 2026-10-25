let ctx: AudioContext | null = null;

/** Aviso sonoro curto (e vibração, onde existir; o iOS não vibra). */
export function beep(frequencia = 880, ms = 200): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = frequencia;
    ganho.gain.value = 0.15;
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
    navigator.vibrate?.(ms);
  } catch {
    // sem áudio disponível: segue sem som
  }
}
