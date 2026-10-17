import { getBookingReport } from '../../reports.actions';
import { getCompanies } from '../../companies.actions';
import BookingClient from './BookingClient';

export default async function BookingReportPage() {
  const [data, companies] = await Promise.all([
    getBookingReport(),
    getCompanies()
  ]);
  return <BookingClient data={data} companies={companies} />;
}
