import { getLegalDocumentReport } from '@/app/(admin)/reports.actions'
import LegalDocumentReportClient from './LegalDocumentReportClient'

export const metadata = {
  title: 'Legal Document Report | DIDP',
}

export const dynamic = 'force-dynamic'

export default async function LegalDocumentReportPage() {
  const reportData = await getLegalDocumentReport()

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
      <LegalDocumentReportClient initialData={reportData} />
    </div>
  )
}
