import {
  createBankAccount,
  createCreditCard,
  createIncomeForecast,
  createIncomeSource,
  createForecast,
  createUtilityAccount,
  deleteBankAccount,
  deleteCreditCard,
  deleteIncomeForecast,
  deleteIncomeSource,
  deleteForecast,
  deleteUtilityAccount,
  recalculateAllBankAccounts,
  recalculateBankAccountBalance,
  recordBankYield,
  updateIncomeForecast,
  updateIncomeSource,
  updateBankAccount,
  updateCreditCard,
  updateForecast,
  updateUtilityAccount,
} from "@/app/actions/cadastros";
import { prisma } from "@/lib/prisma";

import { CadastrosClient } from "./cadastros-client";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function parseInitialTab(tabRaw: unknown): "bank" | "card" | "utility" | "income" {
  const v = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
  if (v === "bank" || v === "card" || v === "utility" || v === "income") return v;
  return "bank";
}

export default async function CadastrosPage(props: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  // Next may pass this as a Promise in some versions.
  const searchParams = await Promise.resolve(props.searchParams ?? {});
  const initialTab = parseInitialTab(searchParams.tab);

  const [bankAccounts, creditCards, utilityAccounts, forecasts, incomeSources, incomeForecasts] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.creditCard.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.utilityAccount.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.forecast.findMany({
      include: { utilityAccount: true },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.incomeSource.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.incomeForecast.findMany({
      include: { incomeSource: true, bankAccount: true },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const bankYieldRecords = bankAccounts.length
    ? await prisma.bankAccountYieldRecord.findMany({
        where: { bankAccountId: { in: bankAccounts.map((a) => a.id) } },
        orderBy: [{ recordedAt: "desc" }],
        take: 300,
      })
    : [];

  const bankAccountIds = bankAccounts.map((a) => a.id);

  const movementsByAccountId: Record<
    string,
    { id: string; occurredAt: Date; description: string; kind: "OPENING" | "PAYMENT" | "INCOME" | "TRANSFER" | "YIELD" | "ADJUSTMENT"; deltaCents: number }[]
  > = {};

  if (bankAccountIds.length) {
    const lists = await Promise.all(
      bankAccountIds.map((bankAccountId) =>
        prisma.bankAccountMovement.findMany({
          where: { bankAccountId },
          select: { id: true, occurredAt: true, description: true, kind: true, deltaCents: true },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          take: 2000,
        }),
      ),
    );

    for (let i = 0; i < bankAccountIds.length; i++) {
      movementsByAccountId[bankAccountIds[i]] = lists[i].map((m) => ({
        id: m.id,
        occurredAt: m.occurredAt,
        description: m.description,
        kind: m.kind,
        deltaCents: m.deltaCents,
      }));
    }
  }

  const bankMovementsByAccountId: Record<
    string,
    {
      id: string;
      occurredAt: string; // YYYY-MM-DD
      description: string;
      kind: "payment" | "income" | "transfer" | "yield";
      deltaCents: number;
      balanceAfterCents: number;
    }[]
  > = {};

  for (const acct of bankAccounts) {
    const raw = movementsByAccountId[acct.id] ?? [];
    const list = (bankMovementsByAccountId[acct.id] = raw.map((m) => ({
      id: m.id,
      occurredAt: m.occurredAt.toISOString().slice(0, 10),
      description: m.description,
      kind: (m.kind === "PAYMENT"
        ? "payment"
        : m.kind === "INCOME"
          ? "income"
          : m.kind === "TRANSFER"
            ? "transfer"
            : "yield") as "payment" | "income" | "transfer" | "yield",
      deltaCents: m.deltaCents,
      balanceAfterCents: 0,
    })));

    let running = acct.balanceCents;
    for (const row of list) {
      row.balanceAfterCents = running;
      running = running - row.deltaCents;
    }
  }

  const bankMovementSummaryByAccountId: Record<
    string,
    {
      storedBalanceCents: number;
      computedBalanceCents: number;
      diffCents: number;
      movementsCount: number;
    }
  > = {};

  for (const acct of bankAccounts) {
    const list = bankMovementsByAccountId[acct.id] ?? [];
    const computed = list.reduce((sum, r) => sum + r.deltaCents, 0);
    const stored = acct.balanceCents;
    bankMovementSummaryByAccountId[acct.id] = {
      storedBalanceCents: stored,
      computedBalanceCents: computed,
      diffCents: stored - computed,
      movementsCount: list.length,
    };
  }

  const bankYieldRecordsByAccountId: Record<
    string,
    {
      id: string;
      recordedAt: string;
      month: string;
      mode: "NONE" | "CUMULATIVE" | "MONTHLY";
      valueCents: number;
      deltaCents: number;
    }[]
  > = {};

  for (const r of bankYieldRecords) {
    const bucket = (bankYieldRecordsByAccountId[r.bankAccountId] ??= []);
    if (bucket.length >= 20) continue;
    bucket.push({
      id: r.id,
      recordedAt: r.recordedAt.toISOString().slice(0, 10),
      month: r.month.toISOString().slice(0, 10),
      mode: r.mode,
      valueCents: r.valueCents,
      deltaCents: r.deltaCents,
    });
  }

  return (
    <CadastrosClient
      initialTab={initialTab}
      bankAccounts={bankAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        bank: a.bank,
        status: a.status,
        balanceCents: a.balanceCents,
        yieldMode: a.yieldMode,
      }))}
      bankYieldRecordsByAccountId={bankYieldRecordsByAccountId}
      bankMovementsByAccountId={bankMovementsByAccountId}
      bankMovementSummaryByAccountId={bankMovementSummaryByAccountId}
      creditCards={creditCards.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      }))}
      utilityAccounts={utilityAccounts.map((u) => ({
        id: u.id,
        name: u.name,
        observation: u.observation,
        status: u.status,
      }))}
      incomeSources={incomeSources.map((s) => ({
        id: s.id,
        name: s.name,
        observation: s.observation,
        status: s.status,
      }))}
      incomeForecasts={incomeForecasts.map((f) => ({
        id: f.id,
        incomeSourceId: f.incomeSourceId,
        incomeSourceName: f.incomeSource.name,
        bankAccountId: f.bankAccountId,
        bankAccountName: f.bankAccount?.name ?? null,
        amountCents: f.amountCents,
        kind: f.kind,
        dueDay: f.dueDay,
        installmentsTotal: f.installmentsTotal,
        startsAt: f.startsAt ? f.startsAt.toISOString().slice(0, 10) : null,
        endsAt: f.endsAt ? f.endsAt.toISOString().slice(0, 10) : null,
        oneTimeAt: f.oneTimeAt ? f.oneTimeAt.toISOString().slice(0, 10) : null,
        observation: f.observation,
        status: f.status,
      }))}
      forecasts={forecasts.map((f) => ({
        id: f.id,
        utilityAccountId: f.utilityAccountId,
        utilityAccountName: f.utilityAccount.name,
        amountCents: f.amountCents,
        kind: f.kind,
        dueDay: f.dueDay,
        installmentsTotal: f.installmentsTotal,
        startsAt: f.startsAt ? f.startsAt.toISOString().slice(0, 10) : null,
        endsAt: f.endsAt ? f.endsAt.toISOString().slice(0, 10) : null,
        oneTimeAt: f.oneTimeAt ? f.oneTimeAt.toISOString().slice(0, 10) : null,
        observation: f.observation,
        status: f.status,
      }))}
      actions={{
        createBankAccount,
        updateBankAccount,
        deleteBankAccount,

        recordBankYield,

        createCreditCard,
        updateCreditCard,
        deleteCreditCard,

        createUtilityAccount,
        updateUtilityAccount,
        deleteUtilityAccount,

        createIncomeSource,
        updateIncomeSource,
        deleteIncomeSource,

        createIncomeForecast,
        updateIncomeForecast,
        deleteIncomeForecast,

        createForecast,
        updateForecast,
        deleteForecast,

        recalculateBankAccountBalance,
        recalculateAllBankAccounts,
      }}
    />
  );
}
