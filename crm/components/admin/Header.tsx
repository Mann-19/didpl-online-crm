'use client';
import { Menu } from 'lucide-react';

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800 hidden sm:block">
          Dholera Infra Development Pvt. Ltd.
        </h1>
        <h1 className="text-lg font-bold text-gray-800 sm:hidden">
          DIDPL
        </h1>
      </div>
    </header>
  );
}
