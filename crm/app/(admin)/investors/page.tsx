import { UserPlus, Users } from "lucide-react";
import ActionCard from "@/components/ActionCard";

export default function InvestorsMainPage() {
  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 tracking-wide">Investors</h1>
        <p className="text-gray-600 text-base">
          Manage your investors, add new investors, or view existing investors and their investments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          title="Add New Investor"
          description="Easily add a new investor to your database with our intuitive form."
          icon={<UserPlus className="w-7 h-7 text-emerald-600" />}
          href="/investors/new"
          variant="green"
        />
        <ActionCard
          title="View Existing Investors"
          description="Browse through all registered investors with search, sorting, and pagination features."
          icon={<Users className="w-7 h-7 text-blue-600" />}
          href="/investors/list"
          variant="blue"
        />
      </div>
    </div>
  );
}
