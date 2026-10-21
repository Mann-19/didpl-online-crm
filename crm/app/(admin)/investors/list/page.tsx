import { getInvestors, getReferrers, getAllInvestments } from '../../investors.actions'
import InvestorListClient from './InvestorListClient'

export default async function InvestorsListPage() {
  const [investors, referrers, allInvestments] = await Promise.all([
    getInvestors(),
    getReferrers(),
    getAllInvestments(),
  ])

  return (
    <InvestorListClient
      initialInvestors={investors}
      referrers={referrers}
      initialInvestments={allInvestments}
    />
  )
}
