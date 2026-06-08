import Link from 'next/link'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="card w-full max-w-md p-6 md:p-8">
        <div className="mb-8 text-center">
          <div className="text-2xl font-black tracking-tight text-ink">Återställ lösenord</div>
          <p className="mt-2 text-sm leading-6 text-muted">Skriv din e-post så skickar vi en återställningslänk om kontot finns.</p>
        </div>
        <ResetPasswordForm />
        <div className="mt-5 text-center text-sm text-muted">
          <Link href="/login" className="font-bold text-brand">Tillbaka till login</Link>
        </div>
      </section>
    </main>
  )
}
