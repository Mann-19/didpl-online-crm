import { getRecoveryReport } from '../../reports.actions';
import RecoveryClient from './RecoveryClient';

export default async function RecoveryPage() {
  const data = await getRecoveryReport();
  return <RecoveryClient data={data} />;
}
