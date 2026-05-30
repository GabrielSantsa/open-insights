import { createFileRoute } from '@tanstack/react-router'
import DatabaseStatus from '@/pages/DatabaseStatus'

export const Route = createFileRoute('/_authenticated/database-status')({
  component: DatabaseStatus,
})
