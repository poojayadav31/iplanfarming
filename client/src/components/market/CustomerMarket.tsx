import { useState } from 'react';
import { ShoppingBag, ClipboardList, PlusCircle } from 'lucide-react';
import BrowseSupplies from './customer/BrowseSupplies';
import MyOrders from './customer/MyOrders';
import MyDemands from './customer/MyDemands';

type Tab = 'browse' | 'orders' | 'demands';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'browse',  label: 'Browse Supplies', icon: ShoppingBag },
  { id: 'orders',  label: 'My Orders',       icon: ClipboardList },
  { id: 'demands', label: 'My Demands',      icon: PlusCircle },
];

export default function CustomerMarket() {
  const [tab, setTab] = useState<Tab>('browse');

  return (
    <div>
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

      {tab === 'browse'  && <BrowseSupplies />}
      {tab === 'orders'  && <MyOrders />}
      {tab === 'demands' && <MyDemands />}
    </div>
  );
}
