import { useAuth } from '../context/AuthContext';
import FarmerMarket from '../components/market/FarmerMarket';
import CustomerMarket from '../components/market/CustomerMarket';
import { Store } from 'lucide-react';

export default function MarketPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
            <Store className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-800">Market</h1>
            <p className="text-sm text-stone-500">
              {user.role === 'FARMER'
                ? 'Manage your crop supplies and incoming orders'
                : 'Browse available farm produce and place orders'}
            </p>
          </div>
        </div>

        {user.role === 'FARMER' ? <FarmerMarket /> : <CustomerMarket />}
      </div>
    </div>
  );
}
