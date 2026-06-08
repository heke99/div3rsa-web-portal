import { PortalLayout } from '@/components/layout/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/auth/session'

const steps = ['Ansökan mottagen', 'Ansökan granskad', 'Prisprofil satt', 'Partner-onboarding startad', 'Portal skapad', 'Konto aktiverat', 'Betalflöde under uppsättning', 'Aktiv kund']

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireUser()
  return (
    <PortalLayout user={user}>
      <PageHeader title="Onboarding" description="Följ vilka steg som är klara och vad som återstår." />
      <div className="card p-6">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-brand">{index + 1}</div>
              <div><div className="font-black text-ink">{step}</div><div className="text-sm text-muted">Status uppdateras av Div3rsa.</div></div>
            </div>
          ))}
        </div>
      </div>
    </PortalLayout>
  )
}
