import { Navigate, useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import FarmDashboard from '../components/farm/FarmDashboard';

export default function FarmDetailsPage() {
  const { farmId } = useParams();

  if (!farmId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardShell
      title="Your Farm Dashboard"
      subtitle="Review your saved boundary and zones. Crop planning, calendar, and cost tools stay disabled for now."
    >
      <FarmDashboard farmId={farmId} />
    </DashboardShell>
  );
}
