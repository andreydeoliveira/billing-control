import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function toYearMonthUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

function monthStartUtcFromYearMonth(month: string): Date {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error("bad month");
  const year = Number(m[1]);
  const mm = Number(m[2]);
  return new Date(Date.UTC(year, mm - 1, 1));
}

function nextMonthStartUtc(monthStart: Date) {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
}

function isSameYearMonth(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function monthsDiffUtc(from: Date, to: Date) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

type IncomeForecastRow = Prisma.IncomeForecastGetPayload<{ include: { incomeSource: true } }>;

function occursIncomeInMonth(forecast: IncomeForecastRow, monthStart: Date): boolean {
  if (forecast.status !== "ACTIVE") return false;
  if (forecast.incomeSource.status !== "ACTIVE") return false;
  if (forecast.amountCents <= 0) return false;

  switch (forecast.kind) {
    case "ONE_TIME": {
      if (!forecast.oneTimeAt) return false;
      return isSameYearMonth(forecast.oneTimeAt, monthStart);
    }
    case "MONTHLY": {
      if (!forecast.startsAt) return true;
      return monthsDiffUtc(forecast.startsAt, monthStart) >= 0;
    }
    case "ANNUAL": {
      if (!forecast.startsAt) return false;
      if (monthsDiffUtc(forecast.startsAt, monthStart) < 0) return false;
      return forecast.startsAt.getUTCMonth() === monthStart.getUTCMonth();
    }
    case "INSTALLMENTS": {
      if (!forecast.startsAt) return false;
      const total = forecast.installmentsTotal ?? null;
      if (!total || total <= 0) return false;
      const diff = monthsDiffUtc(forecast.startsAt, monthStart);
      return diff >= 0 && diff < total;
    }
    default:
      return false;
  }
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

type UnpaidItem = {
  kind: "conta" | "manual" | "fatura";
  label: string;
  amountCents: number;
};

export default async function DashboardPage() {
  const now = new Date();
  const month = toYearMonth(now);
  const monthStart = monthStartUtcFromYearMonth(month);

  const [bankAccounts, incomeForecasts, forecasts, assignments, overrides, utilityPayments, manualCharges, creditCards, invoicePayments] =
    await Promise.all([
      prisma.bankAccount.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, balanceCents: true },
      }),
      prisma.incomeForecast.findMany({
        where: { status: "ACTIVE", incomeSource: { status: "ACTIVE" } },
        include: { incomeSource: true },
      }),
      prisma.forecast.findMany({
        where: { status: "ACTIVE", utilityAccount: { status: "ACTIVE" } },
        include: { utilityAccount: true },
      }),
      prisma.forecastCardAssignment.findMany({
        where: { month: monthStart },
        select: { forecastId: true, creditCardId: true },
      }),
      prisma.forecastMonthOverride.findMany({
        where: { month: monthStart },
        select: { forecastId: true, skipped: true, cardConfirmedAmountCents: true },
      }),
      prisma.utilityPayment.findMany({
        where: { month: monthStart },
        select: { forecastId: true },
      }),
      prisma.manualCharge.findMany({
        where: { month: monthStart },
        orderBy: [{ dueDay: "asc" }, { description: "asc" }],
        select: { id: true, description: true, amountCents: true, creditCardId: true, paidAt: true, paidAmountCents: true },
      }),
      prisma.creditCard.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.creditCardInvoicePayment.findMany({
        where: { month: monthStart },
        select: { creditCardId: true },
      }),
    ]);

  const assignmentByForecastId = new Map(assignments.map((a) => [a.forecastId, a.creditCardId] as const));
  const overrideByForecastId = new Map(overrides.map((o) => [o.forecastId, o] as const));
  const paidForecastIds = new Set(utilityPayments.map((p) => p.forecastId));
  const paidInvoiceCardIds = new Set(invoicePayments.map((p) => p.creditCardId));

  const unpaidDirectForecasts: UnpaidItem[] = forecasts
    .filter((f) => {
      const o = overrideByForecastId.get(f.id);
      if (o?.skipped) return false;
      // same logic as /lancamentos
      const occurs = (() => {
        if (f.amountCents <= 0) return false;
        switch (f.kind) {
          case "ONE_TIME":
            return f.oneTimeAt ? isSameYearMonth(f.oneTimeAt, monthStart) : false;
          case "MONTHLY":
            return f.startsAt ? monthsDiffUtc(f.startsAt, monthStart) >= 0 : true;
          case "ANNUAL":
            return f.startsAt ? monthsDiffUtc(f.startsAt, monthStart) >= 0 && f.startsAt.getUTCMonth() === monthStart.getUTCMonth() : false;
          case "INSTALLMENTS": {
            if (!f.startsAt) return false;
            const total = f.installmentsTotal ?? null;
            if (!total || total <= 0) return false;
            const diff = monthsDiffUtc(f.startsAt, monthStart);
            return diff >= 0 && diff < total;
          }
          default:
            return false;
        }
      })();

      if (!occurs) return false;
      if (assignmentByForecastId.has(f.id)) return false;
      if (paidForecastIds.has(f.id)) return false;
      return true;
    })
    .map((f) => ({ kind: "conta" as const, label: f.utilityAccount.name, amountCents: f.amountCents }));

  const unpaidManualDirect: UnpaidItem[] = manualCharges
    .filter((c) => !c.creditCardId)
    .filter((c) => !c.paidAt)
    .map((c) => ({ kind: "manual" as const, label: c.description, amountCents: c.amountCents }));

  const unpaidCardInvoices: UnpaidItem[] = creditCards
    .filter((c) => !paidInvoiceCardIds.has(c.id))
    .map((card) => {
      // invoice total = assigned forecasts (confirmed override if exists) + manual charges on that card
      const forecastTotal = forecasts
        .filter((f) => assignmentByForecastId.get(f.id) === card.id)
        .filter((f) => {
          const o = overrideByForecastId.get(f.id);
          if (o?.skipped) return false;
          // occurs
          if (f.amountCents <= 0) return false;
          switch (f.kind) {
            case "ONE_TIME":
              return f.oneTimeAt ? isSameYearMonth(f.oneTimeAt, monthStart) : false;
            case "MONTHLY":
              return f.startsAt ? monthsDiffUtc(f.startsAt, monthStart) >= 0 : true;
            case "ANNUAL":
              return f.startsAt ? monthsDiffUtc(f.startsAt, monthStart) >= 0 && f.startsAt.getUTCMonth() === monthStart.getUTCMonth() : false;
            case "INSTALLMENTS": {
              if (!f.startsAt) return false;
              const total = f.installmentsTotal ?? null;
              if (!total || total <= 0) return false;
              const diff = monthsDiffUtc(f.startsAt, monthStart);
              return diff >= 0 && diff < total;
            }
            default:
              return false;
          }
        })
        .reduce((sum, f) => {
          const o = overrideByForecastId.get(f.id);
          return sum + (o?.cardConfirmedAmountCents ?? f.amountCents);
        }, 0);

      const manualTotal = manualCharges
        .filter((m) => m.creditCardId === card.id)
        .reduce((sum, m) => sum + m.amountCents, 0);

      return {
        kind: "fatura" as const,
        label: `Fatura — ${card.name}`,
        amountCents: forecastTotal + manualTotal,
      };
    })
    .filter((x) => x.amountCents > 0);

  const unpaidThisMonth = [...unpaidDirectForecasts, ...unpaidManualDirect, ...unpaidCardInvoices].sort((a, b) => b.amountCents - a.amountCents);

  const months = Array.from({ length: 12 }).map((_, i) => {
    const start = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + i, 1));
    return {
      key: `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}`,
      start,
      end: nextMonthStartUtc(start),
    };
  });

  const incomeByMonthAndBank = new Map<string, number>();
  for (const m of months) {
    for (const f of incomeForecasts) {
      if (!f.bankAccountId) continue;
      if (!occursIncomeInMonth(f, m.start)) continue;
      const key = `${m.key}:${f.bankAccountId}`;
      incomeByMonthAndBank.set(key, (incomeByMonthAndBank.get(key) ?? 0) + f.amountCents);
    }
  }

  const manualByMonthAndBank = new Map<string, number>();
  const monthStarts = months.map((m) => m.start);
  const manualFuture = await prisma.manualCharge.findMany({
    where: { month: { in: monthStarts }, creditCardId: null },
    select: { bankAccountId: true, month: true, amountCents: true },
  });
  for (const c of manualFuture) {
    if (!c.bankAccountId) continue;
    const key = `${toYearMonthUtc(c.month)}:${c.bankAccountId}`;
    manualByMonthAndBank.set(key, (manualByMonthAndBank.get(key) ?? 0) + c.amountCents);
  }

  const projections = bankAccounts.map((acct) => {
    let running = acct.balanceCents;

    const rows = months.map((m) => {
      const income = incomeByMonthAndBank.get(`${m.key}:${acct.id}`) ?? 0;
      const manual = manualByMonthAndBank.get(`${m.key}:${acct.id}`) ?? 0;

      const delta = income - manual;
      running += delta;

      return {
        month: m.key,
        deltaCents: delta,
        balanceCents: running,
      };
    });

    return {
      bankAccountId: acct.id,
      bankAccountName: acct.name,
      initialBalanceCents: acct.balanceCents,
      rows,
    };
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Visão rápida do mês e projeções.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Pendências do mês</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">Itens deste mês que ainda não foram pagos.</div>
            </div>
            <div className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              {month}
            </div>
          </div>

          <div className="mt-4">
            {unpaidThisMonth.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Nada pendente.</div>
            ) : (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {unpaidThisMonth.map((it, idx) => (
                  <div key={`${it.kind}:${idx}:${it.label}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{it.label}</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300">
                        {it.kind === "conta" ? "Conta" : it.kind === "manual" ? "Manual" : "Fatura"}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold">{formatCents(it.amountCents)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm font-semibold">Saldo previsto (12 meses)</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            Projeção por conta bancária: saldo atual + entradas previstas vinculadas − cobranças manuais vinculadas.
          </div>

          <div className="mt-4 space-y-4">
            {projections.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Nenhuma conta bancária ativa.</div>
            ) : (
              projections.map((p) => (
                <div key={p.bankAccountId} className="rounded-2xl border border-border bg-muted p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div className="text-sm font-semibold">{p.bankAccountName}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">Saldo atual: {formatCents(p.initialBalanceCents)}</div>
                  </div>

                  <div className="mt-3 max-h-[42vh] overflow-y-auto rounded-xl border border-border bg-surface">
                    <table className="w-full border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-surface">
                        <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          <th className="border-b border-border bg-surface px-3 py-2">Mês</th>
                          <th className="border-b border-border bg-surface px-3 py-2 text-right">Delta</th>
                          <th className="border-b border-border bg-surface px-3 py-2 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {p.rows.map((r) => (
                          <tr key={r.month}>
                            <td className="border-b border-border/60 px-3 py-2">{r.month}</td>
                            <td className="border-b border-border/60 px-3 py-2 text-right text-zinc-700 dark:text-zinc-200">{formatCents(r.deltaCents)}</td>
                            <td className="border-b border-border/60 px-3 py-2 text-right font-medium">{formatCents(r.balanceCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
