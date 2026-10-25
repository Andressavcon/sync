import { useEffect, type ReactNode } from "react";
import { useSettings } from "@/hooks/useSettings";

/** Global setup when the app opens. */
export default function Providers({ children }: { children: ReactNode }) {
  // Preferences saved on the server (the browser copy is used until they arrive)
  useEffect(() => {
    void useSettings.getState().load();
  }, []);

  return <>{children}</>;
}
