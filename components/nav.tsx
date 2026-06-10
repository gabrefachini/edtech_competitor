import Link from "next/link";

const items = [
  { href: "/dashboard", label: "Painel" },
  { href: "/competitors", label: "Concorrentes" },
  { href: "/reports", label: "Relatórios" },
  { href: "/candidates", label: "Candidatos" }
];

export function TopNav() {
  return (
    <nav className="mx-auto flex max-w-[1440px] flex-wrap gap-2 px-4 pt-4 sm:px-6">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="focus-ring rounded-full border border-outline/80 bg-white/85 px-4 py-2 text-sm font-medium text-text shadow-sm transition hover:-translate-y-px hover:border-[#aeb9ca] hover:bg-surface2"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
