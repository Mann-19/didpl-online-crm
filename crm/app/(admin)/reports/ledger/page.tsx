import { getLedger } from '../../reports.actions';
import LedgerClient from './LedgerClient';

export default async function LedgerPage() {
  const data = await getLedger();
  return <LedgerClient data={data} />;
}
