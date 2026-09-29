import { useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import FarmPlannerTool from '../components/farm/plan/FarmPlannerTool';

export default function FarmPlannerPage() {
  const { farmId } = useParams<{ farmId: string }>();

  if (!farmId) return null;

  return (
    <DashboardShell
      title="Farm Planner & Crop Assigning"
      subtitle="Assign recommended crops to each zone and view multi-layer farming structure."
    >
      <FarmPlannerTool farmId={farmId} />
    </DashboardShell>
  );
}
