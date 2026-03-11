import Link from "next/link";

type PageShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/issues", label: "Issues" },
  { href: "/projects", label: "Projects" },
  { href: "/teams", label: "Teams" },
  { href: "/notifications", label: "Notifications" },
  { href: "/map", label: "Map" },
];

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6">
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.href === "/map"
                  ? "map-nav-link inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  : "rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              }
            >
              {item.href === "/map" ? (
                <>
                  <span className="map-nav-link__text">{item.label}</span>
                  <span aria-hidden="true" className="map-nav-link__shine" />
                </>
              ) : (
                item.label
              )}
            </Link>
          ))}
        </nav>
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="flex flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
