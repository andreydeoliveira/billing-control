"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Combobox } from "@/components/combobox";

import {
  assignForecastToCard,
  assignManualChargeToCard,
  confirmCardForecastAmount,
  createIncomeEntry,
  createBankTransfer,
  createManualCharge,
  deleteManualCharge,
  payCreditCardInvoice,
  payManualCharge,
  payUtilityForecast,
  receiveIncomeForecast,
  skipForecastForMonth,
  undoIncomeReceipt,
  undoManualChargePayment,
  undoUtilityForecastPayment,
  unassignForecastFromCard,
  unassignManualChargeFromCard,
  unconfirmCardManualCharge,
  unconfirmCardForecastAmount,
  updateManualCharge,
  updateBankTransfer,
  deleteBankTransfer,
} from "@/app/actions/lancamentos";

type BankAccount = {
  id: string;
  name: string;
  bank: string;
};

function bankAccountLabel(a: BankAccount): string {
  const bank = String(a.bank ?? "").trim();
  return bank ? `${a.name} (${bank})` : a.name;
}

type CreditCard = {
  id: string;
  name: string;
};

type UtilityAccount = {
  id: string;
  name: string;
};

type IncomeSource = {
  id: string;
  name: string;
};

type ForecastChoice = {
  forecastId: string;
  utilityAccountId: string;
  label: string;
  amountCents: number;
  dueDay: number | null;
  paid: boolean;
  onCard: boolean;
};

type IncomeItem = {
  incomeForecastId: string;
  label: string;
  bankAccountId: string | null;
  bankAccountName: string | null;
  amountCents: number;
  dueDay: number | null;
  received: boolean;
  receivedAmountCents: number | null;
  receivedAt: string | null; // YYYY-MM-DD
  receivedBankAccountName: string | null;
  receivedBankAccountBank: string | null;
};

type IncomeEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string | null;
  amountCents: number;
};

type DirectItem =
  | {
      kind: "forecast";
      forecastId: string;
      label: string;
      amountCents: number;
      dueDay: number | null;
      paid: boolean;
      paidAmountCents: number | null;
      paidAt: string | null; // YYYY-MM-DD
    }
  | {
      kind: "manual";
      manualChargeId: string;
      label: string;
      amountCents: number;
      dueDay: number | null;
      paid: boolean;
      paidAmountCents: number | null;
      paidAt?: string | null; // YYYY-MM-DD
    };

type CardItem =
  | {
      kind: "forecast";
      forecastId: string;
      label: string;
      amountCents: number;
      originalAmountCents: number;
      dueDay: number | null;
      confirmedAmountCents: number | null;
      confirmedAt: string | null; // YYYY-MM-DD
    }
  | {
      kind: "manual";
      manualChargeId: string;
      label: string;
      observation: string | null;
      amountCents: number;
      originalAmountCents: number;
      dueDay: number | null;
      occurredAt?: string | null; // YYYY-MM-DD
      confirmedAmountCents?: number | null;
      confirmedAt?: string | null; // YYYY-MM-DD
    };

type CardGroup = {
  creditCardId: string;
  creditCardName: string;
  totalCents: number;
  items: CardItem[];
  unconfirmedForecastCount: number;
  paid: boolean;
  paidAmountCents: number | null;
};

type MovementLogItem = {
  id: string;
  transferId: string;
  date: string; // YYYY-MM-DD
  fromBankAccountId: string;
  fromBankAccountName: string;
  toBankAccountId: string;
  toBankAccountName: string;
  amountCents: number;
};

function dayFromIsoDate(iso: string | null): number | null {
  const s = String(iso ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const day = Number(m[3]);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  return day;
}

type MonthSummary = {
  plannedIncomeCents: number;
  plannedExpenseCents: number;
  plannedNetCents: number;
  realizedIncomeCents: number;
  realizedExpenseCents: number;
  realizedNetCents: number;
  deltaNetCents: number;
  confirmedExpenseCents: number;
  confirmedNetCents: number;
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatSignedCents(cents: number): string {
  const abs = Math.abs(cents);
  const prefix = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${prefix}${formatCents(abs)}`;
}

function parseMoneyToCents(raw: unknown): number | null {
  const s0 = String(raw ?? "").trim();
  if (!s0) return null;

  // Accept common user input like "R$ 1.234,56".
  const s = s0.replace(/[^0-9,.-]/g, "").trim();
  if (!s) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const decimalIsComma = hasComma && (!hasDot || lastComma > lastDot);

  const normalized = decimalIsComma ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  if (!Number.isFinite(cents)) return null;
  return cents;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayFromIsoDateString(iso: string | null): string | null {
  const s = String(iso ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return m[3];
}

function dayMonthFromIsoDateString(iso: string | null): string | null {
  const s = String(iso ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[3]}/${m[2]}`;
}

function isoDateInSelectedMonth(month: string, preferredDay: number | null): string {
  const m = String(month ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return todayIsoDate();
  const year = Number(m[1]);
  const month1 = Number(m[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month1) || month1 < 1 || month1 > 12) return todayIsoDate();

  const today = new Date();
  const fallbackDay = today.getDate();
  const desiredDay = preferredDay && preferredDay >= 1 && preferredDay <= 31 ? preferredDay : fallbackDay;

  const daysInMonth = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const day = Math.min(Math.max(1, desiredDay), daysInMonth);
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function ModalShell({
  title,
  children,
  onClose,
  maxWidthClassName,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
}) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const root = contentRef.current;
      if (!root) return;

      const preferred = root.querySelector<HTMLElement>("[data-autofocus]");
      if (preferred) {
        preferred.focus();
        return;
      }

      const first = root.querySelector<HTMLElement>(
        "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
      );
      first?.focus();
    }, 0);

    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        className={`relative w-full ${maxWidthClassName ?? "max-w-xl"} rounded-2xl border border-black/10 bg-background p-5 shadow-sm dark:border-white/10`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">{title}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Preencha e confirme.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <div ref={contentRef} className="mt-5">
          {children}
        </div>
      </div>
    </div>
  );
}

type MoveToCardModalState =
  | { open: false }
  | {
      open: true;
      item: DirectItem;
    };

type PayUtilityModalState =
  | { open: false }
  | {
      open: true;
      item: DirectItem;
    };

type NewChargeModalState =
  | { open: false }
  | {
      open: true;
    };

type ManageCardModalState =
  | { open: false }
  | {
      open: true;
      creditCardId: string;
      creditCardName: string;
      items: CardItem[];
    };

type ConfirmCardItemModalState =
  | { open: false }
  | {
      open: true;
      forecastId: string;
      label: string;
      amountCents: number;
      originalAmountCents: number;
      dueDay: number | null;
      confirmedAmountCents: number | null;
      confirmedAt: string | null;
    };


type PayInvoiceModalState =
  | { open: false }
  | {
      open: true;
      creditCardId: string;
      creditCardName: string;
      totalCents: number;
      unconfirmedForecastCount: number;
    };

type EditManualChargeModalState =
  | { open: false }
  | {
      open: true;
      manualChargeId: string;
      description: string;
      observation: string | null;
      amountCents: number;
      dueDay: number | null;
      occurredAt: string | null; // YYYY-MM-DD
      isCard: boolean;
    };

type EditTransferModalState =
  | { open: false }
  | {
      open: true;
      transferId: string;
      transferAt: string; // YYYY-MM-DD
      fromBankAccountId: string;
      toBankAccountId: string;
      amountCents: number;
    };

type AddCardChargeModalState =
  | { open: false }
  | {
      open: true;
      creditCardId: string;
      creditCardName: string;
    };

type ReceiveIncomeModalState =
  | { open: false }
  | {
      open: true;
      item: IncomeItem;
    };

type NewIncomeEntryModalState =
  | { open: false }
  | {
      open: true;
    };

type TransferModalState =
  | { open: false }
  | {
      open: true;
    };

export function LancamentosClient({
  month,
  monthSummary,
  bankAccounts,
  creditCards,
  utilityAccounts,
  incomeSources,
  incomeItems,
  incomeEntries,
  forecastChoices,
  directItems,
  cardGroups,
  movementLog,
}: {
  month: string; // YYYY-MM
  monthSummary: MonthSummary;
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  utilityAccounts: UtilityAccount[];
  incomeSources: IncomeSource[];
  incomeItems: IncomeItem[];
  incomeEntries: IncomeEntry[];
  forecastChoices: ForecastChoice[];
  directItems: DirectItem[];
  cardGroups: CardGroup[];
  movementLog: MovementLogItem[];
}) {
  const router = useRouter();

  const [moveToCardModal, setMoveToCardModal] = React.useState<MoveToCardModalState>({ open: false });
  const [newChargeModal, setNewChargeModal] = React.useState<NewChargeModalState>({ open: false });
  const [newChargePaymentKind, setNewChargePaymentKind] = React.useState<"bank" | "card">("bank");
  const [newChargeUtilityAccountId, setNewChargeUtilityAccountId] = React.useState<string>("");
  const [newChargeAmount, setNewChargeAmount] = React.useState<string>("");

  const [payUtilityModal, setPayUtilityModal] = React.useState<PayUtilityModalState>({ open: false });
  const [manageCardModal, setManageCardModal] = React.useState<ManageCardModalState>({ open: false });
  const [confirmCardItemModal, setConfirmCardItemModal] = React.useState<ConfirmCardItemModalState>({ open: false });
  const [payInvoiceModal, setPayInvoiceModal] = React.useState<PayInvoiceModalState>({ open: false });
  const [receiveIncomeModal, setReceiveIncomeModal] = React.useState<ReceiveIncomeModalState>({ open: false });
  const [newIncomeEntryModal, setNewIncomeEntryModal] = React.useState<NewIncomeEntryModalState>({ open: false });
  const [newIncomeSourceId, setNewIncomeSourceId] = React.useState<string>("");
  const [transferModal, setTransferModal] = React.useState<TransferModalState>({ open: false });
  const [editManualChargeModal, setEditManualChargeModal] = React.useState<EditManualChargeModalState>({ open: false });
  const [editTransferModal, setEditTransferModal] = React.useState<EditTransferModalState>({ open: false });
  const [addCardChargeModal, setAddCardChargeModal] = React.useState<AddCardChargeModalState>({ open: false });

  const bestForecastForUtility = React.useMemo(() => {
    const map = new Map<string, { usable: ForecastChoice | null; paid: boolean; onCard: boolean }>();
    for (const u of utilityAccounts) map.set(u.id, { usable: null, paid: false, onCard: false });

    for (const f of forecastChoices) {
      const cur = map.get(f.utilityAccountId) ?? { usable: null, paid: false, onCard: false };
      if (f.paid) cur.paid = true;
      if (f.onCard) cur.onCard = true;
      if (!f.paid && !f.onCard && !cur.usable) cur.usable = f;
      map.set(f.utilityAccountId, cur);
    }

    return map;
  }, [forecastChoices, utilityAccounts]);

  React.useEffect(() => {
    if (!newChargeModal.open) return;
    setNewChargePaymentKind(bankAccounts.length > 0 ? "bank" : "card");

    // Always start blank; user chooses the account.
    setNewChargeUtilityAccountId("");
    setNewChargeAmount("");
  }, [newChargeModal.open, bankAccounts.length]);

  React.useEffect(() => {
    if (!newIncomeEntryModal.open) return;
    setNewIncomeSourceId("");
  }, [newIncomeEntryModal.open]);

  React.useEffect(() => {
    if (!manageCardModal.open) return;
    const group = cardGroups.find((g) => g.creditCardId === manageCardModal.creditCardId);
    if (!group) return;
    setManageCardModal((cur) => {
      if (!cur.open) return cur;
      return {
        ...cur,
        creditCardName: group.creditCardName,
        items: group.items,
      };
    });
  }, [cardGroups, manageCardModal.open, manageCardModal.creditCardId]);

  async function runAction(action: (fd: FormData) => Promise<boolean>, fd: FormData) {
    const ok = await action(fd);
    if (ok) router.refresh();
    return ok;
  }

  return (
    <section className="space-y-6">
      <div className="sticky top-16 z-20 -mx-4 border-b border-black/10 bg-background/70 py-3 backdrop-blur dark:border-white/10 sm:-mx-6">
        <div className="flex flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <h1 className="text-xl font-semibold">Lançamentos</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Previsões do mês, faturas e pagamentos.</p>
          </div>

          <div className="flex items-end gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Mês</span>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  const next = e.target.value;
                  router.replace(`/lancamentos?month=${next}`);
                }}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
              />
            </label>

            <button
              type="button"
              onClick={() => setNewChargeModal({ open: true })}
              className="h-10 rounded-lg bg-black/5 px-4 text-sm font-medium text-zinc-700 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
            >
              + Conta
            </button>

            <button
              type="button"
              onClick={() => setNewIncomeEntryModal({ open: true })}
              className="h-10 rounded-lg bg-black/5 px-4 text-sm font-medium text-zinc-700 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
            >
              + Entrada
            </button>

            <button
              type="button"
              onClick={() => setTransferModal({ open: true })}
              className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90"
            >
              + Transferência
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/10">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">Dentro do previsto: {formatSignedCents(monthSummary.plannedNetCents)}</div>
          <div className="text-sm font-medium">Saldo confirmado: {formatSignedCents(monthSummary.confirmedNetCents)}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Entradas do mês</div>
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
              <tr>
                <th className="px-4 py-3">Fonte</th>
                <th className="px-4 py-3">Dia</th>
                <th className="px-4 py-3">Valor previsto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {incomeItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400" colSpan={5}>
                    Nenhuma entrada prevista neste mês.
                  </td>
                </tr>
              ) : (
                incomeItems.map((it) => (
                  <tr key={it.incomeForecastId} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-4 py-3">{it.label}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const receivedDay = it.received ? dayFromIsoDate(it.receivedAt) : null;
                        const day = receivedDay ?? it.dueDay ?? null;
                        return day ? String(day) : "-";
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        {it.received && it.receivedAmountCents !== null ? (
                          <>
                            <span className="font-medium">{formatCents(it.receivedAmountCents)}</span>
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">Previsto: {formatCents(it.amountCents)}</span>
                          </>
                        ) : (
                          <span className="font-medium">{formatCents(it.amountCents)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {it.received ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          Recebido
                          {it.receivedBankAccountName
                            ? ` (${it.receivedBankAccountName}${it.receivedBankAccountBank ? `: ${it.receivedBankAccountBank}` : ""})`
                            : ""}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">Em aberto</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {it.received ? (
                          <form
                            action={async () => {
                              await runAction(
                                undoIncomeReceipt,
                                (() => {
                                  const x = new FormData();
                                  x.set("incomeForecastId", it.incomeForecastId);
                                  x.set("month", month);
                                  return x;
                                })(),
                              );
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/90"
                            >
                              Desfazer recebimento
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            disabled={bankAccounts.length === 0}
                            onClick={() => setReceiveIncomeModal({ open: true, item: it })}
                            className={
                              bankAccounts.length === 0
                                ? "rounded-lg px-3 py-2 text-xs font-medium text-zinc-400"
                                : "rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/90"
                            }
                          >
                            Receber
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Entradas avulsas</div>
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
              <tr>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Dia</th>
                <th className="px-4 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {incomeEntries.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400" colSpan={3}>
                    Nenhuma entrada avulsa neste mês.
                  </td>
                </tr>
              ) : (
                incomeEntries.map((it) => (
                  <tr key={it.id} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{it.description}</span>
                        {it.category ? <span className="text-xs text-zinc-600 dark:text-zinc-400">{it.category}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{dayFromIsoDate(it.date) ? String(dayFromIsoDate(it.date)) : "-"}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{formatCents(it.amountCents)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Contas do mês</div>
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
              <tr>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Venc.</th>
                <th className="px-4 py-3">Valor previsto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {directItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400" colSpan={5}>
                    Nenhuma previsão direta neste mês.
                  </td>
                </tr>
              ) : (
                directItems.map((it) => (
                  <tr
                    key={it.kind === "forecast" ? it.forecastId : it.manualChargeId}
                    className="border-t border-black/10 dark:border-white/10"
                  >
                    <td className="px-4 py-3">{it.label}</td>
                    <td className="px-4 py-3">
                      {it.paid && it.paidAt
                        ? (dayFromIsoDateString(it.paidAt) ?? it.paidAt)
                        : it.dueDay
                          ? String(it.dueDay)
                          : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {it.paid ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatCents(
                              it.kind === "forecast"
                                ? it.paidAmountCents ?? it.amountCents
                                : it.paidAmountCents ?? it.amountCents,
                            )}
                          </span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">Previsto: {formatCents(it.amountCents)}</span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatCents(it.amountCents)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {it.paid ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Pago</span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">Em aberto</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {it.paid ? (
                          <form
                            action={async () => {
                              if (it.kind === "forecast") {
                                await runAction(
                                  undoUtilityForecastPayment,
                                  (() => {
                                    const x = new FormData();
                                    x.set("forecastId", it.forecastId);
                                    x.set("month", month);
                                    return x;
                                  })(),
                                );
                              } else {
                                await runAction(
                                  undoManualChargePayment,
                                  (() => {
                                    const x = new FormData();
                                    x.set("manualChargeId", it.manualChargeId);
                                    return x;
                                  })(),
                                );
                              }
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/90"
                            >
                              Desfazer pagamento
                            </button>
                          </form>
                        ) : (
                          <>
                            {it.kind === "manual" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditManualChargeModal({
                                    open: true,
                                    manualChargeId: it.manualChargeId,
                                    description: it.label,
                                    observation: null,
                                    amountCents: it.amountCents,
                                    dueDay: it.dueDay,
                                    occurredAt: null,
                                    isCard: false,
                                  })
                                }
                                className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                              >
                                Editar
                              </button>
                            ) : null}

                            <button
                              type="button"
                              disabled={bankAccounts.length === 0}
                              onClick={() => setPayUtilityModal({ open: true, item: it })}
                              className={
                                bankAccounts.length === 0
                                  ? "rounded-lg px-3 py-2 text-xs font-medium text-zinc-400"
                                  : "rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/90"
                              }
                            >
                              Pagar
                            </button>

                            <button
                              type="button"
                              disabled={creditCards.length === 0}
                              onClick={() => setMoveToCardModal({ open: true, item: it })}
                              className={
                                creditCards.length === 0
                                  ? "rounded-lg px-3 py-2 text-xs font-medium text-zinc-400"
                                  : "rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                              }
                            >
                              Mover p/ cartão
                            </button>

                            {it.kind === "forecast" ? (
                              <form
                                action={async () => {
                                  const okConfirm = window.confirm("Remover esta conta do mês? (Ela deixa de aparecer neste mês)");
                                  if (!okConfirm) return;

                                  await runAction(
                                    skipForecastForMonth,
                                    (() => {
                                      const x = new FormData();
                                      x.set("forecastId", it.forecastId);
                                      x.set("month", month);
                                      return x;
                                    })(),
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                                >
                                  Remover do mês
                                </button>
                              </form>
                            ) : null}

                            {it.kind === "manual" ? (
                              <form
                                action={async (fd) => {
                                  const okConfirm = window.confirm("Remover este lançamento do mês? (Ele será apagado)");
                                  if (!okConfirm) return;

                                  fd.set("id", it.manualChargeId);
                                  await runAction(deleteManualCharge, fd);
                                }}
                              >
                                <button
                                  type="submit"
                                  className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                                >
                                  Remover do mês
                                </button>
                              </form>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Cartões (fatura)</div>
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
              <tr>
                <th className="px-4 py-3">Cartão</th>
                <th className="px-4 py-3">Valor da fatura</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cardGroups.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400" colSpan={4}>
                    Nenhum cartão ativo.
                  </td>
                </tr>
              ) : (
                cardGroups.map((g) => (
                  <tr key={g.creditCardId} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-4 py-3">{g.creditCardName}</td>
                    <td className="px-4 py-3 font-medium">{formatCents(g.totalCents)}</td>
                    <td className="px-4 py-3">
                      {g.paid ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          Pago{g.paidAmountCents !== null ? ` (${formatCents(g.paidAmountCents)})` : ""}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">Em aberto</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setManageCardModal({
                              open: true,
                              creditCardId: g.creditCardId,
                              creditCardName: g.creditCardName,
                              items: g.items,
                            })
                          }
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Gerenciar contas
                        </button>
                        <button
                          type="button"
                          disabled={g.paid || bankAccounts.length === 0}
                          onClick={() =>
                            setPayInvoiceModal({
                              open: true,
                              creditCardId: g.creditCardId,
                              creditCardName: g.creditCardName,
                              totalCents: g.totalCents,
                              unconfirmedForecastCount: g.unconfirmedForecastCount,
                            })
                          }
                          className={
                            g.paid || bankAccounts.length === 0
                              ? "rounded-lg px-3 py-2 text-xs font-medium text-zinc-400"
                              : "rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/90"
                          }
                        >
                          Pagar fatura
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Transferências (log)</div>
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {movementLog.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400" colSpan={5}>
                    Sem transferências neste mês.
                  </td>
                </tr>
              ) : (
                movementLog.map((m) => (
                  <tr key={m.id} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-4 py-3">{m.date}</td>
                    <td className="px-4 py-3">{m.fromBankAccountName}</td>
                    <td className="px-4 py-3">{m.toBankAccountName}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCents(m.amountCents)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditTransferModal({
                              open: true,
                              transferId: m.transferId,
                              transferAt: m.date,
                              fromBankAccountId: m.fromBankAccountId,
                              toBankAccountId: m.toBankAccountId,
                              amountCents: m.amountCents,
                            })
                          }
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const okConfirm = window.confirm("Apagar esta transferência? Isso ajusta os saldos das contas.");
                            if (!okConfirm) return;
                            const fd = new FormData();
                            fd.set("transferId", m.transferId);
                            await runAction(deleteBankTransfer, fd);
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {moveToCardModal.open && (
        <ModalShell title={`Mover para cartão — ${moveToCardModal.item.label}`} onClose={() => setMoveToCardModal({ open: false })}>
          <form
            action={async (fd) => {
              fd.set("month", month);
              const creditCardId = String(fd.get("creditCardId") ?? "");
              if (!creditCardId) return;

              if (moveToCardModal.item.kind === "forecast") {
                const occurredAt = String(fd.get("occurredAt") ?? "").trim();
                if (!occurredAt) return;

                const amount = String(fd.get("amount") ?? "").trim();
                if (!amount) return;

                const assignOk = await runAction(
                  assignForecastToCard,
                  (() => {
                    const x = new FormData();
                    x.set("forecastId", moveToCardModal.item.forecastId);
                    x.set("month", month);
                    x.set("creditCardId", creditCardId);
                    return x;
                  })(),
                );

                if (!assignOk) return;

                const conf = new FormData();
                conf.set("forecastId", moveToCardModal.item.forecastId);
                conf.set("month", month);
                conf.set("amount", amount);
                conf.set("confirmedAt", occurredAt);
                const ok = await runAction(confirmCardForecastAmount, conf);
                if (ok) setMoveToCardModal({ open: false });
                return;
              }

              const occurredAt = String(fd.get("occurredAt") ?? "");
              if (!occurredAt) return;

              const x = new FormData();
              x.set("manualChargeId", moveToCardModal.item.manualChargeId);
              x.set("month", month);
              x.set("creditCardId", creditCardId);
              x.set("occurredAt", occurredAt);

              const ok = await runAction(assignManualChargeToCard, x);

              if (ok) setMoveToCardModal({ open: false });
            }}
            className="grid gap-3"
          >
            <div className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm dark:border-white/10 dark:bg-white/10">
              <div className="flex items-center justify-between">
                <span className="text-zinc-700 dark:text-zinc-200">Valor</span>
                <span className="font-medium">{formatCents(moveToCardModal.item.amountCents)}</span>
              </div>
            </div>

            {moveToCardModal.item.kind === "forecast" ? (
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={(moveToCardModal.item.amountCents / 100).toFixed(2).replace(".", ",")}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>
            ) : null}

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Cartão</span>
              <select
                name="creditCardId"
                required
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                defaultValue={creditCards[0]?.id ?? ""}
              >
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            {moveToCardModal.item.kind === "manual" ? (
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="occurredAt"
                  defaultValue={isoDateInSelectedMonth(month, moveToCardModal.item.dueDay)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>
            ) : (
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="occurredAt"
                  defaultValue={isoDateInSelectedMonth(month, moveToCardModal.item.dueDay)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>
            )}



            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Confirmar
            </button>
          </form>
        </ModalShell>
      )}

      {payUtilityModal.open && (
        <ModalShell title={`Pagar — ${payUtilityModal.item.label}`} onClose={() => setPayUtilityModal({ open: false })}>
          <form
            action={async (fd) => {
              fd.set("month", month);
              const ok =
                payUtilityModal.item.kind === "forecast"
                  ? await runAction(
                      payUtilityForecast,
                      (() => {
                        const x = new FormData();
                        x.set("forecastId", payUtilityModal.item.forecastId);
                        x.set("month", month);
                        x.set("bankAccountId", String(fd.get("bankAccountId") ?? ""));
                        x.set("amount", String(fd.get("amount") ?? ""));
                        x.set("paidAt", String(fd.get("paidAt") ?? ""));
                        return x;
                      })(),
                    )
                  : await runAction(
                      payManualCharge,
                      (() => {
                        const x = new FormData();
                        x.set("manualChargeId", payUtilityModal.item.manualChargeId);
                        x.set("bankAccountId", String(fd.get("bankAccountId") ?? ""));
                        x.set("amount", String(fd.get("amount") ?? ""));
                        x.set("paidAt", String(fd.get("paidAt") ?? ""));
                        return x;
                      })(),
                    );
              if (ok) setPayUtilityModal({ open: false });
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={(payUtilityModal.item.amountCents / 100).toFixed(2).replace(".", ",")}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="paidAt"
                  defaultValue={isoDateInSelectedMonth(month, payUtilityModal.item.dueDay)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta bancária</span>
                <select
                  name="bankAccountId"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  defaultValue={bankAccounts[0]?.id ?? ""}
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bankAccountLabel(b)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Confirmar pagamento
            </button>
          </form>
        </ModalShell>
      )}

      {newChargeModal.open && (
        <ModalShell title="Novo lançamento" onClose={() => setNewChargeModal({ open: false })}>
          <form
            action={async (fd) => {
              const utilityAccountId = String(fd.get("utilityAccountId") ?? "");
              if (!utilityAccountId) {
                window.alert("Selecione uma conta (clique na opção da lista).");
                return;
              }

              const paymentKind = String(fd.get("paymentKind") ?? "bank");
              const info = bestForecastForUtility.get(utilityAccountId) ?? null;

              // If there is a usable forecast this month, use the forecast flow.
              if (info?.usable) {
                const forecastId = info.usable.forecastId;

                if (paymentKind === "bank") {
                  const x = new FormData();
                  x.set("forecastId", forecastId);
                  x.set("month", month);
                  x.set("bankAccountId", String(fd.get("bankAccountId") ?? ""));
                  x.set("amount", String(fd.get("amount") ?? ""));
                  x.set("paidAt", String(fd.get("paidAt") ?? ""));
                  const ok = await runAction(payUtilityForecast, x);
                  if (ok) setNewChargeModal({ open: false });
                  return;
                }

                const creditCardId = String(fd.get("creditCardId") ?? "");
                const occurredAt = String(fd.get("occurredAt") ?? "").trim();
                if (!creditCardId) {
                  window.alert("Selecione o cartão.");
                  return;
                }
                if (!occurredAt) {
                  window.alert("Preencha a data.");
                  return;
                }

                const assign = new FormData();
                assign.set("forecastId", forecastId);
                assign.set("month", month);
                assign.set("creditCardId", creditCardId);
                const assigned = await runAction(assignForecastToCard, assign);
                if (!assigned) return;

                const conf = new FormData();
                conf.set("forecastId", forecastId);
                conf.set("month", month);
                conf.set("amount", String(fd.get("amount") ?? ""));
                conf.set("confirmedAt", occurredAt);
                const ok = await runAction(confirmCardForecastAmount, conf);
                if (ok) setNewChargeModal({ open: false });
                return;
              }

              // No forecast for this month: create a charge linked to the utility account.
              const x = new FormData();
              x.set("month", month);
              x.set("utilityAccountId", utilityAccountId);
              x.set("amount", String(fd.get("amount") ?? ""));

              const observation = String(fd.get("observation") ?? "").trim();
              if (observation.length) x.set("observation", observation);

              if (paymentKind === "bank") {
                x.set("bankAccountId", String(fd.get("bankAccountId") ?? ""));
                x.set("paidAt", String(fd.get("paidAt") ?? ""));
              } else {
                const creditCardId = String(fd.get("creditCardId") ?? "");
                if (!creditCardId) {
                  window.alert("Selecione o cartão.");
                  return;
                }
                x.set("creditCardId", creditCardId);

                const occurredAt = String(fd.get("occurredAt") ?? "").trim();
                if (!occurredAt) {
                  window.alert("Preencha a data do lançamento.");
                  return;
                }
                x.set("occurredAt", occurredAt);

                const amountRaw = String(fd.get("amount") ?? "");
                const amountCents = parseMoneyToCents(amountRaw);
                if (amountCents === null || amountCents <= 0) {
                  window.alert("Preencha um valor válido (ex: 12,34). ");
                  return;
                }
              }

              const ok = await runAction(createManualCharge, x);
              if (ok) {
                setNewChargeModal({ open: false });
                if (paymentKind === "card" && !info?.usable) {
                  window.alert("Lançado no cartão. Veja em Cartões (fatura) → Gerenciar contas (mês selecionado).");
                }
              } else {
                window.alert("Não foi possível adicionar. Revise valor e data.");
              }
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta</span>
              <Combobox
                name="utilityAccountId"
                options={utilityAccounts.map((u) => {
                  const info = bestForecastForUtility.get(u.id);
                  const disabled = Boolean(info && !info.usable && (info.paid || info.onCard));
                  const disabledReason = disabled ? (info?.paid ? "Pago" : "No cartão") : undefined;
                  const hasForecast = Boolean(info?.usable || info?.paid || info?.onCard);
                  return {
                    id: u.id,
                    label: hasForecast ? u.name : `${u.name} (sem previsão)`,
                    disabled,
                    disabledReason,
                  };
                })}
                placeholder={utilityAccounts.length === 0 ? "Cadastre uma conta antes" : "Digite para buscar..."}
                disabled={utilityAccounts.length === 0}
                onSelectedIdChange={(id) => {
                  setNewChargeUtilityAccountId(id);
                  const usable = bestForecastForUtility.get(id)?.usable ?? null;
                  if (usable) setNewChargeAmount((usable.amountCents / 100).toFixed(2).replace(".", ","));
                }}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Forma</span>
              <select
                name="paymentKind"
                value={newChargePaymentKind}
                onChange={(e) => setNewChargePaymentKind(e.target.value === "card" ? "card" : "bank")}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
              >
                <option value="bank" disabled={bankAccounts.length === 0}>
                  Pagar na conta bancária
                </option>
                <option value="card" disabled={creditCards.length === 0}>
                  Lançar no cartão de crédito
                </option>
              </select>
            </label>

            {newChargePaymentKind === "card" ? (
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Cartão</span>
                <select
                  name="creditCardId"
                  required
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  defaultValue={creditCards[0]?.id ?? ""}
                >
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
              <input
                name="amount"
                inputMode="decimal"
                value={newChargeAmount}
                onChange={(e) => setNewChargeAmount(e.target.value)}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                placeholder="0,00"
                required
              />
            </label>

            {newChargePaymentKind === "bank" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data de pagamento</span>
                  <input
                    type="date"
                    name="paidAt"
                    defaultValue={isoDateInSelectedMonth(month, null)}
                    className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                    required
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta bancária</span>
                  <select
                    name="bankAccountId"
                    className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                    required
                    defaultValue={bankAccounts[0]?.id ?? ""}
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {bankAccountLabel(b)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {newChargePaymentKind === "card" ? (
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="occurredAt"
                  defaultValue={isoDateInSelectedMonth(month, null)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>
            ) : null}

            {newChargePaymentKind === "card" && !(bestForecastForUtility.get(newChargeUtilityAccountId)?.usable ?? null) ? (
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Observação (opcional)</span>
                <input
                  name="observation"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                />
              </label>
            ) : null}

            <button
              type="submit"
              disabled={!newChargeUtilityAccountId}
              className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:bg-black/40"
            >
              Adicionar
            </button>
          </form>
        </ModalShell>
      )}

      {newIncomeEntryModal.open ? (
        <ModalShell title="Nova entrada" onClose={() => setNewIncomeEntryModal({ open: false })}>
          <form
            action={async (fd) => {
              const incomeSourceId = String(fd.get("incomeSourceId") ?? "");
              if (!incomeSourceId) return;

              const ok = await runAction(createIncomeEntry, fd);
              if (ok) setNewIncomeEntryModal({ open: false });
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Fonte</span>
              <Combobox
                name="incomeSourceId"
                options={incomeSources.map((s) => ({ id: s.id, label: s.name }))}
                placeholder={incomeSources.length === 0 ? "Cadastre uma fonte antes" : "Digite para buscar..."}
                disabled={incomeSources.length === 0}
                onSelectedIdChange={(id) => setNewIncomeSourceId(id)}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Observação (opcional)</span>
              <input
                name="note"
                data-autofocus={newIncomeSourceId ? true : undefined}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="date"
                  defaultValue={isoDateInSelectedMonth(month, null)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>
            </div>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Confirmar entrada
            </button>
          </form>
        </ModalShell>
      ) : null}

      {manageCardModal.open && (
        <ModalShell
          title={`Gerenciar — ${manageCardModal.creditCardName}`}
          onClose={() => setManageCardModal({ open: false })}
          maxWidthClassName="max-w-3xl"
        >
          <div className="grid max-h-[75vh] gap-3 overflow-auto pr-1">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setAddCardChargeModal({
                    open: true,
                    creditCardId: manageCardModal.creditCardId,
                    creditCardName: manageCardModal.creditCardName,
                  })
                }
                className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/90"
              >
                Adicionar lançamento
              </button>
            </div>
            {manageCardModal.items.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Nenhuma conta na fatura deste mês.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-black/5 text-left text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                    <tr>
                      <th className="px-3 py-2">Conta</th>
                      <th className="px-3 py-2 w-16">Venc.</th>
                      <th className="px-3 py-2 w-28">Valor</th>
                      <th className="px-3 py-2 w-44"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manageCardModal.items.map((it) => (
                      <tr
                        key={it.kind === "forecast" ? it.forecastId : it.manualChargeId}
                        className={
                          (it.kind === "forecast" && it.confirmedAmountCents !== null) ||
                          (it.kind === "manual" && (it.confirmedAmountCents ?? null) !== null)
                            ? "border-t border-black/10 bg-emerald-500/10 dark:border-white/10"
                            : "border-t border-black/10 dark:border-white/10"
                        }
                      >
                        <td className="px-3 py-1.5 wrap-break-word">
                          <div className="flex flex-col">
                            <span className="font-medium">{it.label}</span>
                            {it.kind === "manual" && it.observation ? (
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">{it.observation}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          {it.kind === "forecast"
                            ? it.confirmedAt
                              ? dayMonthFromIsoDateString(it.confirmedAt) ?? "-"
                              : it.dueDay
                                ? String(it.dueDay)
                                : "-"
                            : it.occurredAt
                              ? dayMonthFromIsoDateString(it.occurredAt) ?? "-"
                              : it.dueDay
                                ? String(it.dueDay)
                                : "-"}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex flex-col">
                            <span className="font-medium">{formatCents(it.amountCents)}</span>
                            {it.kind === "forecast" && it.confirmedAmountCents !== null ? (
                              <span className="text-xs text-emerald-700 dark:text-emerald-300">Confirmado</span>
                            ) : it.kind === "manual" && (it.confirmedAmountCents ?? null) !== null ? (
                              <span className="text-xs text-emerald-700 dark:text-emerald-300">Confirmado</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-end gap-1">
                            {it.kind === "forecast" ? (
                              it.confirmedAmountCents === null ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmCardItemModal({
                                      open: true,
                                      forecastId: it.forecastId,
                                      label: it.label,
                                      amountCents: it.amountCents,
                                      originalAmountCents: it.originalAmountCents,
                                      dueDay: it.dueDay,
                                      confirmedAmountCents: it.confirmedAmountCents,
                                      confirmedAt: it.confirmedAt,
                                    })
                                  }
                                  className="h-7 rounded-md px-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                                >
                                  Editar
                                </button>
                              ) : null
                            ) : it.confirmedAt ? null : (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditManualChargeModal({
                                    open: true,
                                    manualChargeId: it.manualChargeId,
                                    description: it.label,
                                    observation: it.observation,
                                    amountCents: it.amountCents,
                                    dueDay: it.dueDay,
                                    occurredAt: it.occurredAt ?? null,
                                    isCard: true,
                                  })
                                }
                                className="h-7 rounded-md px-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                              >
                                Editar
                              </button>
                            )}

                            {it.kind === "forecast" && it.confirmedAmountCents !== null ? (
                              <form
                                action={async () => {
                                  const ok = await runAction(
                                    unconfirmCardForecastAmount,
                                    (() => {
                                      const x = new FormData();
                                      x.set("forecastId", it.forecastId);
                                      x.set("month", month);
                                      return x;
                                    })(),
                                  );
                                  if (!ok) return;

                                  setManageCardModal((cur) => {
                                    if (!cur.open) return cur;
                                    return {
                                      ...cur,
                                      items: cur.items.map((x) =>
                                        x.kind === "forecast" && x.forecastId === it.forecastId
                                          ? {
                                              ...x,
                                              amountCents: x.originalAmountCents,
                                              confirmedAmountCents: null,
                                              confirmedAt: null,
                                            }
                                          : x,
                                      ),
                                    };
                                  });
                                }}
                              >
                                <button
                                  type="submit"
                                  aria-label="Desfazer confirmação"
                                  title="Desfazer confirmação"
                                  className="grid h-7 w-7 place-items-center rounded-md text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                                >
                                  ↺
                                </button>
                              </form>
                            ) : it.kind === "manual" && it.confirmedAt ? (
                              <form
                                action={async () => {
                                  const ok = await runAction(
                                    unconfirmCardManualCharge,
                                    (() => {
                                      const x = new FormData();
                                      x.set("manualChargeId", it.manualChargeId);
                                      x.set("month", month);
                                      return x;
                                    })(),
                                  );
                                  if (!ok) return;

                                  setManageCardModal((cur) => {
                                    if (!cur.open) return cur;
                                    return {
                                      ...cur,
                                      items: cur.items.map((x) =>
                                        x.kind === "manual" && x.manualChargeId === it.manualChargeId
                                          ? {
                                              ...x,
                                              amountCents: x.originalAmountCents,
                                              confirmedAmountCents: null,
                                              confirmedAt: null,
                                            }
                                          : x,
                                      ),
                                    };
                                  });
                                }}
                              >
                                <button
                                  type="submit"
                                  aria-label="Desfazer confirmação"
                                  title="Desfazer confirmação"
                                  className="grid h-7 w-7 place-items-center rounded-md text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                                >
                                  ↺
                                </button>
                              </form>
                            ) : null}

                            <form
                              action={async () => {
                                const okConfirm = window.confirm("Voltar esta conta pra lista? (Remover do cartão)");
                                if (!okConfirm) return;

                                const ok =
                                  it.kind === "forecast"
                                    ? await runAction(
                                        unassignForecastFromCard,
                                        (() => {
                                          const x = new FormData();
                                          x.set("forecastId", it.forecastId);
                                          x.set("month", month);
                                          return x;
                                        })(),
                                      )
                                    : await runAction(
                                        unassignManualChargeFromCard,
                                        (() => {
                                          const x = new FormData();
                                          x.set("manualChargeId", it.manualChargeId);
                                          x.set("month", month);
                                          return x;
                                        })(),
                                      );
                                if (ok) {
                                  setManageCardModal({
                                    ...manageCardModal,
                                    items: manageCardModal.items.filter((x) =>
                                      it.kind === "forecast"
                                        ? x.kind !== "forecast" || x.forecastId !== it.forecastId
                                        : x.kind !== "manual" || x.manualChargeId !== it.manualChargeId,
                                    ),
                                  });
                                }
                              }}
                            >
                              <button
                                type="submit"
                                aria-label="Voltar pra lista"
                                title="Voltar pra lista"
                                className="grid h-7 w-7 place-items-center rounded-md text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                              >
                                ↩
                              </button>
                            </form>

                            {it.kind === "forecast" ? (
                              <form
                                action={async () => {
                                  const okConfirm = window.confirm("Remover esta conta do mês? (Ela deixa de aparecer neste mês)");
                                  if (!okConfirm) return;

                                  const ok = await runAction(
                                    skipForecastForMonth,
                                    (() => {
                                      const x = new FormData();
                                      x.set("forecastId", it.forecastId);
                                      x.set("month", month);
                                      return x;
                                    })(),
                                  );
                                  if (ok) setManageCardModal({ open: false });
                                }}
                              >
                                <button
                                  type="submit"
                                  aria-label="Remover do mês"
                                  title="Remover do mês"
                                  className="grid h-7 w-7 place-items-center rounded-md text-xs font-medium text-rose-700 hover:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                >
                                  ✕
                                </button>
                              </form>
                            ) : (
                              <form
                                action={async () => {
                                  const okConfirm = window.confirm("Remover este lançamento do mês? (Ele será apagado)");
                                  if (!okConfirm) return;

                                  await runAction(
                                    deleteManualCharge,
                                    (() => {
                                      const x = new FormData();
                                      x.set("id", it.manualChargeId);
                                      return x;
                                    })(),
                                  );
                                  setManageCardModal({
                                    ...manageCardModal,
                                    items: manageCardModal.items.filter((x) =>
                                      x.kind !== "manual" || x.manualChargeId !== it.manualChargeId,
                                    ),
                                  });
                                }}
                              >
                                <button
                                  type="submit"
                                  aria-label="Remover do mês"
                                  title="Remover do mês"
                                  className="grid h-7 w-7 place-items-center rounded-md text-xs font-medium text-rose-700 hover:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                >
                                  ✕
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {addCardChargeModal.open && (
        <ModalShell
          title={`Novo lançamento — ${addCardChargeModal.creditCardName}`}
          onClose={() => setAddCardChargeModal({ open: false })}
        >
          <form
            action={async (fd) => {
              const x = new FormData();
              x.set("month", month);
              x.set("creditCardId", addCardChargeModal.creditCardId);
              const utilityAccountId = String(fd.get("utilityAccountId") ?? "").trim();
              if (!utilityAccountId) {
                window.alert("Selecione uma conta (clique na opção da lista).");
                return;
              }
              x.set("utilityAccountId", utilityAccountId);

              const observation = String(fd.get("observation") ?? "").trim();
              if (observation.length) x.set("observation", observation);

              const amountRaw = String(fd.get("amount") ?? "");
              x.set("amount", amountRaw);

              const occurredAt = String(fd.get("occurredAt") ?? "").trim();
              if (!occurredAt) {
                window.alert("Preencha a data do lançamento.");
                return;
              }
              x.set("occurredAt", occurredAt);

              const amountCents = parseMoneyToCents(amountRaw);
              if (amountCents === null || amountCents <= 0) {
                window.alert("Preencha um valor válido (ex: 12,34). ");
                return;
              }

              const ok = await runAction(createManualCharge, x);
              if (ok) {
                setAddCardChargeModal({ open: false });
              } else {
                window.alert("Não foi possível adicionar. Verifique valor e data.");
              }
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta</span>
              <Combobox
                name="utilityAccountId"
                options={utilityAccounts.map((u) => ({ id: u.id, label: u.name }))}
                placeholder={utilityAccounts.length === 0 ? "Cadastre uma conta antes" : "Digite para buscar..."}
                disabled={utilityAccounts.length === 0}
                autoFocus
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="occurredAt"
                  defaultValue={isoDateInSelectedMonth(month, null)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  placeholder="0,00"
                  required
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Observação (opcional)</span>
              <input
                name="observation"
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
              />
            </label>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Adicionar
            </button>
          </form>
        </ModalShell>
      )}

      {editManualChargeModal.open && (
        <ModalShell title={`Editar — ${editManualChargeModal.description}`} onClose={() => setEditManualChargeModal({ open: false })}>
          <form
            action={async (fd) => {
              const x = new FormData();
              x.set("manualChargeId", editManualChargeModal.manualChargeId);
              x.set("amount", String(fd.get("amount") ?? ""));

              const observation = String(fd.get("observation") ?? "").trim();
              if (observation.length) x.set("observation", observation);
              else x.set("observation", "");

              const occurredAtRaw = String(fd.get("occurredAt") ?? "").trim();
              if (occurredAtRaw.length) x.set("occurredAt", occurredAtRaw);

              if (!editManualChargeModal.isCard) {
                const dueDayRaw = String(fd.get("dueDay") ?? "").trim();
                if (dueDayRaw.length) x.set("dueDay", dueDayRaw);
              }

              const ok = await runAction(updateManualCharge, x);
              if (ok) setEditManualChargeModal({ open: false });
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
              <input
                type="date"
                name="occurredAt"
                defaultValue={editManualChargeModal.occurredAt ?? ""}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required={editManualChargeModal.isCard}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!editManualChargeModal.isCard ? (
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dia (opcional)</span>
                  <input
                    name="dueDay"
                    inputMode="numeric"
                    defaultValue={editManualChargeModal.dueDay ? String(editManualChargeModal.dueDay) : ""}
                    className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                    placeholder="1-31"
                  />
                </label>
              ) : null}

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={(editManualChargeModal.amountCents / 100).toFixed(2).replace(".", ",")}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Observação (opcional)</span>
              <input
                name="observation"
                defaultValue={editManualChargeModal.observation ?? ""}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
              />
            </label>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Salvar
            </button>
          </form>
        </ModalShell>
      )}

      {editTransferModal.open && (
        <ModalShell title="Editar transferência" onClose={() => setEditTransferModal({ open: false })}>
          <form
            action={async (fd) => {
              const x = new FormData();
              x.set("transferId", editTransferModal.transferId);
              x.set("fromBankAccountId", String(fd.get("fromBankAccountId") ?? ""));
              x.set("toBankAccountId", String(fd.get("toBankAccountId") ?? ""));
              x.set("amount", String(fd.get("amount") ?? ""));
              x.set("transferAt", String(fd.get("transferAt") ?? ""));

              const ok = await runAction(updateBankTransfer, x);
              if (ok) setEditTransferModal({ open: false });
            }}
            className="grid gap-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="transferAt"
                  defaultValue={editTransferModal.transferAt}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  data-autofocus
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={(editTransferModal.amountCents / 100).toFixed(2).replace(".", ",")}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Origem</span>
                <select
                  name="fromBankAccountId"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  defaultValue={editTransferModal.fromBankAccountId}
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bankAccountLabel(b)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Destino</span>
                <select
                  name="toBankAccountId"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  defaultValue={editTransferModal.toBankAccountId}
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bankAccountLabel(b)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Salvar
            </button>
          </form>
        </ModalShell>
      )}

      {confirmCardItemModal.open && (
        <ModalShell title={`Confirmar valor — ${confirmCardItemModal.label}`} onClose={() => setConfirmCardItemModal({ open: false })}>
          <form
            action={async (fd) => {
              const amountRaw = String(fd.get("amount") ?? "");
              const confirmedAt = String(fd.get("confirmedAt") ?? "");
              const amountCents = parseMoneyToCents(amountRaw);
              if (amountCents === null) return;

              const x = new FormData();
              x.set("forecastId", confirmCardItemModal.forecastId);
              x.set("month", month);
              x.set("amount", amountRaw);
              x.set("confirmedAt", confirmedAt);
              const ok = await runAction(confirmCardForecastAmount, x);
              if (ok) {
                setManageCardModal((cur) => {
                  if (!cur.open) return cur;
                  return {
                    ...cur,
                    items: cur.items.map((it) =>
                      it.kind === "forecast" && it.forecastId === confirmCardItemModal.forecastId
                        ? {
                            ...it,
                            amountCents,
                            confirmedAmountCents: amountCents,
                            confirmedAt,
                          }
                        : it,
                    ),
                  };
                });
                setConfirmCardItemModal({ open: false });
              }
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={
                  (
                    ((confirmCardItemModal.confirmedAmountCents ?? confirmCardItemModal.amountCents) as number) / 100
                  )
                    .toFixed(2)
                    .replace(".", ",")
                }
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
              <input
                type="date"
                name="confirmedAt"
                defaultValue={confirmCardItemModal.confirmedAt ?? isoDateInSelectedMonth(month, confirmCardItemModal.dueDay)}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required
              />
            </label>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Confirmar
            </button>

            {confirmCardItemModal.confirmedAmountCents !== null ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await runAction(
                    unconfirmCardForecastAmount,
                    (() => {
                      const x = new FormData();
                      x.set("forecastId", confirmCardItemModal.forecastId);
                      x.set("month", month);
                      return x;
                    })(),
                  );

                  if (!ok) return;

                  setManageCardModal((cur) => {
                    if (!cur.open) return cur;
                    return {
                      ...cur,
                      items: cur.items.map((it) =>
                        it.kind === "forecast" && it.forecastId === confirmCardItemModal.forecastId
                          ? {
                              ...it,
                              amountCents: it.originalAmountCents,
                              confirmedAmountCents: null,
                              confirmedAt: null,
                            }
                          : it,
                      ),
                    };
                  });

                  setConfirmCardItemModal({ open: false });
                }}
                className="h-10 rounded-lg px-4 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                Desfazer confirmação
              </button>
            ) : null}
          </form>
        </ModalShell>
      )}



      {payInvoiceModal.open && (
        <ModalShell title={`Pagar fatura — ${payInvoiceModal.creditCardName}`} onClose={() => setPayInvoiceModal({ open: false })}>
          <form
            action={async (fd) => {
              fd.set("creditCardId", payInvoiceModal.creditCardId);
              fd.set("month", month);
              const ok = await runAction(payCreditCardInvoice, fd);
              if (ok) setPayInvoiceModal({ open: false });
            }}
            className="grid gap-3"
          >
            {payInvoiceModal.unconfirmedForecastCount > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                Existem {payInvoiceModal.unconfirmedForecastCount} conta(s) na fatura sem confirmação de valor. Confirme em “Gerenciar contas” antes de pagar.
              </div>
            ) : null}

            <div className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm dark:border-white/10 dark:bg-white/10">
              <div className="flex items-center justify-between">
                <span className="text-zinc-700 dark:text-zinc-200">Total calculado</span>
                <span className="font-medium">{formatCents(payInvoiceModal.totalCents)}</span>
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={payInvoiceModal.totalCents > 0 ? (payInvoiceModal.totalCents / 100).toFixed(2).replace(".", ",") : ""}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="paidAt"
                  defaultValue={isoDateInSelectedMonth(month, null)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta bancária</span>
                <select
                  name="bankAccountId"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  defaultValue={bankAccounts[0]?.id ?? ""}
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bankAccountLabel(b)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={payInvoiceModal.unconfirmedForecastCount > 0}
              className={
                payInvoiceModal.unconfirmedForecastCount > 0
                  ? "h-10 rounded-lg bg-black/40 px-4 text-sm font-medium text-white"
                  : "h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90"
              }
            >
              Confirmar pagamento
            </button>
          </form>
        </ModalShell>
      )}

      {receiveIncomeModal.open ? (
        <ModalShell title={`Receber — ${receiveIncomeModal.item.label}`} onClose={() => setReceiveIncomeModal({ open: false })}>
          <form
            action={async (fd) => {
              const x = new FormData();
              x.set("incomeForecastId", receiveIncomeModal.item.incomeForecastId);
              x.set("month", month);
              x.set("bankAccountId", String(fd.get("bankAccountId") ?? ""));
              x.set("amount", String(fd.get("amount") ?? ""));
              x.set("receivedAt", String(fd.get("receivedAt") ?? ""));
              const ok = await runAction(receiveIncomeForecast, x);
              if (ok) setReceiveIncomeModal({ open: false });
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
              <input
                name="amount"
                inputMode="decimal"
                data-autofocus
                defaultValue={(receiveIncomeModal.item.amountCents / 100).toFixed(2).replace(".", ",")}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
                <input
                  type="date"
                  name="receivedAt"
                  defaultValue={isoDateInSelectedMonth(month, receiveIncomeModal.item.dueDay)}
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta bancária</span>
                <select
                  name="bankAccountId"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  defaultValue={receiveIncomeModal.item.bankAccountId ?? ""}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bankAccountLabel(b)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Confirmar recebimento
            </button>
          </form>
        </ModalShell>
      ) : null}

      {transferModal.open && (
        <ModalShell title="Transferir entre contas" onClose={() => setTransferModal({ open: false })}>
          <form
            action={async (fd) => {
              const fromBankAccountId = String(fd.get("fromBankAccountId") ?? "");
              const toBankAccountId = String(fd.get("toBankAccountId") ?? "");
              const transferAt = String(fd.get("transferAt") ?? "").trim();
              const amountRaw = String(fd.get("amount") ?? "");
              const amountCents = parseMoneyToCents(amountRaw);

              if (fromBankAccountId && toBankAccountId && transferAt && amountCents !== null) {
                const duplicate = movementLog.some(
                  (m) =>
                    m.date === transferAt &&
                    m.fromBankAccountId === fromBankAccountId &&
                    m.toBankAccountId === toBankAccountId &&
                    m.amountCents === amountCents,
                );

                if (duplicate) {
                  const okConfirm = window.confirm(
                    "Já existe uma transferência igual (mesma data, origem, destino e valor). Quer lançar mesmo assim?",
                  );
                  if (!okConfirm) return;
                }
              }

              const ok = await runAction(createBankTransfer, fd);
              if (ok) setTransferModal({ open: false });
            }}
            className="grid gap-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Origem</span>
                <select
                  name="fromBankAccountId"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  defaultValue={bankAccounts[0]?.id ?? ""}
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bankAccountLabel(b)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Destino</span>
                <select
                  name="toBankAccountId"
                  className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                  required
                  defaultValue={bankAccounts[0]?.id ?? ""}
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bankAccountLabel(b)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
              <input
                name="amount"
                inputMode="decimal"
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
              <input
                type="date"
                name="transferAt"
                defaultValue={isoDateInSelectedMonth(month, null)}
                className="h-10 rounded-lg border border-black/10 bg-background px-3 text-sm dark:border-white/10"
                required
              />
            </label>

            <button type="submit" className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90">
              Confirmar transferência
            </button>
          </form>
        </ModalShell>
      )}
    </section>
  );
}
