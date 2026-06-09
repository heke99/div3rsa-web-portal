export function ApiDocumentation() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.div3rsa.com'
  return (
    <section className="card p-5">
      <h2 className="text-xl font-black text-ink">API-dokumentation</h2>
      <p className="mt-2 text-muted">Alla anrop använder Bearer-token eller x-api-key. API-nyckeln styr tenant automatiskt; skicka aldrig payment_customer_id från klienten.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Doc title="Skapa fakturamottagare" code={`curl -X POST ${base}/api/v1/customers \\\n  -H "Authorization: Bearer div3rsa_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Kund AB","email":"ekonomi@kund.se"}'`} />
        <Doc title="Skapa fakturautkast" code={`curl -X POST ${base}/api/v1/invoices \\\n  -H "Authorization: Bearer div3rsa_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"invoice_customer_id":"...","lines":[{"description":"Månadsavgift","quantity":1,"unit_price":500,"vat_rate":25}]}'`} />
        <Doc title="Skicka faktura" code={`curl -X POST ${base}/api/v1/invoices/{id}/send \\\n  -H "Authorization: Bearer div3rsa_live_..."`} />
        <Doc title="Markera betald" code={`curl -X POST ${base}/api/v1/invoices/{id}/mark-paid \\\n  -H "Authorization: Bearer div3rsa_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount":625,"reference":"BG"}'`} />
      </div>
      <div className="mt-5 rounded-2xl border border-line bg-soft p-4 text-sm text-muted"><strong>Rate limit foundation:</strong> 120 anrop per minut och route per aktiv API-nyckel. Alla anrop loggas med request_id.</div>
    </section>
  )
}

function Doc({ title, code }: { title: string; code: string }) {
  return <div><h3 className="font-black text-ink">{title}</h3><pre className="mt-2 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-white">{code}</pre></div>
}
