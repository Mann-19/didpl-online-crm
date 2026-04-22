import { getClients } from '../../people.actions'
import ClientListClient from './ClientListClient'

export default async function ClientsListPage() {
  const clients = await getClients()
  return <ClientListClient initialClients={clients} />
}
