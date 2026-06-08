import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { requireUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true })
  if (!user.must_change_password) redirect('/dashboard')

  return (
    <main className="flex min-h-screen items-center justify-center bg-soft px-4 py-10">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-muted">Första inloggning</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Byt lösenord</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Du loggade in med ett lösenord som superadmin satte upp åt dig. Välj ett eget lösenord innan du fortsätter till portalen.</p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  )
}
