import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({ target, children }: { target: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar target={target} />
      <div className="md:pl-64 print:pl-0">
        <Header target={target} />
        <main className="px-4 pb-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
