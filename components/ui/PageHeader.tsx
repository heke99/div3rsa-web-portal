export function PageHeader({ title, eyebrow, description, action }: { title: string; eyebrow?: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <div className="mb-2 text-sm font-extrabold uppercase tracking-[0.18em] text-brand">{eyebrow}</div> : null}
        <h1 className="text-3xl font-black tracking-tight text-ink md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
