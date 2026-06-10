import { Suspense } from "react";
import CompetitorsClient from "./competitors-client";

export default function CompetitorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <main className="mx-auto max-w-[1440px] px-6 py-6">
            <div className="rounded-[1.5rem] border border-outline bg-surface p-5 text-sm text-muted">
              Carregando concorrentes...
            </div>
          </main>
        </div>
      }
    >
      <CompetitorsClient />
    </Suspense>
  );
}
