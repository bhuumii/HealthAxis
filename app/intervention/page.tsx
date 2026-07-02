import { InterventionView } from "@/components/intervention-view";
import { ProtectedRoute } from "@/components/protected-route";

export default function InterventionPage() {
  return (
    <ProtectedRoute>
      <InterventionView />
    </ProtectedRoute>
  );
}
