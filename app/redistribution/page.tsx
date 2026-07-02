import { ProtectedRoute } from "@/components/protected-route";
import { RedistributionView } from "@/components/redistribution-view";

export default function RedistributionPage() {
  return (
    <ProtectedRoute>
      <RedistributionView />
    </ProtectedRoute>
  );
}
