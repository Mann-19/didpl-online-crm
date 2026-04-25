import { getExpenseReport } from '../../reports.actions';
import ExpensesClient from './ExpensesClient';

export default async function ExpensesReportPage() {
  const data = await getExpenseReport();
  return <ExpensesClient data={data} />;
}
