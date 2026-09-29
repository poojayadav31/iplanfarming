import { useState } from 'react';
import { Package, Bell, BookOpen } from 'lucide-react';
import MySupplies from './farmer/MySupplies';
import DemandAlerts from './farmer/DemandAlerts';
import OrderBook from './farmer/OrderBook';

type Tab = 'supplies' | 'alerts' | 'book';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'supplies', label: 'My Supplies', icon: Package },
  { id: 'alerts',   label: 'Demand Alerts', icon: Bell },
  { id: 'book',     label: 'Order Book', icon: BookOpen },
];

export default function FarmerMarket() {
  const [tab, setTab] = useState<Tab>('supplies');

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === id
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'supplies' && <MySupplies />}
      {tab === 'alerts'   && <DemandAlerts />}
      {tab === 'book'     && <OrderBook />}
    </div>
  );
}
