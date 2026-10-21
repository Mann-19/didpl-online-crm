import { getInvestorById, getReferrers } from '../../investors.actions'
import InvestorDetailsClient from './InvestorDetailsClient'

export default async function InvestorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [investor, referrers] = await Promise.all([
    getInvestorById(id),
    getReferrers(),
  ])
  
  if (!investor) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-xl font-bold text-gray-800">Investor not found</h2>
        <p className="text-gray-500 mt-2">The requested investor could not be found or has been removed.</p>
      </div>
    )
  }

  return <InvestorDetailsClient investor={investor} referrers={referrers} />
}
