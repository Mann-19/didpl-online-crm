import { getCommissionReport } from '../../reports.actions';
import CommissionClient from './CommissionClient';

export default async function CommissionPage() {
  const data = await getCommissionReport();
  return <CommissionClient data={data} />;
}
