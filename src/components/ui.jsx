// Small presentational building blocks shared across views.

export function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Button({ variant = 'primary', children, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Stat({ value, label, accent }) {
  return (
    <div className="stat">
      <div className={`stat-value ${accent ? 'accent' : ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export function Empty({ icon = '🗒️', children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <p>{children}</p>
    </div>
  )
}

export function Progressbar({ pct, color = 'var(--accent)' }) {
  return (
    <div className="pbar">
      <div className="pbar-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  )
}
