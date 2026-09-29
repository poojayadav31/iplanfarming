import { Outlet } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-green-600 via-green-700 to-emerald-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sprout className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">iPlanFarmHouse</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smart Farming,<br />
            Simplified.
          </h1>
          <p className="text-lg text-green-100 leading-relaxed max-w-md">
            Connect with local farmers, plan your farmhouse, and bring fresh produce directly to your doorstep.
          </p>
          {/* <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">---</div>
              <div className="text-sm text-green-200 mt-1">Farmers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">---</div>
              <div className="text-sm text-green-200 mt-1">Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">---</div>
              <div className="text-sm text-green-200 mt-1">Regions</div>
            </div>
          </div> */}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6 bg-gray-50">
        <div className="w-full max-w-md py-4">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">iPlanFarmHouse</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
