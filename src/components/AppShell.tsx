import type { ReactNode } from "react";
import type { Plan } from "@/lib/access";
import { Header } from "./Header";
import { LegalFooter } from "./LegalFooter";
import { Sidebar } from "./Sidebar";

// Only what the navigation needs crosses to the client: no e-mail, no ids.
export function AppShell({
  target,
  viewer,
  children,
}: {
  target: string;
  viewer: { plan: Plan; isAdmin: boolean };
  children: ReactNode;
}) {
  const nav = { plan: viewer.plan, isAdmin: viewer.isAdmin };
  return (
    <div className="min-h-screen">
      <Sidebar target={target} viewer={nav} />
      <div className="md:pl-64 print:pl-0">
        <Header target={target} canSearch={viewer.isAdmin} />
        <main className="px-4 pb-8 md:px-8">{children}</main>
        <LegalFooter />
      </div>
    </div>
  );
}
