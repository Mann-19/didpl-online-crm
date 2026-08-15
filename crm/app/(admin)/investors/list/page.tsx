import { getInvestors } from '../../investors.actions'
import InvestorListClient from './InvestorListClient'

export default async function InvestorsListPage() {
  const investors = await getInvestors()
  return <InvestorListClient initialInvestors={investors} />
}
