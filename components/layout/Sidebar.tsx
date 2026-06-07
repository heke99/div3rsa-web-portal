import Link from 'next/link'
import type { PortalUser } from '@/lib/auth/session'

const adminLinks = [
  { href: '/admin', label: 'Översikt' },
  { href: '/admin/payment-applications', label: 'Ansökningar' },
  { href: '/admin/payment-customers', label: 'Kunder' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/audit-logs', label: 'Audit logs' },
  { href: '/admin/users', label: 'Användare' },
]

const customerLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/pricing', label: 'Pris & avtal' },
  { href: '/support', label: 'Support' },
  { href: '/settings/company', label: 'Företagsuppgifter' },
]

export function Sidebar({ user }: { user: PortalUser }) {
  const isAdmin = ['super_admin', 'admin', 'support'].includes(user.role)
  const links = isAdmin ? adminLinks : customerLinks

  return (
    <aside className="sidebar">
      <div className="mb-8">
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="block">
          <div className="text-xl font-black tracking-tight text-ink">Div3rsa</div>
          <div className="text-sm font-semibold text-muted">Portal</div>
        </Link>
      </div>

      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-xl px-3 py-2 text-sm font800 font-semibold text-slate-700 hover:bg-slate-100 hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 rounded-2xl border border-line bg-soft p-4 text-sm">
        <div className="font800 font-bold text-ink">{user.full_name || user.email}</div>
        <div className="mt-1 text-muted">{user.role.replace('_', ' ')}</div>
      </div>

      <form action="/auth/signout" method="post" className="mt-4">
        <button className="btn btn-secondary w-full" type="submit">Logga ut</button>
      </form>
    </aside>
  )
}
