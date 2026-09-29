import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards';
import AuthLayout from './components/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FarmZonePage from './pages/FarmZonePage';
import FarmDetailsPage from './pages/FarmDetailsPage';
import SoilHealthPage from './pages/SoilHealthPage';
import FarmEconomicsPage from './pages/FarmEconomicsPage';
import FarmPlannerPage from './pages/FarmPlannerPage';
import WaterManagementPage from './pages/WaterManagementPage';
import FarmCalendarPage from './pages/FarmCalendarPage';
import MarketPage from './pages/MarketPage';
import ExpertPage from './pages/ExpertPage';
import TodayPage from './pages/TodayPage';
import OnboardingPage from './pages/OnboardingPage';
import ReportIssuePage from './pages/ReportIssuePage';
import AskExpertPage from './pages/AskExpertPage';
import AchievementsPage from './pages/AchievementsPage';
import InsightsPage from './pages/InsightsPage';
import GoalsPage from './pages/GoalsPage';
import ChecklistPage from './pages/ChecklistPage';
import CommunityPage from './pages/CommunityPage';
import ExpertCataloguesPage from './pages/ExpertCataloguesPage';
import SeasonReportPage from './pages/SeasonReportPage';
import FarmDesignerPage from './pages/FarmDesignerPage';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getOnboardingStatus } from './lib/api';

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'FARMER') {
      setDestination('/dashboard');
      return;
    }
    getOnboardingStatus()
      .then((s) => setDestination(s.needsOnboarding ? '/onboarding' : '/today'))
      .catch(() => setDestination('/dashboard'));
  }, [user]);

  if (isLoading || (user && !destination)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </div>
    );
  }

  return <Navigate to={user ? destination! : '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />

          {/* Guest routes - redirect to dashboard if already logged in */}
          <Route element={<GuestRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Route>

          {/* Protected routes - redirect to login if not authenticated */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/farm/:farmId/zones" element={<FarmZonePage />} />
            <Route path="/dashboard/farm/:farmId" element={<FarmDetailsPage />} />
            <Route path="/dashboard/farm/:farmId/soil" element={<SoilHealthPage />} />
            <Route path="/dashboard/farm/:farmId/economics" element={<FarmEconomicsPage />} />
            <Route path="/dashboard/farm/:farmId/plan" element={<FarmPlannerPage />} />
            <Route path="/dashboard/farm/:farmId/water" element={<WaterManagementPage />} />
            <Route path="/dashboard/farm/:farmId/calendar" element={<FarmCalendarPage />} />
            <Route path="/dashboard/farm/:farmId/designer" element={<FarmDesignerPage />} />
            <Route path="/dashboard/farm/:farmId/designer/:designId" element={<FarmDesignerPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/expert" element={<ExpertPage />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/report-issue" element={<ReportIssuePage />} />
            <Route path="/ask-expert" element={<AskExpertPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/insights"     element={<InsightsPage />} />
            <Route path="/goals"        element={<GoalsPage />} />
            <Route path="/checklist"    element={<ChecklistPage />} />
            <Route path="/community"    element={<CommunityPage />} />
            <Route path="/expert/catalogues" element={<ExpertCataloguesPage />} />
            <Route path="/season-report/:zoneId" element={<SeasonReportPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#1f2937',
              color: '#f9fafb',
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
