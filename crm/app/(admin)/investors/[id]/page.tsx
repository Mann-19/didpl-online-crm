import { getInvestorById } from '../../investors.actions'
import InvestorDetailsClient from './InvestorDetailsClient'

export default async function InvestorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const investor = await getInvestorById(id)
  
  if (!investor) {
    return <div>Investor not found</div>
  }

  return <InvestorDetailsClient investor={investor} />
}
