import Link from 'next/link'
import { ActivateForm } from '@/components/auth/ActivateForm'

export const dynamic = 'force-dynamic'

export default async function ActivatePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const token = typeof params?.token === 'string' ? params.token : ''
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="card w-full max-w-md p-6 md:p-8">
        <div className="mb-8 text-center">
          <div className="text-2xl font-black tracking-tight text-ink">Aktivera konto</div>
          <p className="mt-2 text-sm leading-6 text-muted">Skapa ditt lösenord för Div3rsa Portal.</p>
        </div>
        {token ? <ActivateForm token={token} /> : <p className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">Aktiveringslänk saknas.</p>}
        <div className="mt-5 text-center text-sm text-muted"><Link href="/login" className="font-bold text-brand">Till login</Link></div>
      </section>
    </main>
  )
}
