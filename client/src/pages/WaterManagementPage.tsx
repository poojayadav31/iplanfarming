import { useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import WaterDashboard from '../components/water/WaterDashboard';

export default function WaterManagementPage() {
  const { farmId } = useParams<{ farmId: string }>();

  if (!farmId) return null;

  return (
    <DashboardShell
      title="Smart Water Management"
      subtitle="Eco-Hydraulic Engine — calculates zone water deficits from soil type, drainage, and crop need, then schedules and tracks weekly irrigation tasks"
    >
      <WaterDashboard farmId={farmId} />
    </DashboardShell>
  );
}
