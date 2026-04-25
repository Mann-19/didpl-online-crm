import { getReceiptReport } from '../../reports.actions';
import ReceiptsClient from './ReceiptsClient';

export default async function ReceiptsReportPage() {
  const data = await getReceiptReport();
  return <ReceiptsClient data={data} />;
}
