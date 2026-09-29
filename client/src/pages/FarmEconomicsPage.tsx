import { useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import FarmEconomicsTool from '../components/farm/economics/FarmEconomicsTool';

export default function FarmEconomicsPage() {
  const { farmId } = useParams<{ farmId: string }>();

  if (!farmId) return null;

  return (
    <DashboardShell
      title="Farm Economics & Profit Analysis"
      subtitle="Analyze multi-layer crop yields, costs, processing margins, and infrastructure payback."
    >
      <FarmEconomicsTool farmId={farmId} />
    </DashboardShell>
  );
}
