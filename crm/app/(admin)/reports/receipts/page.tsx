import { getReceiptReport } from '../../reports.actions';
import { getCompanies } from '../../companies.actions';
import ReceiptsClient from './ReceiptsClient';

export default async function ReceiptsReportPage() {
  const [data, companies] = await Promise.all([
    getReceiptReport(),
    getCompanies()
  ]);

  return <ReceiptsClient data={data} companies={companies} />;
}
