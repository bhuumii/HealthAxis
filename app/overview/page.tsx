import { ProtectedRoute } from "@/components/protected-route";
import { OverviewView } from "@/components/overview-view";

export default function OverviewPage() {
  return (
    <ProtectedRoute>
      <OverviewView />
    </ProtectedRoute>
  );
}
