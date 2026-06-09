import { accountingAppUrl } from '@/lib/accounting'

export function AccountingLocked() {
  return (
    <section className="card p-6">
      <h2 className="text-xl font-black text-ink">Accounting kräver aktivering av Div3rsa</h2>
      <p className="mt-2 max-w-2xl text-muted">Bokföringsappen körs separat på {accountingAppUrl}. Superadmin behöver först aktivera Accounting på ert kundkort.</p>
    </section>
  )
}
