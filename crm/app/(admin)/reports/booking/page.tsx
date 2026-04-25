import { getBookingReport } from '../../reports.actions';
import BookingClient from './BookingClient';

export default async function BookingReportPage() {
  const data = await getBookingReport();
  return <BookingClient data={data} />;
}
