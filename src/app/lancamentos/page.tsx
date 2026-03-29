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

function toIsoYearMonthUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

type ForecastRow = Prisma.ForecastGetPayload<{ include: { utilityAccount: true } }>;
type IncomeForecastRow = Prisma.IncomeForecastGetPayload<{ include: { incomeSource: true } }>;

function occursInMonth(forecast: ForecastRow, monthStart: Date): boolean {
  if (forecast.status !== "ACTIVE") return false;
  if (forecast.utilityAccount.status !== "ACTIVE") return false;
  if (forecast.amountCents <= 0) return false;

  if (forecast.endsAt && monthsDiffUtc(monthStart, forecast.endsAt) > 0) return false;

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

  if (forecast.endsAt && monthsDiffUtc(monthStart, forecast.endsAt) > 0) return false;

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
    incomeReceiptsForPeriod,
    incomeReceiptsReceivedInMonth,
    incomeEntries,
    forecasts,
    assignments,
    utilityPayments,
    utilityPaymentsPaidInMonth,
    invoicePayments,
    manualCharges,
    manualChargesPaidInMonth,
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
      prisma.incomeReceipt.findMany({
        where: {
          receivedAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        include: {
          bankAccount: { select: { id: true, name: true, bank: true } },
          incomeSource: { select: { id: true, name: true } },
          incomeForecast: { select: { id: true, amountCents: true, dueDay: true, observation: true } },
        },
        orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
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
          bankAccountId: true,
          bankAccount: { select: { id: true, name: true, bank: true } },
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
      prisma.utilityPayment.findMany({
        where: {
          paidAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        include: {
          bankAccount: { select: { id: true, name: true } },
          forecast: { include: { utilityAccount: { select: { name: true } } } },
        },
        orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
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
          utilityAccount: { select: { id: true, name: true } },
        },
      }),
      prisma.manualCharge.findMany({
        where: {
          creditCardId: null,
          paidAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
        include: {
          bankAccount: { select: { id: true, name: true } },
          utilityAccount: { select: { id: true, name: true } },
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
          fromBankAccount: { select: { id: true, name: true, bank: true } },
          toBankAccount: { select: { id: true, name: true, bank: true } },
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

  const receiptByIncomeForecastIdForPeriod = new Map(
    incomeReceiptsForPeriod.map((r) => [r.incomeForecastId, r] as const),
  );

  const incomeOpenItems = incomeForecasts
    .filter((f) => occursIncomeInMonth(f, monthStart))
    .filter((f) => !receiptByIncomeForecastIdForPeriod.has(f.id))
    .map((f) => {
      const label = f.observation?.trim() ? `${f.incomeSource.name} (${f.observation.trim()})` : f.incomeSource.name;

      return {
        rowKey: `income:open:${f.id}`,
        incomeForecastId: f.id,
        label,
        bankAccountId: f.bankAccountId ?? null,
        bankAccountName: f.bankAccount?.name ?? null,
        amountCents: f.amountCents,
        dueDay: f.dueDay ?? null,
        received: false as const,
        receivedAmountCents: null,
        receivedAt: null,
        receivedBankAccountName: null,
        receivedBankAccountBank: null,
        receiptMonth: month,
      };
    });

  const incomeReceivedItems = incomeReceiptsReceivedInMonth.map((r) => {
    const obs = r.incomeForecast?.observation?.trim() || "";
    const label = obs ? `${r.incomeSource.name} (${obs})` : r.incomeSource.name;
    return {
      rowKey: `income:receipt:${r.id}`,
      incomeForecastId: r.incomeForecastId,
      label,
      bankAccountId: r.bankAccountId,
      bankAccountName: null,
      amountCents: r.incomeForecast?.amountCents ?? r.amountCents,
      dueDay: r.incomeForecast?.dueDay ?? null,
      received: true as const,
      receivedAmountCents: r.amountCents,
      receivedAt: r.receivedAt.toISOString().slice(0, 10),
      receivedBankAccountName: r.bankAccount?.name ?? null,
      receivedBankAccountBank: r.bankAccount?.bank ?? null,
      receiptMonth: toIsoYearMonthUtc(r.month),
    };
  });

  const incomeItems = [...incomeOpenItems, ...incomeReceivedItems].sort((a, b) => {
    const ad = a.received ? (a.receivedAt ? Number(a.receivedAt.slice(8, 10)) : 99) : a.dueDay ?? 99;
    const bd = b.received ? (b.receivedAt ? Number(b.receivedAt.slice(8, 10)) : 99) : b.dueDay ?? 99;
    if (ad !== bd) return ad - bd;
    return a.label.localeCompare(b.label);
  });

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

  const manualDirectOpen = manualCharges
    .filter((c) => !c.creditCardId)
    .filter((c) => !c.paidAt)
    .map((c) => ({
      rowKey: `manual:open:${c.id}`,
      kind: "manual" as const,
      manualChargeId: c.id,
      label: c.utilityAccount?.name ?? c.description,
      observation: c.observation ?? null,
      amountCents: c.amountCents,
      dueDay: c.dueDay ?? (c.occurredAt ? c.occurredAt.getUTCDate() : null),
      occurredAt: c.occurredAt ? c.occurredAt.toISOString().slice(0, 10) : null,
      paid: false as const,
      paidAmountCents: null,
      paidAt: null,
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
      fromBankAccountBank: string;
      toBankAccountId: string;
      toBankAccountName: string;
      toBankAccountBank: string;
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
        fromBankAccountBank: t.fromBankAccount.bank,
        toBankAccountId: t.toBankAccount.id,
        toBankAccountName: t.toBankAccount.name,
        toBankAccountBank: t.toBankAccount.bank,
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
    fromBankAccountBank: m.fromBankAccountBank,
    toBankAccountId: m.toBankAccountId,
    toBankAccountName: m.toBankAccountName,
    toBankAccountBank: m.toBankAccountBank,
    amountCents: m.amountCents,
  }));

  const directForecastOpenItems = forecastOccurrences
    .filter((o) => !assignmentByForecastId.has(o.forecastId))
    .filter((o) => !paymentByForecastId.has(o.forecastId))
    .map((o) => ({
      rowKey: `forecast:open:${o.forecastId}`,
      kind: "forecast" as const,
      forecastId: o.forecastId,
      label: o.utilityAccountName,
      amountCents: o.amountCents,
      dueDay: o.dueDay,
      paid: false as const,
      paidAmountCents: null,
      paidAt: null,
      paymentMonth: null,
    }));

  const directForecastPaidItems = utilityPaymentsPaidInMonth.map((p) => {
    const paidAtIso = p.paidAt.toISOString().slice(0, 10);
    return {
      rowKey: `forecast:paid:${p.id}`,
      kind: "forecast" as const,
      forecastId: p.forecastId,
      label: p.forecast.utilityAccount.name,
      amountCents: p.forecast.amountCents,
      dueDay: p.paidAt.getUTCDate(),
      paid: true as const,
      paidAmountCents: p.amountCents,
      paidAt: paidAtIso,
      paymentMonth: toIsoYearMonthUtc(p.month),
    };
  });

  const manualDirectPaidItems = manualChargesPaidInMonth.map((c) => {
    const paidAtIso = c.paidAt ? c.paidAt.toISOString().slice(0, 10) : null;
    return {
      rowKey: `manual:paid:${c.id}`,
      kind: "manual" as const,
      manualChargeId: c.id,
      label: c.utilityAccount?.name ?? c.description,
      observation: c.observation ?? null,
      amountCents: c.amountCents,
      dueDay: c.paidAt ? c.paidAt.getUTCDate() : c.dueDay ?? null,
      occurredAt: c.occurredAt ? c.occurredAt.toISOString().slice(0, 10) : null,
      paid: true as const,
      paidAmountCents: c.paidAmountCents ?? c.amountCents,
      paidAt: paidAtIso,
    };
  });

  const directItems = [...directForecastOpenItems, ...manualDirectOpen, ...directForecastPaidItems, ...manualDirectPaidItems].sort(
    (a, b) => {
      const ad = a.dueDay ?? 99;
      const bd = b.dueDay ?? 99;
      if (ad !== bd) return ad - bd;
      return a.label.localeCompare(b.label);
    },
  );

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
      label: c.utilityAccount?.name ?? c.description,
      observation: c.observation ?? null,
      amountCents: c.cardConfirmedAmountCents ?? c.amountCents,
      originalAmountCents: c.amountCents,
      dueDay: c.dueDay ?? null,
      occurredAt: c.occurredAt ? c.occurredAt.toISOString().slice(0, 10) : null,
      confirmedAmountCents: c.cardConfirmedAmountCents ?? null,
      confirmedAt: c.cardConfirmedAt ? c.cardConfirmedAt.toISOString().slice(0, 10) : null,
    }));

    function sortKey(it: (typeof forecastItems)[number] | (typeof manualItems)[number]): number {
      // Prefer the most "real" date for ordering.
      const iso =
        it.kind === "manual"
          ? it.occurredAt ?? it.confirmedAt
          : it.confirmedAt ?? (it.dueDay ? `${monthStart.getUTCFullYear()}-${pad2(monthStart.getUTCMonth() + 1)}-${pad2(it.dueDay)}` : null);

      if (!iso) return 0;
      const t = Date.parse(`${iso}T00:00:00.000Z`);
      return Number.isFinite(t) ? t : 0;
    }

    const items = [...forecastItems, ...manualItems].sort((a, b) => {
      const at = sortKey(a);
      const bt = sortKey(b);
      if (at !== bt) return bt - at; // desc
      return a.label.localeCompare(b.label);
    });

    const totalCents = items.reduce((sum, it) => sum + it.amountCents, 0);
    const unconfirmedForecastCount = forecastItems.filter((it) => it.confirmedAmountCents === null).length;
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

  const plannedIncomeCents = incomeForecasts.filter((f) => occursIncomeInMonth(f, monthStart)).reduce((sum, f) => sum + f.amountCents, 0);
  const plannedExpenseCents =
    forecastOccurrences
      .filter((o) => !assignmentByForecastId.has(o.forecastId))
      .reduce((sum, o) => sum + o.amountCents, 0) +
    manualCharges.filter((c) => !c.creditCardId).reduce((sum, c) => sum + c.amountCents, 0) +
    cardGroups.reduce((sum, g) => sum + g.totalCents, 0);
  const plannedNetCents = plannedIncomeCents - plannedExpenseCents;

  const realizedIncomeCents = incomeReceiptsReceivedInMonth.reduce((sum, r) => sum + r.amountCents, 0) + incomeEntries.reduce((sum, e) => sum + e.amountCents, 0);
  const realizedExpenseCents =
    utilityPaymentsPaidInMonth.reduce((sum, p) => sum + p.amountCents, 0) +
    invoicePayments.reduce((sum, p) => sum + p.amountCents, 0) +
    manualChargesPaidInMonth.reduce((sum, c) => sum + (c.paidAmountCents ?? c.amountCents), 0);
  const realizedNetCents = realizedIncomeCents - realizedExpenseCents;
  const deltaNetCents = realizedNetCents - plannedNetCents;

  const confirmedCardExpenseCents = cardGroups.reduce(
    (sum, g) =>
      sum +
      g.items.reduce((s, it) => {
        if (it.kind === "forecast") return s + (it.confirmedAmountCents ?? 0);
        return s + (it.confirmedAmountCents ?? 0);
      }, 0),
    0,
  );

  const confirmedExpenseCents =
    utilityPaymentsPaidInMonth.reduce((sum, p) => sum + p.amountCents, 0) +
    manualChargesPaidInMonth.reduce((sum, c) => sum + (c.paidAmountCents ?? c.amountCents), 0) +
    confirmedCardExpenseCents;

  const confirmedNetCents = realizedIncomeCents - confirmedExpenseCents;

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
        confirmedExpenseCents,
        confirmedNetCents,
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
        bankAccountId: e.bankAccountId ?? null,
        bankAccountName: e.bankAccount?.name ?? null,
        bankAccountBank: e.bankAccount?.bank ?? null,
      }))}
      forecastChoices={forecastChoices}
      directItems={directItems}
      cardGroups={cardGroups}
      movementLog={movementLogPublic}
    />
  );
}
