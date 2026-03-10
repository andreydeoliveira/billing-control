import {
  createBankAccount,
  createCreditCard,
  createForecast,
  createUtilityAccount,
  deleteBankAccount,
  deleteCreditCard,
  deleteForecast,
  deleteUtilityAccount,
  updateBankAccount,
  updateCreditCard,
  updateForecast,
  updateUtilityAccount,
} from "@/app/actions/cadastros";
import { prisma } from "@/lib/prisma";

import { CadastrosClient } from "./cadastros-client";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function parseInitialTab(tabRaw: unknown): "bank" | "card" | "utility" | "forecast" {
  const v = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
  if (v === "bank" || v === "card" || v === "utility" || v === "forecast") return v;
  return "bank";
}

export default async function CadastrosPage(props: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  // Next may pass this as a Promise in some versions.
  const searchParams = await Promise.resolve(props.searchParams ?? {});
  const initialTab = parseInitialTab(searchParams.tab);

  const [bankAccounts, creditCards, utilityAccounts, forecasts] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.creditCard.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.utilityAccount.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.forecast.findMany({
      include: { utilityAccount: true },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  return (
    <CadastrosClient
      initialTab={initialTab}
      bankAccounts={bankAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        bank: a.bank,
        status: a.status,
        balanceCents: a.balanceCents,
      }))}
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
      forecasts={forecasts.map((f) => ({
        id: f.id,
        utilityAccountId: f.utilityAccountId,
        utilityAccountName: f.utilityAccount.name,
        amountCents: f.amountCents,
        kind: f.kind,
        dueDay: f.dueDay,
        installmentsTotal: f.installmentsTotal,
        startsAt: f.startsAt ? f.startsAt.toISOString().slice(0, 10) : null,
        oneTimeAt: f.oneTimeAt ? f.oneTimeAt.toISOString().slice(0, 10) : null,
        observation: f.observation,
        status: f.status,
      }))}
      actions={{
        createBankAccount,
        updateBankAccount,
        deleteBankAccount,

        createCreditCard,
        updateCreditCard,
        deleteCreditCard,

        createUtilityAccount,
        updateUtilityAccount,
        deleteUtilityAccount,

        createForecast,
        updateForecast,
        deleteForecast,
      }}
    />
  );
}
