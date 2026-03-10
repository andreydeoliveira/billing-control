"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Status = "ACTIVE" | "INACTIVE";

type BankAccountRow = {
  id: string;
  name: string;
  bank: string;
  status: Status;
  balanceCents: number;
};

type CreditCardRow = {
  id: string;
  name: string;
  status: Status;
};

type UtilityAccountRow = {
  id: string;
  name: string;
  observation: string | null;
  status: Status;
};

type ComboboxOption = {
  id: string;
  label: string;
};

type ForecastKind = "MONTHLY" | "ANNUAL" | "INSTALLMENTS" | "ONE_TIME";

type ForecastRow = {
  id: string;
  utilityAccountId: string;
  utilityAccountName: string;
  amountCents: number;
  dueDay: number | null;
  installmentsTotal: number | null;
  kind: ForecastKind;
  startsAt: string | null; // YYYY-MM-DD (for MONTHLY/ANNUAL it's stored as 1st day)
  oneTimeAt: string | null; // YYYY-MM-DD
  observation: string | null;
  status: Status;
};

type TabKey = "bank" | "card" | "utility" | "forecast";

type Actions = {
  createBankAccount: (formData: FormData) => Promise<boolean>;
  updateBankAccount: (formData: FormData) => Promise<boolean>;
  deleteBankAccount: (formData: FormData) => Promise<boolean>;

  createCreditCard: (formData: FormData) => Promise<boolean>;
  updateCreditCard: (formData: FormData) => Promise<boolean>;
  deleteCreditCard: (formData: FormData) => Promise<boolean>;

  createUtilityAccount: (formData: FormData) => Promise<boolean>;
  updateUtilityAccount: (formData: FormData) => Promise<boolean>;
  deleteUtilityAccount: (formData: FormData) => Promise<boolean>;

  createForecast: (formData: FormData) => Promise<boolean>;
  updateForecast: (formData: FormData) => Promise<boolean>;
  deleteForecast: (formData: FormData) => Promise<boolean>;
};

function formatMoneyBRLFromCents(cents: number): string {
  const abs = Math.abs(cents);
  const value = (abs / 100).toFixed(2);
  const withComma = value.replace(".", ",");
  return cents < 0 ? `-${withComma}` : withComma;
}

function formatKindLabel(kind: ForecastKind): string {
  if (kind === "MONTHLY") return "Mensal";
  if (kind === "ANNUAL") return "Anual";
  if (kind === "INSTALLMENTS") return "Parcelado";
  return "Uma vez";
}

function toYearMonth(dateIso: string | null): string {
  if (!dateIso) return "";
  return dateIso.slice(0, 7);
}

function getLocalTodayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getLocalYearMonth(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function getLocalDayOfMonth(): number {
  return new Date().getDate();
}

function formatWhenLabel(row: ForecastRow): string {
  if (row.kind === "ONE_TIME") return row.oneTimeAt ?? "—";

  if (row.kind === "INSTALLMENTS") {
    const parts: string[] = ["Parcelado"];
    if (row.installmentsTotal) parts.push(`1/${row.installmentsTotal}`);
    if (row.startsAt) parts.push(`início ${row.startsAt}`);
    if (row.dueDay) parts.push(`dia ${row.dueDay}`);
    return parts.join(" • ");
  }

  // MONTHLY / ANNUAL
  const parts: string[] = [];
  const ym = toYearMonth(row.startsAt);
  if (ym) parts.push(`a partir de ${ym}`);
  if (row.dueDay) parts.push(`dia ${row.dueDay}`);
  return parts.length ? parts.join(" • ") : "—";
}

function StatusBadge({ status }: { status: Status }) {
  const isActive = status === "ACTIVE";
  return (
    <span
      className={
        isActive
          ? "inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
          : "inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300"
      }
    >
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
}

function StatusSelect({ name, defaultValue }: { name: string; defaultValue?: Status }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? "ACTIVE"}
      className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
    >
      <option value="ACTIVE">Ativo</option>
      <option value="INACTIVE">Inativo</option>
    </select>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-black/5 px-3 py-2 text-sm font-medium text-foreground dark:bg-white/10"
          : "rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-black/5 hover:text-foreground dark:text-zinc-300 dark:hover:bg-white/10"
      }
    >
      {label}
    </button>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-xl rounded-2xl border border-black/10 bg-background p-5 shadow-sm dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">{title}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Preencha e salve.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

type Mode = "create" | "edit";

type ModalState =
  | { open: false }
  | {
      open: true;
      tab: TabKey;
      mode: Mode;
      initial:
        | { kind: "bank"; id?: string; name: string; bank: string; status: Status; balanceCents: number }
        | { kind: "card"; id?: string; name: string; status: Status }
        | { kind: "utility"; id?: string; name: string; observation: string; status: Status }
        | {
            kind: "forecast";
            id?: string;
            utilityAccountId: string;
            amountCents: number;
            dueDay: number | null;
            installmentsTotal: number | null;
            kindValue: ForecastKind;
            startsAt: string | null;
            oneTimeAt: string | null;
            observation: string;
            status: Status;
          };
    };

export function CadastrosClient({
  initialTab,
  bankAccounts,
  creditCards,
  utilityAccounts,
  forecasts,
  actions,
}: {
  initialTab: TabKey;
  bankAccounts: BankAccountRow[];
  creditCards: CreditCardRow[];
  utilityAccounts: UtilityAccountRow[];
  forecasts: ForecastRow[];
  actions: Actions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<
    | { open: false }
    | { open: true; kind: TabKey; id: string; label: string }
  >({ open: false });

  const tabFromUrl = useMemo(() => {
    const raw = searchParams.get("tab");
    if (raw === "bank" || raw === "card" || raw === "utility" || raw === "forecast") return raw;
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== tab) setTab(tabFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  const setTabAndUrl = (next: TabKey) => {
    setTab(next);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const title = useMemo(() => {
    if (tab === "bank") return "Conta bancária";
    if (tab === "card") return "Cartão de crédito";
    if (tab === "utility") return "Conta (luz, água, etc)";
    return "Previsões";
  }, [tab]);

  const openCreate = () => {
    if (tab === "bank") {
      setModal({
        open: true,
        tab,
        mode: "create",
        initial: { kind: "bank", name: "", bank: "", status: "ACTIVE", balanceCents: 0 },
      });
      return;
    }

    if (tab === "card") {
      setModal({
        open: true,
        tab,
        mode: "create",
        initial: { kind: "card", name: "", status: "ACTIVE" },
      });
      return;
    }

    if (tab === "utility") {
      setModal({
        open: true,
        tab,
        mode: "create",
        initial: { kind: "utility", name: "", observation: "", status: "ACTIVE" },
      });
      return;
    }

    setModal({
      open: true,
      tab: "forecast",
      mode: "create",
      initial: {
        kind: "forecast",
        utilityAccountId: "",
        amountCents: 0,
        dueDay: 10,
        installmentsTotal: 12,
        kindValue: "MONTHLY",
        startsAt: null,
        oneTimeAt: null,
        observation: "",
        status: "ACTIVE",
      },
    });
  };

  const openEditBank = (row: BankAccountRow) => {
    setModal({
      open: true,
      tab: "bank",
      mode: "edit",
      initial: { kind: "bank", id: row.id, name: row.name, bank: row.bank, status: row.status, balanceCents: row.balanceCents },
    });
  };


  const openEditCard = (row: CreditCardRow) => {
    setModal({
      open: true,
      tab: "card",
      mode: "edit",
      initial: { kind: "card", id: row.id, name: row.name, status: row.status },
    });
  };

  const openEditUtility = (row: UtilityAccountRow) => {
    setModal({
      open: true,
      tab: "utility",
      mode: "edit",
      initial: {
        kind: "utility",
        id: row.id,
        name: row.name,
        observation: row.observation ?? "",
        status: row.status,
      },
    });
  };

  const openEditForecast = (row: ForecastRow) => {
    setModal({
      open: true,
      tab: "forecast",
      mode: "edit",
      initial: {
        kind: "forecast",
        id: row.id,
        utilityAccountId: row.utilityAccountId,
        amountCents: row.amountCents,
        dueDay: row.dueDay,
        installmentsTotal: row.installmentsTotal,
        oneTimeAt: row.oneTimeAt,
        kindValue: row.kind,
        startsAt: row.startsAt,
        observation: row.observation ?? "",
        status: row.status,
      },
    });
  };

  const closeModal = () => setModal({ open: false });

  const closeConfirmDelete = () => setConfirmDelete({ open: false });

  const runSave = async (action: (formData: FormData) => Promise<boolean>, formData: FormData) => {
    const ok = await action(formData);
    if (!ok) return;
    closeModal();
    router.refresh();
  };

  const openConfirmDelete = (kind: TabKey, id: string, label: string) => {
    setConfirmDelete({ open: true, kind, id, label });
  };


  const confirmAndDelete = async () => {
    if (!confirmDelete.open) return;
    const fd = new FormData();
    fd.set("id", confirmDelete.id);

    const action =
      confirmDelete.kind === "bank"
        ? actions.deleteBankAccount
        : confirmDelete.kind === "card"
          ? actions.deleteCreditCard
          : confirmDelete.kind === "utility"
            ? actions.deleteUtilityAccount
            : actions.deleteForecast;

    const ok = await action(fd);
    if (!ok) return;
    closeConfirmDelete();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Cadastros</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Escolha o tipo de cadastro e gerencie em grid.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TabButton active={tab === "bank"} label="Conta bancária" onClick={() => setTabAndUrl("bank")} />
          <TabButton active={tab === "card"} label="Cartão" onClick={() => setTabAndUrl("card")} />
          <TabButton active={tab === "utility"} label="Conta" onClick={() => setTabAndUrl("utility")} />
          <TabButton active={tab === "forecast"} label="Previsões" onClick={() => setTabAndUrl("forecast")} />
        </div>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Inserir, editar e apagar.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="h-11 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
          >
            Novo
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          {tab === "bank" ? (
            <div className="space-y-6">
              <table className="w-full min-w-220 border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Nome</th>
                    <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Banco</th>
                    <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Saldo atual</th>
                    <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Situação</th>
                    <th className="border-b border-black/10 pb-3 dark:border-white/10 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {bankAccounts.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                        <div className="font-medium">{a.name}</div>
                      </td>
                      <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                        {a.bank}
                      </td>
                      <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                        {formatMoneyBRLFromCents(a.balanceCents)}
                      </td>
                      <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditBank(a)}
                            className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfirmDelete("bank", a.id, a.name)}
                            className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                          >
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === "card" ? (
            <table className="w-full min-w-140 border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Nome</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Situação</th>
                  <th className="border-b border-black/10 pb-3 dark:border-white/10 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {creditCards.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                      <div className="font-medium">{c.name}</div>
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCard(c)}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openConfirmDelete("card", c.id, c.name)}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "utility" ? (
            <table className="w-full min-w-180 border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Nome</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Observação</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Situação</th>
                  <th className="border-b border-black/10 pb-3 dark:border-white/10 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {utilityAccounts.map((u) => (
                  <tr key={u.id} className="align-top">
                    <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                      <div className="font-medium">{u.name}</div>
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      {u.observation ?? "—"}
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditUtility(u)}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openConfirmDelete("utility", u.id, u.name)}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "forecast" ? (
            <table className="w-full min-w-220 border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Conta</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Valor</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Tipo</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Quando</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Obs.</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Situação</th>
                  <th className="border-b border-black/10 pb-3 dark:border-white/10 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {forecasts.map((f) => (
                  <tr key={f.id} className="align-top">
                    <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                      <div className="font-medium">{f.utilityAccountName}</div>
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      {formatMoneyBRLFromCents(f.amountCents)}
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      {formatKindLabel(f.kind)}
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      {formatWhenLabel(f)}
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      {f.observation ?? "—"}
                    </td>
                    <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForecast(f)}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openConfirmDelete(
                              "forecast",
                              f.id,
                              `${f.utilityAccountName} • ${formatMoneyBRLFromCents(f.amountCents)} • ${formatKindLabel(f.kind)}`,
                            )
                          }
                          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>

      {modal.open ? (
        <ModalShell
          title={
            modal.mode === "create"
              ? `Novo - ${title}`
              : `Editar - ${title}`
          }
          onClose={closeModal}
        >
          {modal.initial.kind === "bank" ? (
            <form
              action={async (formData) => {
                const action =
                  modal.mode === "create"
                    ? actions.createBankAccount
                    : actions.updateBankAccount;
                await runSave(action, formData);
              }}
              className="grid gap-3"
            >
              {modal.mode === "edit" ? (
                <input type="hidden" name="id" value={modal.initial.id} />
              ) : null}

              <div className="grid grid-cols-3 gap-3">
                <input
                  name="name"
                  placeholder="Nome"
                  required
                  defaultValue={modal.initial.name}
                  className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                />
                <input
                  name="bank"
                  placeholder="Banco"
                  required
                  defaultValue={modal.initial.bank}
                  className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                />
                <input
                  name="balance"
                  placeholder="Saldo atual (ex: 0,00)"
                  required
                  defaultValue={formatMoneyBRLFromCents(modal.initial.balanceCents)}
                  className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatusSelect name="status" defaultValue={modal.initial.status} />
                <button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
                >
                  Salvar
                </button>
              </div>
            </form>
          ) : null}

          {modal.initial.kind === "card" ? (
            <form
              action={async (formData) => {
                const action =
                  modal.mode === "create"
                    ? actions.createCreditCard
                    : actions.updateCreditCard;
                await runSave(action, formData);
              }}
              className="grid gap-3"
            >
              {modal.mode === "edit" ? (
                <input type="hidden" name="id" value={modal.initial.id} />
              ) : null}

              <input
                name="name"
                placeholder="Nome"
                required
                defaultValue={modal.initial.name}
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
              />

              <div className="grid grid-cols-2 gap-3">
                <StatusSelect name="status" defaultValue={modal.initial.status} />
                <button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
                >
                  Salvar
                </button>
              </div>
            </form>
          ) : null}

          {modal.initial.kind === "utility" ? (
            <form
              action={async (formData) => {
                const action =
                  modal.mode === "create"
                    ? actions.createUtilityAccount
                    : actions.updateUtilityAccount;
                await runSave(action, formData);
              }}
              className="grid gap-3"
            >
              {modal.mode === "edit" ? (
                <input type="hidden" name="id" value={modal.initial.id} />
              ) : null}

              <input
                name="name"
                placeholder="Nome"
                required
                defaultValue={modal.initial.name}
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
              />

              <input
                name="observation"
                placeholder="Observação (opcional)"
                defaultValue={modal.initial.observation}
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
              />

              <div className="grid grid-cols-2 gap-3">
                <StatusSelect name="status" defaultValue={modal.initial.status} />
                <button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
                >
                  Salvar
                </button>
              </div>
            </form>
          ) : null}

          {modal.initial.kind === "forecast" ? (
            <ForecastForm
              mode={modal.mode}
              initial={modal.initial}
              utilityAccounts={utilityAccounts}
              action={modal.mode === "create" ? actions.createForecast : actions.updateForecast}
              onSuccess={() => {
                closeModal();
                router.refresh();
              }}
            />
          ) : null}
        </ModalShell>
      ) : null}

      {confirmDelete.open ? (
        <ModalShell title="Confirmar exclusão" onClose={closeConfirmDelete}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Tem certeza que deseja apagar este registro?
            </p>
            <div className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
              {confirmDelete.label}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeConfirmDelete}
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-4 text-sm font-medium text-foreground hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAndDelete}
                className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
              >
                Apagar
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function ForecastForm({
  mode,
  initial,
  utilityAccounts,
  action,
  onSuccess,
}: {
  mode: Mode;
  initial: Extract<NonNullable<ModalState>, { open: true }> ["initial"] extends infer T
    ? T extends { kind: "forecast" }
      ? T
      : never
    : never;
  utilityAccounts: UtilityAccountRow[];
  action: (formData: FormData) => Promise<boolean>;
  onSuccess: () => void;
}) {
  const [kindValue, setKindValue] = useState<ForecastKind>(initial.kindValue);
  const [selectedUtilityAccountId, setSelectedUtilityAccountId] = useState<string>(
    initial.utilityAccountId ?? "",
  );
  const hasUtilityAccounts = utilityAccounts.length > 0;
  const todayIso = useMemo(() => getLocalTodayISO(), []);
  const todayYm = useMemo(() => getLocalYearMonth(), []);
  const todayDay = useMemo(() => getLocalDayOfMonth(), []);
  const canSubmit = hasUtilityAccounts && selectedUtilityAccountId.length > 0;

  return (
    <form
      action={async (formData) => {
        const ok = await action(formData);
        if (!ok) return;
        onSuccess();
      }}
      className="grid gap-3"
    >
      {mode === "edit" ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta</span>
          <UtilityAccountCombobox
            name="utilityAccountId"
            options={utilityAccounts.map((u) => ({ id: u.id, label: u.name }))}
            defaultValue={initial.utilityAccountId}
            disabled={!hasUtilityAccounts}
            placeholder={hasUtilityAccounts ? "Digite para buscar..." : "Cadastre uma conta antes"}
            onSelectedIdChange={setSelectedUtilityAccountId}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
          <input
            name="amount"
            placeholder="0,00"
            required
            defaultValue={formatMoneyBRLFromCents(initial.amountCents)}
            className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tipo</span>
          <select
            name="kind"
            defaultValue={initial.kindValue}
            onChange={(e) => setKindValue(e.target.value as ForecastKind)}
            className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
          >
            <option value="MONTHLY">Mensal</option>
            <option value="ANNUAL">Anual</option>
            <option value="INSTALLMENTS">Parcelado</option>
            <option value="ONE_TIME">Uma vez</option>
          </select>
        </label>

        <div />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatusSelect name="status" defaultValue={initial.status} />
        <div />
      </div>

      {kindValue === "MONTHLY" || kindValue === "ANNUAL" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {kindValue === "MONTHLY" ? "Começa em (mês/ano)" : "Primeira cobrança (mês/ano)"}
            </span>
            <input
              type="month"
              name="startsAtMonth"
              required
              defaultValue={toYearMonth(initial.startsAt) || todayYm}
              className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dia da cobrança</span>
            <input
              type="number"
              min={1}
              max={31}
              name="dueDay"
              required
              defaultValue={initial.dueDay ?? todayDay}
              className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
            />
          </label>
        </div>
      ) : null}

      {kindValue === "INSTALLMENTS" ? (
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Total de parcelas</span>
            <input
              type="number"
              min={1}
              max={120}
              name="installmentsTotal"
              required
              defaultValue={initial.installmentsTotal ?? 12}
              className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Começa em</span>
            <input
              type="date"
              name="startsAtDate"
              required
              defaultValue={initial.startsAt ?? todayIso}
              className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dia da cobrança</span>
            <input
              type="number"
              min={1}
              max={31}
              name="dueDay"
              required
              defaultValue={initial.dueDay ?? todayDay}
              className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
            />
          </label>
        </div>
      ) : null}

      {kindValue === "ONE_TIME" ? (
        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data da cobrança</span>
          <input
            type="date"
            name="oneTimeAt"
            required
            defaultValue={initial.oneTimeAt ?? todayIso}
            className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
          />
        </label>
      ) : null}

      <label className="grid gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Observação (opcional)</span>
        <input
          name="observation"
          defaultValue={initial.observation}
          placeholder="Ex: reajuste previsto, contrato, etc"
          className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        Salvar
      </button>
    </form>
  );
}

function UtilityAccountCombobox({
  name,
  options,
  defaultValue,
  placeholder,
  disabled,
  onSelectedIdChange,
}: {
  name: string;
  options: ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onSelectedIdChange?: (id: string) => void;
}) {
  const initialSelectedId = useMemo(() => {
    if (defaultValue && options.some((o) => o.id === defaultValue)) return defaultValue;
    return "";
  }, [defaultValue, options]);

  const initialLabel = useMemo(() => {
    const found = options.find((o) => o.id === initialSelectedId);
    return found?.label ?? "";
  }, [options, initialSelectedId]);

  const [selectedId, setSelectedId] = useState<string>(initialSelectedId);
  const [query, setQuery] = useState<string>(initialLabel);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectOption = (opt: ComboboxOption) => {
    setSelectedId(opt.id);
    setQuery(opt.label);
    setOpen(false);
    onSelectedIdChange?.(opt.id);
    // Keep focus for quick submit
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);

          // User is typing: require explicit re-selection.
          const selected = options.find((o) => o.id === selectedId);
          if (selected && next.trim() !== selected.label) {
            setSelectedId("");
            onSelectedIdChange?.("");
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // If focus moved outside, close.
          const next = e.relatedTarget as Node | null;
          if (next && rootRef.current?.contains(next)) return;
          setOpen(false);
        }}
        className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 disabled:opacity-50 dark:border-white/10 dark:focus:ring-white/15"
      />

      {open && !disabled ? (
        <div
          tabIndex={-1}
          className="absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-black/10 bg-background p-1 shadow-sm dark:border-white/10"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
              Nenhuma conta encontrada
            </div>
          ) : (
            filtered.map((opt) => {
              const active = opt.id === selectedId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(opt)}
                  className={
                    active
                      ? "flex w-full items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-left text-sm font-medium text-foreground dark:bg-white/10"
                      : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                  }
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? <span className="text-xs text-zinc-500">Selecionado</span> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
