import { Navigate, useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import SoilDashboard from '../components/soil/SoilDashboard';

export default function SoilHealthPage() {
  const { farmId } = useParams();

  if (!farmId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardShell
      title="Zone Crop Planner"
      subtitle="Review soil health per zone, get AI-powered 6-factor crop recommendations, and assign a crop directly to your Farm Planner."
    >
      <SoilDashboard farmId={farmId} />
    </DashboardShell>
  );
}
