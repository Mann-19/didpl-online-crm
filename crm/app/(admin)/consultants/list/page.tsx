import { getConsultants } from '../../people.actions'
import ConsultantListClient from './ConsultantListClient'

export default async function ConsultantsListPage() {
  const consultants = await getConsultants()
  return <ConsultantListClient initialConsultants={consultants} />
}
