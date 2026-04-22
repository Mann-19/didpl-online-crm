import { getEmployees } from '../../people.actions'
import EmployeeListClient from './EmployeeListClient'

export default async function EmployeesListPage() {
  const employees = await getEmployees()
  return <EmployeeListClient initialEmployees={employees} />
}
