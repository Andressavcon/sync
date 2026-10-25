import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  diaLembreteContas: number; 
  metaTreinosSemana: number; 
  setDiaLembreteContas: (dia: number) => void;
  setMetaTreinosSemana: (meta: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      diaLembreteContas: 5,
      metaTreinosSemana: 5,
      setDiaLembreteContas: (dia) => set({ diaLembreteContas: dia }),
      setMetaTreinosSemana: (meta) => set({ metaTreinosSemana: meta }),
    }),
    { name: "sync:settings" }
  )
);