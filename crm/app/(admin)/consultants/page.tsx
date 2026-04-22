import { UserPlus, Users } from "lucide-react";
import ActionCard from "@/components/ActionCard";

export default function ConsultantsMainPage() {
  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 tracking-wide">Consultants</h1>
        <p className="text-gray-600 text-base">
          Manage your consultants network, register new partners, or view existing directory
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          title="Register New Consultant"
          description="Register a new consulting partner with their details."
          icon={<UserPlus className="w-7 h-7 text-amber-600" />}
          href="/consultants/new"
          variant="amber"
        />
        <ActionCard
          title="View Consultant Directory"
          description="Browse through your entire network of consultants."
          icon={<Users className="w-7 h-7 text-amber-600" />}
          href="/consultants/list"
          variant="amber"
        />
      </div>
    </div>
  );
}
