import { Navigate } from "react-router-dom";
import { useEnabledModules } from "@/hooks/useModules";

export default function HomeRedirect() {
  const modules = useEnabledModules();
  return <Navigate to={modules[0].path} replace />;
}