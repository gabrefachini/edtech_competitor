import type { ReactNode } from "react";

export function Shell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(185,113,224,.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,175,10,.14),transparent_24%),linear-gradient(to_bottom,#fff_0%,#fdfdfd_48%,#f9fafc_100%)]" />
      <header className="sticky top-0 z-20 border-b border-outline/80 bg-bg/78 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-4 rounded-[1.75rem] border border-outline/70 bg-white/75 px-4 py-4 shadow-soft backdrop-blur md:px-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">competitive-digest</div>
              <h1 className="mt-1 font-['Poppins'] text-[1.65rem] font-semibold leading-tight text-text md:text-[1.9rem]">{title}</h1>
              {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[1.5rem] border border-outline/90 bg-white/90 shadow-card backdrop-blur-sm ${className}`}>{children}</section>;
}

export function Button({ children, variant = "primary", href, onClick, disabled = false }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost"; href?: string; onClick?: () => void; disabled?: boolean }) {
  const base = "focus-ring inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition duration-150";
  const styles =
    variant === "primary"
      ? "bg-primary text-white shadow-sm shadow-primary/20 hover:-translate-y-[1px] hover:brightness-95"
      : variant === "secondary"
        ? "bg-secondary text-[#332302] shadow-sm shadow-secondary/10 hover:-translate-y-[1px] hover:brightness-95"
        : "border border-outline bg-white text-text hover:border-[#aeb9ca] hover:bg-surface2";
  return href ? (
    <a className={`${base} ${styles} ${disabled ? "pointer-events-none opacity-50" : ""}`} href={href} aria-disabled={disabled}>
      {children}
    </a>
  ) : (
    <button className={`${base} ${styles} ${disabled ? "cursor-not-allowed opacity-50" : ""}`} type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "success" | "warning" | "critical" }) {
  const tones = {
    neutral: "bg-surface2 text-text ring-1 ring-inset ring-outline/60",
    info: "bg-[#d1e4ff] text-info ring-1 ring-inset ring-[#b8d4f2]",
    success: "bg-[#dff6e3] text-success ring-1 ring-inset ring-[#bde5c6]",
    warning: "bg-[#fff2cc] text-[#664c00] ring-1 ring-inset ring-[#f0df9f]",
    critical: "bg-[#ffdad5] text-critical ring-1 ring-inset ring-[#efb8b3]"
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
