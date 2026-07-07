import { ProtectedRoute } from "@/components/protected-route";
import { ScenarioSimulatorView } from "@/components/scenario-simulator-view";

export default function SimulatorPage() {
  return (
    <ProtectedRoute>
      <ScenarioSimulatorView />
    </ProtectedRoute>
  );
}
