import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="card w-full max-w-md p-6 md:p-8">
        <div className="mb-8 text-center">
          <div className="text-2xl font-black tracking-tight text-ink">Div3rsa Portal</div>
          <p className="mt-2 text-sm leading-6 text-muted">Logga in för att följa onboarding, pris och support.</p>
        </div>
        <LoginForm />
        <div className="mt-5 text-center text-sm text-muted">
          <Link href="/reset-password" className="font-bold text-brand">Glömt lösenord?</Link>
        </div>
        <p className="mt-6 rounded-2xl bg-soft p-4 text-sm leading-6 text-muted">
          Konton skapas av Div3rsa. Har du skickat in en ansökan får du portalaccess först efter granskning.
        </p>
      </section>
    </main>
  )
}
