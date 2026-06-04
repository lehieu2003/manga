import type { ReactNode } from "react";

export function AuthPanel({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <section className="surface rounded-lg p-6">
        <h1 className="mb-6 text-3xl font-black">{title}</h1>
        {children}
        <div className="mt-5 text-center text-sm text-[var(--accent)]">{footer}</div>
      </section>
    </div>
  );
}
