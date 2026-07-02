import { AlertsView } from "@/components/alerts-view";
import { ProtectedRoute } from "@/components/protected-route";

export default function AlertsPage() {
  return (
    <ProtectedRoute>
      <AlertsView />
    </ProtectedRoute>
  );
}
