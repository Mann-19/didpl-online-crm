// app/(admin)/approvals/page.tsx
// Master Admin only — review all pending change requests from employees

import { getPendingChanges } from '@/app/(admin)/change-requests.actions'
import ApprovalsClient from './ApprovalsClient'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const [pending, approved, rejected] = await Promise.all([
    getPendingChanges('pending'),
    getPendingChanges('approved'),
    getPendingChanges('rejected'),
  ])

  return (
    <ApprovalsClient
      initialPending={pending}
      initialApproved={approved}
      initialRejected={rejected}
    />
  )
}
