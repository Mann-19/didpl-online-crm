import { UserPlus, Users } from "lucide-react";
import ActionCard from "@/components/ActionCard";

export default function EmployeesMainPage() {
  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 tracking-wide">Team Members</h1>
        <p className="text-gray-600 text-base">
          Manage your internal team, add new members, and set designations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <ActionCard
          title="View Team Directory"
          description="Browse through your entire staff network."
          icon={<Users className="w-7 h-7 text-teal-600" />}
          href="/employees/list"
          variant="teal"
        />
      </div>
    </div>
  );
}
