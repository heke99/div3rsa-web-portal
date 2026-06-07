import { Sidebar } from '@/components/layout/Sidebar'
import type { PortalUser } from '@/lib/auth/session'

export function PortalLayout({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  return (
    <div className="portal-shell">
      <Sidebar user={user} />
      <main className="main-content">{children}</main>
    </div>
  )
}
