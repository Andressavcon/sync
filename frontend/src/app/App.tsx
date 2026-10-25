import { RouterProvider } from "react-router-dom";
import AuthGate from "./AuthGate";
import Providers from "./providers";
import { router } from "./router";

export default function App() {
  return (
    <AuthGate>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </AuthGate>
  );
}
