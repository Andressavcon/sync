import { useState } from "react";
import Button from "@/components/ui/Button";
import { signInWithGoogle } from "@/data/auth";

/** Login screen: Google only, no own password. */
export default function LoginPage() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setOpening(true);
    setError(null);
    try {
      await signInWithGoogle(); // goes to Google and comes back logged in
    } catch {
      setError("Não foi possível abrir o login. Tente de novo.");
      setOpening(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="glass flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl p-8 text-center">
        <span className="text-4xl font-bold">
          Sync<span className="text-primary">.</span>
        </span>
        <p className="text-sm text-muted">Tarefas, treinos, lista de compras e finanças num lugar só.</p>
        <Button className="w-full" onClick={() => void login()} disabled={opening}>
          {opening ? "Abrindo o Google…" : "Entrar com Google"}
        </Button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
