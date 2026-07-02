import { CentreDetail } from "@/components/centre-detail";
import { ProtectedRoute } from "@/components/protected-route";

export default async function CentrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProtectedRoute>
      <CentreDetail centreId={id} />
    </ProtectedRoute>
  );
}
