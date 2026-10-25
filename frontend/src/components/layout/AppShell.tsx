import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell() {
  return (
    <div className="min-h-dvh pt-3">
      <Sidebar />
      {/* Room for the floating menu: left on the computer, bottom on the phone */}
      <div className="lg:pl-20">
        <Header />
        <main className="px-3 pb-28 pt-5 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
