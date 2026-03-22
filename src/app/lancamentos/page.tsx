import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import { LancamentosClient } from "./lancamentos-client";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseYearMonth(value: unknown): { month: string; monthStart: Date } {
  const raw = String(value ?? "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
      return {
        month: raw,
        monthStart: new Date(Date.UTC(year, month - 1, 1)),
      };
    }
  }

  const now = new Date();
  return {
    month: toYearMonth(now),
    monthStart: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
  };
}

function isSameYearMonth(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function monthsDiffUtc(from: Date, to: Date) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

function nextMonthStartUtc(monthStart: Date) {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
}

type ForecastRow = Prisma.ForecastGetPayload<{ include: { utilityAccount: true } }>;
type IncomeForecastRow = Prisma.IncomeForecastGetPayload<{ include: { incomeSource: true } }>;

function occursInMonth(forecast: ForecastRow, monthStart: Date): boolean {
  if (forecast.status !== "ACTIVE") return false;
  if (forecast.utilityAccount.status !== "ACTIVE") return false;
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

export default async function LancamentosPage(props: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  // Next may pass this as a Promise in some versions.
  const sp = await Promise.resolve(props.searchParams ?? {});
  const monthQuery = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const { month, monthStart } = parseYearMonth(monthQuery);

  const monthEnd = nextMonthStartUtc(monthStart);

  const [
    bankAccounts,
    creditCards,
    utilityAccounts,
    incomeSources,
    incomeForecasts,
    incomeReceipts,
    incomeEntries,
    forecasts,
    assignments,
    utilityPayments,
    invoicePayments,
    manualCharges,
    transfers,
    monthOverrides,
  ] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, bank: true },
      }),
      prisma.creditCard.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.utilityAccount.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.incomeSource.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.incomeForecast.findMany({
        where: {
          status: "ACTIVE",
          incomeSource: { status: "ACTIVE" },
        },
        include: {
          incomeSource: true,
          bankAccount: { select: { id: true, name: true } },
        },
        orderBy: {
          incomeSource: { name: "asc" },
        },
      }),
      prisma.incomeReceipt.findMany({
        where: { month: monthStart },
        include: {
          bankAccount: { select: { id: true, name: true, bank: true } },
          incomeSource: { select: { id: true, name: true } },
        },
      }),
      prisma.transaction.findMany({
        where: {
          type: "INCOME",
          date: { gte: monthStart, lt: monthEnd },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          date: true,
          description: true,
          category: true,
          amountCents: true,
          incomeSource: { select: { id: true, name: true } },
        },
      }),
      prisma.forecast.findMany({
        where: {
          status: "ACTIVE",
          utilityAccount: { status: "ACTIVE" },
        },
        include: {
          utilityAccount: true,
        },
        orderBy: {
          utilityAccount: { name: "asc" },
        },
      }),
      prisma.forecastCardAssignment.findMany({
        where: { month: monthStart },
        select: { forecastId: true, creditCardId: true },
      }),
      prisma.utilityPayment.findMany({
        where: { month: monthStart },
        include: {
          bankAccount: { select: { id: true, name: true } },
          forecast: { include: { utilityAccount: { select: { name: true } } } },
        },
      }),
      prisma.creditCardInvoicePayment.findMany({
        where: { month: monthStart },
        include: {
          bankAccount: { select: { id: true, name: true } },
          creditCard: { select: { id: true, name: true } },
        },
      }),
      prisma.manualCharge.findMany({
        where: { month: monthStart },
        orderBy: [{ dueDay: "asc" }, { description: "asc" }],
        include: {
          bankAccount: { select: { id: true, name: true } },
        },
      }),
      prisma.bankTransfer.findMany({
        where: {
          transferAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        include: {
          fromBankAccount: { select: { id: true, name: true } },
          toBankAccount: { select: { id: true, name: true } },
        },
        orderBy: { transferAt: "desc" },
      }),
      prisma.forecastMonthOverride.findMany({
        where: { month: monthStart },
        select: {
          forecastId: true,
          skipped: true,
          cardConfirmedAmountCents: true,
          cardConfirmedAt: true,
        },
      }),
    ]);

  const receiptByIncomeForecastId = new Map(incomeReceipts.map((r) => [r.incomeForecastId, r] as const));

  const incomeItems = incomeForecasts
    .filter((f) => occursIncomeInMonth(f, monthStart))
    .map((f) => {
      const r = receiptByIncomeForecastId.get(f.id) ?? null;
      const label = f.observation?.trim()
        ? `${f.incomeSource.name} (${f.observation.trim()})`
        : f.incomeSource.name;

      return {
        incomeForecastId: f.id,
        label,
        bankAccountId: f.bankAccountId ?? null,
        bankAccountName: f.bankAccount?.name ?? null,
        amountCents: f.amountCents,
        dueDay: f.dueDay ?? null,
        received: Boolean(r),
        receivedAmountCents: r?.amountCents ?? null,
        receivedAt: r?.receivedAt ? r.receivedAt.toISOString().slice(0, 10) : null,
        receivedBankAccountName: r?.bankAccount?.name ?? null,
        receivedBankAccountBank: r?.bankAccount?.bank ?? null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const assignmentByForecastId = new Map(assignments.map((a) => [a.forecastId, a.creditCardId]));
  const paymentByForecastId = new Map(utilityPayments.map((p) => [p.forecastId, p] as const));
  const invoiceByCardId = new Map(invoicePayments.map((p) => [p.creditCardId, p.amountCents]));

  const overrideByForecastId = new Map(monthOverrides.map((o) => [o.forecastId, o]));

  const forecastOccurrences = forecasts
    .filter((f) => occursInMonth(f, monthStart))
    .filter((f) => {
      const o = overrideByForecastId.get(f.id);
      return !o?.skipped;
    })
    .map((f) => {
      const o = overrideByForecastId.get(f.id);
      const cardAmountCents = o?.cardConfirmedAmountCents ?? f.amountCents;
      return {
      forecastId: f.id,
      utilityAccountId: f.utilityAccountId,
      utilityAccountName: f.utilityAccount.name,
      amountCents: f.amountCents,
      cardAmountCents,
      dueDay: f.dueDay ?? null,
      cardConfirmedAmountCents: o?.cardConfirmedAmountCents ?? null,
      cardConfirmedAt: o?.cardConfirmedAt ?? null,
    };
    });

  const manualDirect = manualCharges
    .filter((c) => !c.creditCardId)
    .map((c) => ({
      kind: "manual" as const,
      manualChargeId: c.id,
      label: c.description,
      amountCents: c.amountCents,
      dueDay: c.dueDay ?? (c.paidAt ? c.paidAt.getUTCDate() : null),
      paid: Boolean(c.paidAt),
      paidAmountCents: c.paidAmountCents ?? null,
      paidAt: c.paidAt ? c.paidAt.toISOString().slice(0, 10) : null,
    }));

  type ManualChargeRow = (typeof manualCharges)[number];
  const manualByCardId = new Map<string, ManualChargeRow[]>();
  for (const c of manualCharges) {
    if (!c.creditCardId) continue;
    const list = manualByCardId.get(c.creditCardId) ?? [];
    list.push(c);
    manualByCardId.set(c.creditCardId, list);
  }

  const movementLog = (() => {
    const rows: Array<{
      id: string;
      transferId: string;
      date: string; // YYYY-MM-DD
      fromBankAccountId: string;
      fromBankAccountName: string;
      toBankAccountId: string;
      toBankAccountName: string;
      amountCents: number;
      sortKey: number;
    }> = [];

    for (const t of transfers) {
      const d = t.transferAt;
      const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
      rows.push({
        id: `transfer:${t.id}`,
        transferId: t.id,
        date,
        fromBankAccountId: t.fromBankAccount.id,
        fromBankAccountName: t.fromBankAccount.name,
        toBankAccountId: t.toBankAccount.id,
        toBankAccountName: t.toBankAccount.name,
        amountCents: t.amountCents,
        sortKey: d.getTime(),
      });
    }

    return rows.sort((a, b) => b.sortKey - a.sortKey);
  })();

  const movementLogPublic = movementLog.map((m) => ({
    id: m.id,
    transferId: m.transferId,
    date: m.date,
    fromBankAccountId: m.fromBankAccountId,
    fromBankAccountName: m.fromBankAccountName,
    toBankAccountId: m.toBankAccountId,
    toBankAccountName: m.toBankAccountName,
    amountCents: m.amountCents,
  }));

  const directForecastItems = forecastOccurrences
    .filter((o) => !assignmentByForecastId.has(o.forecastId))
    .map((o) => {
      const p = paymentByForecastId.get(o.forecastId) ?? null;
      return {
        kind: "forecast" as const,
        forecastId: o.forecastId,
        label: o.utilityAccountName,
        amountCents: o.amountCents,
        dueDay: o.dueDay,
        paid: Boolean(p),
        paidAmountCents: p?.amountCents ?? null,
        paidAt: p?.paidAt ? p.paidAt.toISOString().slice(0, 10) : null,
      };
    });

  const directItems = [...directForecastItems, ...manualDirect]
    .sort((a, b) => {
      const ad = a.dueDay ?? 99;
      const bd = b.dueDay ?? 99;
      if (ad !== bd) return ad - bd;
      return a.label.localeCompare(b.label);
    });

  const forecastChoices = forecastOccurrences
    .map((o) => ({
      forecastId: o.forecastId,
      utilityAccountId: o.utilityAccountId,
      label: o.utilityAccountName,
      amountCents: o.amountCents,
      dueDay: o.dueDay,
      paid: paymentByForecastId.has(o.forecastId),
      onCard: assignmentByForecastId.has(o.forecastId),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const cardGroups = creditCards.map((card) => {
    const forecastItems = forecastOccurrences
      .filter((o) => assignmentByForecastId.get(o.forecastId) === card.id)
      .map((o) => ({
        kind: "forecast" as const,
        forecastId: o.forecastId,
        label: o.utilityAccountName,
        amountCents: o.cardAmountCents,
        originalAmountCents: o.amountCents,
        dueDay: o.dueDay,
        confirmedAmountCents: o.cardConfirmedAmountCents,
        confirmedAt: o.cardConfirmedAt ? o.cardConfirmedAt.toISOString().slice(0, 10) : null,
      }));

    const manualItems = (manualByCardId.get(card.id) ?? []).map((c) => ({
      kind: "manual" as const,
      manualChargeId: c.id,
      label: c.description,
      amountCents: c.cardConfirmedAmountCents ?? c.amountCents,
      originalAmountCents: c.amountCents,
      dueDay: c.dueDay ?? null,
      occurredAt: c.occurredAt ? c.occurredAt.toISOString().slice(0, 10) : null,
      confirmedAmountCents: c.cardConfirmedAmountCents ?? null,
      confirmedAt: c.cardConfirmedAt ? c.cardConfirmedAt.toISOString().slice(0, 10) : null,
    }));

    const items = [...forecastItems, ...manualItems].sort((a, b) => {
      const ad = a.dueDay ?? 99;
      const bd = b.dueDay ?? 99;
      if (ad !== bd) return ad - bd;
      return a.label.localeCompare(b.label);
    });

    const totalCents = items.reduce((sum, it) => sum + it.amountCents, 0);
    const unconfirmedForecastCount =
      forecastItems.filter((it) => it.confirmedAmountCents === null).length +
      manualItems.filter((it) => it.occurredAt && it.confirmedAmountCents === null).length;
    const paidAmountCents = invoiceByCardId.get(card.id) ?? null;
    return {
      creditCardId: card.id,
      creditCardName: card.name,
      items,
      totalCents,
      unconfirmedForecastCount,
      paid: paidAmountCents !== null,
      paidAmountCents,
    };
  });

  const plannedIncomeCents = incomeItems.reduce((sum, it) => sum + it.amountCents, 0);
  const plannedExpenseCents =
    directItems.reduce((sum, it) => sum + it.amountCents, 0) + cardGroups.reduce((sum, g) => sum + g.totalCents, 0);
  const plannedNetCents = plannedIncomeCents - plannedExpenseCents;

  const realizedIncomeCents = incomeReceipts.reduce((sum, r) => sum + r.amountCents, 0) + incomeEntries.reduce((sum, e) => sum + e.amountCents, 0);
  const realizedExpenseCents =
    utilityPayments.reduce((sum, p) => sum + p.amountCents, 0) +
    invoicePayments.reduce((sum, p) => sum + p.amountCents, 0) +
    manualCharges
      .filter((c) => !c.creditCardId && c.paidAt)
      .reduce((sum, c) => sum + (c.paidAmountCents ?? c.amountCents), 0);
  const realizedNetCents = realizedIncomeCents - realizedExpenseCents;
  const deltaNetCents = realizedNetCents - plannedNetCents;

  return (
    <LancamentosClient
      month={month}
      monthSummary={{
        plannedIncomeCents,
        plannedExpenseCents,
        plannedNetCents,
        realizedIncomeCents,
        realizedExpenseCents,
        realizedNetCents,
        deltaNetCents,
      }}
      bankAccounts={bankAccounts}
      creditCards={creditCards}
      utilityAccounts={utilityAccounts}
      incomeSources={incomeSources}
      incomeItems={incomeItems}
      incomeEntries={incomeEntries.map((e) => ({
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        description: e.incomeSource?.name ?? e.description,
        category: e.category,
        amountCents: e.amountCents,
      }))}
      forecastChoices={forecastChoices}
      directItems={directItems}
      cardGroups={cardGroups}
      movementLog={movementLogPublic}
    />
  );
}
