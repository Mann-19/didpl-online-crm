import { getReferrers } from '../../investors.actions'
import NewInvestorPage from './NewInvestorPage'

export default async function InvestorsNewPage() {
  const referrers = await getReferrers()
  return <NewInvestorPage referrers={referrers} />
}
