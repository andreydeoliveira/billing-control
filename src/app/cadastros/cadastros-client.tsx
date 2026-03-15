"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Combobox } from "@/components/combobox";

type Status = "ACTIVE" | "INACTIVE";

type BankAccountRow = {
  id: string;
  name: string;
  bank: string;
  status: Status;
  balanceCents: number;
  yieldMode: "NONE" | "CUMULATIVE" | "MONTHLY";
};

type BankYieldRecordRow = {
  id: string;
  recordedAt: string; // YYYY-MM-DD
  month: string; // YYYY-MM-DD (month start)
  mode: "NONE" | "CUMULATIVE" | "MONTHLY";
  valueCents: number;
  deltaCents: number;
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

type IncomeSourceRow = {
  id: string;
  name: string;
  observation: string | null;
  status: Status;
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

type IncomeForecastRow = {
  id: string;
  incomeSourceId: string;
  incomeSourceName: string;
  bankAccountId: string | null;
  bankAccountName: string | null;
  amountCents: number;
  dueDay: number | null;
  installmentsTotal: number | null;
  kind: ForecastKind;
  startsAt: string | null;
  oneTimeAt: string | null;
  observation: string | null;
  status: Status;
};

type TabKey = "bank" | "card" | "utility" | "income";
type UtilitySubTab = "accounts" | "forecasts";
type IncomeSubTab = "sources" | "forecasts";
type DeleteKind = TabKey | "forecast" | "incomeForecast";

type Actions = {
  createBankAccount: (formData: FormData) => Promise<boolean>;
  updateBankAccount: (formData: FormData) => Promise<boolean>;
  deleteBankAccount: (formData: FormData) => Promise<boolean>;

  recordBankYield: (formData: FormData) => Promise<boolean>;

  createCreditCard: (formData: FormData) => Promise<boolean>;
  updateCreditCard: (formData: FormData) => Promise<boolean>;
  deleteCreditCard: (formData: FormData) => Promise<boolean>;

  createUtilityAccount: (formData: FormData) => Promise<boolean>;
  updateUtilityAccount: (formData: FormData) => Promise<boolean>;
  deleteUtilityAccount: (formData: FormData) => Promise<boolean>;

  createForecast: (formData: FormData) => Promise<boolean>;
  updateForecast: (formData: FormData) => Promise<boolean>;
  deleteForecast: (formData: FormData) => Promise<boolean>;

  createIncomeSource: (formData: FormData) => Promise<boolean>;
  updateIncomeSource: (formData: FormData) => Promise<boolean>;
  deleteIncomeSource: (formData: FormData) => Promise<boolean>;

  createIncomeForecast: (formData: FormData) => Promise<boolean>;
  updateIncomeForecast: (formData: FormData) => Promise<boolean>;
  deleteIncomeForecast: (formData: FormData) => Promise<boolean>;
};

function formatYieldMode(mode: BankAccountRow["yieldMode"]): string {
  if (mode === "CUMULATIVE") return "Acumulado";
  if (mode === "MONTHLY") return "Mensal";
  return "—";
}

function formatSignedMoneyBRLFromCents(cents: number): string {
  const abs = Math.abs(cents);
  const prefix = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${prefix}${formatMoneyBRLFromCents(abs)}`;
}

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

function formatWhenLabel(row: {
  kind: ForecastKind;
  oneTimeAt: string | null;
  installmentsTotal: number | null;
  startsAt: string | null;
  dueDay: number | null;
}): string {
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

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
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

function SubTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
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

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-xl rounded-2xl border border-black/10 bg-background p-5 shadow-sm dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">{title}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Preencha e salve.</div>
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

type Mode = "create" | "edit";

type ModalState =
  | { open: false }
  | {
      open: true;
      tab: TabKey | "forecast" | "incomeForecast";
      mode: Mode;
      initial:
        | { kind: "bank"; id?: string; name: string; bank: string; status: Status; balanceCents: number; yieldMode: BankAccountRow["yieldMode"] }
        | { kind: "card"; id?: string; name: string; status: Status }
        | { kind: "utility"; id?: string; name: string; observation: string; status: Status }
        | { kind: "income"; id?: string; name: string; observation: string; status: Status }
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
          }
        | {
            kind: "incomeForecast";
            id?: string;
            incomeSourceId: string;
            bankAccountId: string;
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
  bankYieldRecordsByAccountId,
  creditCards,
  utilityAccounts,
  incomeSources,
  incomeForecasts,
  forecasts,
  actions,
}: {
  initialTab: TabKey;
  bankAccounts: BankAccountRow[];
  bankYieldRecordsByAccountId: Record<string, BankYieldRecordRow[]>;
  creditCards: CreditCardRow[];
  utilityAccounts: UtilityAccountRow[];
  incomeSources: IncomeSourceRow[];
  incomeForecasts: IncomeForecastRow[];
  forecasts: ForecastRow[];
  actions: Actions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [utilitySubTab, setUtilitySubTab] = useState<UtilitySubTab>("accounts");
  const [incomeSubTab, setIncomeSubTab] = useState<IncomeSubTab>("sources");
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [yieldModal, setYieldModal] = useState<
    | { open: false }
    | {
        open: true;
        bankAccountId: string;
        bankAccountName: string;
        yieldMode: BankAccountRow["yieldMode"];
      }
  >({ open: false });
  const [yieldHistoryModal, setYieldHistoryModal] = useState<
    | { open: false }
    | { open: true; bankAccountId: string; bankAccountName: string }
  >({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<
    | { open: false }
    | { open: true; kind: DeleteKind; id: string; label: string }
  >({ open: false });

  const [bankFormYieldMode, setBankFormYieldMode] = useState<BankAccountRow["yieldMode"]>("NONE");
  const [bankInitialYieldMode, setBankInitialYieldMode] = useState<BankAccountRow["yieldMode"]>("NONE");

  const tabFromUrl = useMemo(() => {
    const raw = searchParams.get("tab");
    if (raw === "bank" || raw === "card" || raw === "utility" || raw === "income") return raw;
    return null;
  }, [searchParams]);

  const subFromUrl = useMemo(() => {
    const raw = searchParams.get("sub");
    if (raw === "accounts" || raw === "forecasts" || raw === "sources") return raw;
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== tab) setTab(tabFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  useEffect(() => {
    if (!modal.open) return;
    if (modal.initial.kind !== "bank") return;
    setBankFormYieldMode(modal.initial.yieldMode);
    setBankInitialYieldMode(modal.initial.yieldMode);
  }, [modal]);

  useEffect(() => {
    if (!subFromUrl) return;
    if (tab === "utility") {
      if (subFromUrl === "accounts" || subFromUrl === "forecasts") setUtilitySubTab(subFromUrl);
      return;
    }
    if (tab === "income") {
      if (subFromUrl === "sources" || subFromUrl === "forecasts") setIncomeSubTab(subFromUrl);
    }
  }, [subFromUrl, tab]);

  const setTabAndUrl = (next: TabKey) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);

    // Reset nested subtabs when switching main tab.
    if (next === "utility") params.set("sub", "accounts");
    else if (next === "income") params.set("sub", "sources");
    else params.delete("sub");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setSubAndUrl = (sub: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.set("sub", sub);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const title = useMemo(() => {
    if (tab === "bank") return "Conta bancária";
    if (tab === "card") return "Cartão de crédito";
    if (tab === "utility") return utilitySubTab === "forecasts" ? "Conta > Previsões" : "Conta";
    return incomeSubTab === "forecasts" ? "Entrada > Previsões" : "Entrada";
  }, [tab]);

  const activeBankAccounts = useMemo(() => bankAccounts.filter((b) => b.status === "ACTIVE"), [bankAccounts]);
  const hasActiveBankAccounts = activeBankAccounts.length > 0;

  const forecastsByUtilityAccountId = useMemo(() => {
    const map = new Map<string, ForecastRow[]>();
    for (const f of forecasts) {
      const list = map.get(f.utilityAccountId) ?? [];
      list.push(f);
      map.set(f.utilityAccountId, list);
    }
    return map;
  }, [forecasts]);

  const incomeForecastsBySourceId = useMemo(() => {
    const map = new Map<string, IncomeForecastRow[]>();
    for (const f of incomeForecasts) {
      const list = map.get(f.incomeSourceId) ?? [];
      list.push(f);
      map.set(f.incomeSourceId, list);
    }
    return map;
  }, [incomeForecasts]);

  const openCreate = () => {
    if (tab === "bank") {
      setModal({
        open: true,
        tab,
        mode: "create",
        initial: { kind: "bank", name: "", bank: "", status: "ACTIVE", balanceCents: 0, yieldMode: "NONE" },
      });
      return;
    }
    if (tab === "card") {
      setModal({ open: true, tab, mode: "create", initial: { kind: "card", name: "", status: "ACTIVE" } });
      return;
    }
    if (tab === "utility") {
      if (utilitySubTab === "forecasts") {
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
        return;
      }

      setModal({ open: true, tab, mode: "create", initial: { kind: "utility", name: "", observation: "", status: "ACTIVE" } });
      return;
    }

    // income
    if (incomeSubTab === "forecasts") {
      setModal({
        open: true,
        tab: "incomeForecast",
        mode: "create",
        initial: {
          kind: "incomeForecast",
          incomeSourceId: "",
          bankAccountId: "",
          amountCents: 0,
          dueDay: 5,
          installmentsTotal: 12,
          kindValue: "MONTHLY",
          startsAt: null,
          oneTimeAt: null,
          observation: "",
          status: "ACTIVE",
        },
      });
      return;
    }

    setModal({ open: true, tab, mode: "create", initial: { kind: "income", name: "", observation: "", status: "ACTIVE" } });
  };

  const openCreateForecastForUtility = (utilityAccountId: string) => {
    setModal({
      open: true,
      tab: "forecast",
      mode: "create",
      initial: {
        kind: "forecast",
        utilityAccountId,
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

  const openCreateIncomeForecastForSource = (incomeSourceId: string) => {
    setModal({
      open: true,
      tab: "incomeForecast",
      mode: "create",
      initial: {
        kind: "incomeForecast",
        incomeSourceId,
        bankAccountId: "",
        amountCents: 0,
        dueDay: 5,
        installmentsTotal: 12,
        kindValue: "MONTHLY",
        startsAt: null,
        oneTimeAt: null,
        observation: "",
        status: "ACTIVE",
      },
    });
  };

  const openEditBank = (row: BankAccountRow) =>
    setModal({
      open: true,
      tab: "bank",
      mode: "edit",
      initial: { kind: "bank", id: row.id, name: row.name, bank: row.bank, status: row.status, balanceCents: row.balanceCents, yieldMode: row.yieldMode },
    });

  const openEditCard = (row: CreditCardRow) =>
    setModal({ open: true, tab: "card", mode: "edit", initial: { kind: "card", id: row.id, name: row.name, status: row.status } });

  const openEditUtility = (row: UtilityAccountRow) =>
    setModal({
      open: true,
      tab: "utility",
      mode: "edit",
      initial: { kind: "utility", id: row.id, name: row.name, observation: row.observation ?? "", status: row.status },
    });

  const openEditIncomeSource = (row: IncomeSourceRow) =>
    setModal({
      open: true,
      tab: "income",
      mode: "edit",
      initial: { kind: "income", id: row.id, name: row.name, observation: row.observation ?? "", status: row.status },
    });

  const openEditForecast = (row: ForecastRow) =>
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
        kindValue: row.kind,
        startsAt: row.startsAt,
        oneTimeAt: row.oneTimeAt,
        observation: row.observation ?? "",
        status: row.status,
      },
    });

  const openEditIncomeForecast = (row: IncomeForecastRow) =>
    setModal({
      open: true,
      tab: "incomeForecast",
      mode: "edit",
      initial: {
        kind: "incomeForecast",
        id: row.id,
        incomeSourceId: row.incomeSourceId,
        bankAccountId: row.bankAccountId ?? "",
        amountCents: row.amountCents,
        dueDay: row.dueDay,
        installmentsTotal: row.installmentsTotal,
        kindValue: row.kind,
        startsAt: row.startsAt,
        oneTimeAt: row.oneTimeAt,
        observation: row.observation ?? "",
        status: row.status,
      },
    });

  const closeModal = () => setModal({ open: false });
  const closeConfirmDelete = () => setConfirmDelete({ open: false });
  const closeYieldModal = () => setYieldModal({ open: false });
  const closeYieldHistoryModal = () => setYieldHistoryModal({ open: false });

  const runSave = async (action: (formData: FormData) => Promise<boolean>, formData: FormData) => {
    const ok = await action(formData);
    if (!ok) return;
    closeModal();
    router.refresh();
  };

  const openConfirmDelete = (kind: DeleteKind, id: string, label: string) => setConfirmDelete({ open: true, kind, id, label });

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
            : confirmDelete.kind === "income"
              ? actions.deleteIncomeSource
              : confirmDelete.kind === "incomeForecast"
                ? actions.deleteIncomeForecast
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
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Escolha o tipo de cadastro e gerencie em grid.</p>
        </div>

        <div className="flex items-center gap-2">
          <TabButton active={tab === "bank"} label="Conta bancária" onClick={() => setTabAndUrl("bank")} />
          <TabButton active={tab === "card"} label="Cartão" onClick={() => setTabAndUrl("card")} />
          <TabButton active={tab === "utility"} label="Conta" onClick={() => setTabAndUrl("utility")} />
          <TabButton active={tab === "income"} label="Entradas" onClick={() => setTabAndUrl("income")} />
        </div>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Inserir, editar e apagar.</p>
          </div>

          <button type="button" onClick={openCreate} className="h-11 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">
            Novo
          </button>
        </div>

        {tab === "utility" ? (
          <div className="mt-4 flex items-center gap-2">
            <SubTabButton
              active={utilitySubTab === "accounts"}
              label="Conta"
              onClick={() => {
                setUtilitySubTab("accounts");
                setSubAndUrl("accounts");
              }}
            />
            <SubTabButton
              active={utilitySubTab === "forecasts"}
              label="Previsões"
              onClick={() => {
                setUtilitySubTab("forecasts");
                setSubAndUrl("forecasts");
              }}
            />
          </div>
        ) : null}

        {tab === "income" ? (
          <div className="mt-4 flex items-center gap-2">
            <SubTabButton
              active={incomeSubTab === "sources"}
              label="Entrada"
              onClick={() => {
                setIncomeSubTab("sources");
                setSubAndUrl("sources");
              }}
            />
            <SubTabButton
              active={incomeSubTab === "forecasts"}
              label="Previsões"
              onClick={() => {
                setIncomeSubTab("forecasts");
                setSubAndUrl("forecasts");
              }}
            />
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          {tab === "bank" ? (
            <table className="w-full min-w-220 border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Nome</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Banco</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Rendimento</th>
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
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{a.bank}</td>
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatYieldMode(a.yieldMode)}</td>
                    <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatMoneyBRLFromCents(a.balanceCents)}</td>
                    <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                      <div className="flex justify-end gap-2">
                        {a.yieldMode !== "NONE" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setYieldModal({
                                open: true,
                                bankAccountId: a.id,
                                bankAccountName: a.name,
                                yieldMode: a.yieldMode,
                              })
                            }
                            className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                          >
                            Registrar rendimento
                          </button>
                        ) : null}
                        {a.yieldMode !== "NONE" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setYieldHistoryModal({
                                open: true,
                                bankAccountId: a.id,
                                bankAccountName: a.name,
                              })
                            }
                            className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                          >
                            Histórico
                          </button>
                        ) : null}
                        <button type="button" onClick={() => openEditBank(a)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                          Editar
                        </button>
                        <button type="button" onClick={() => openConfirmDelete("bank", a.id, a.name)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "card" ? (
            <table className="w-full min-w-160 border-separate border-spacing-0">
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
                        <button type="button" onClick={() => openEditCard(c)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                          Editar
                        </button>
                        <button type="button" onClick={() => openConfirmDelete("card", c.id, c.name)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
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
            <table className="w-full min-w-220 border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Nome</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Observação</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Situação</th>
                  <th className="border-b border-black/10 pb-3 dark:border-white/10 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {utilitySubTab === "accounts"
                  ? utilityAccounts.map((u) => (
                      <tr key={u.id} className="align-top">
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <div className="font-medium">{u.name}</div>
                        </td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{u.observation ?? "—"}</td>
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openEditUtility(u)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                              Editar
                            </button>
                            <button type="button" onClick={() => openConfirmDelete("utility", u.id, u.name)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                              Apagar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : forecasts.map((f) => (
                      <tr key={f.id} className="align-top">
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <div className="font-medium">{f.utilityAccountName}</div>
                        </td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatMoneyBRLFromCents(f.amountCents)}</td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatKindLabel(f.kind)}</td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatWhenLabel(f)}</td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{f.observation ?? "—"}</td>
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <StatusBadge status={f.status} />
                        </td>
                        <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openEditForecast(f)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => openConfirmDelete("forecast", f.id, `${f.utilityAccountName} • ${formatMoneyBRLFromCents(f.amountCents)} • ${formatKindLabel(f.kind)}`)}
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

          {tab === "income" ? (
            <table className="w-full min-w-220 border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Nome</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Observação</th>
                  <th className="border-b border-black/10 pb-3 pr-4 dark:border-white/10">Situação</th>
                  <th className="border-b border-black/10 pb-3 dark:border-white/10 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {incomeSubTab === "sources"
                  ? incomeSources.map((s) => (
                      <tr key={s.id} className="align-top">
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <div className="font-medium">{s.name}</div>
                        </td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{s.observation ?? "—"}</td>
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openEditIncomeSource(s)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                              Editar
                            </button>
                            <button type="button" onClick={() => openConfirmDelete("income", s.id, s.name)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                              Apagar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : incomeForecasts.map((f) => (
                      <tr key={f.id} className="align-top">
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <div className="font-medium">{f.incomeSourceName}</div>
                        </td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{f.bankAccountName ?? "—"}</td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatMoneyBRLFromCents(f.amountCents)}</td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatKindLabel(f.kind)}</td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatWhenLabel({ kind: f.kind, oneTimeAt: f.oneTimeAt, installmentsTotal: f.installmentsTotal, startsAt: f.startsAt, dueDay: f.dueDay })}</td>
                        <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{f.observation ?? "—"}</td>
                        <td className="border-b border-black/5 py-3 pr-4 dark:border-white/5">
                          <StatusBadge status={f.status} />
                        </td>
                        <td className="border-b border-black/5 py-3 text-right dark:border-white/5">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openEditIncomeForecast(f)} className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10">
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => openConfirmDelete("incomeForecast", f.id, `${f.incomeSourceName} • ${formatMoneyBRLFromCents(f.amountCents)} • ${formatKindLabel(f.kind)}`)}
                              className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                            >
                              Apagar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          ) : null}
        </div>
      </section>

      {modal.open ? (
        <ModalShell title={modal.mode === "create" ? `Novo - ${title}` : `Editar - ${title}`} onClose={closeModal}>
          {modal.initial.kind === "bank" ? (
            <form
              action={async (formData) => {
                const action = modal.mode === "create" ? actions.createBankAccount : actions.updateBankAccount;
                await runSave(action, formData);
              }}
              className="grid gap-3"
            >
              {modal.mode === "edit" ? <input type="hidden" name="id" value={modal.initial.id} /> : null}

              <div className="grid grid-cols-3 gap-3">
                <input
                  name="name"
                  placeholder="Nome"
                  required
                  data-autofocus
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

              <label className="grid gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Rendimento</span>
                <select
                  name="yieldMode"
                  value={bankFormYieldMode}
                  onChange={(e) => setBankFormYieldMode(e.target.value as BankAccountRow["yieldMode"])}
                  className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                >
                  <option value="NONE">Sem rendimento</option>
                  <option value="CUMULATIVE">Acumulado (total)</option>
                  <option value="MONTHLY">Mensal (valor do mês)</option>
                </select>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Acumulado: você registra o total acumulado e o saldo recebe só a diferença. Mensal: cada registro soma direto no saldo (valor do rendimento do mês).
                </span>
              </label>

              {(modal.mode === "create" && bankFormYieldMode === "CUMULATIVE") ||
              (modal.mode === "edit" && bankFormYieldMode === "CUMULATIVE" && bankInitialYieldMode !== "CUMULATIVE") ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Acumulado inicial</span>
                    <input
                      name="initialYield"
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                      required
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Define a base do acumulado e não altera o saldo.</span>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data do rendimento inicial</span>
                    <input
                      type="date"
                      name="initialYieldRecordedAt"
                      defaultValue={getLocalTodayISO()}
                      className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                      required
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <StatusSelect name="status" defaultValue={modal.initial.status} />
                <button type="submit" className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">
                  Salvar
                </button>
              </div>
            </form>
          ) : null}

          {modal.initial.kind === "card" ? (
            <form
              action={async (formData) => {
                const action = modal.mode === "create" ? actions.createCreditCard : actions.updateCreditCard;
                await runSave(action, formData);
              }}
              className="grid gap-3"
            >
              {modal.mode === "edit" ? <input type="hidden" name="id" value={modal.initial.id} /> : null}
              <input
                name="name"
                placeholder="Nome"
                required
                data-autofocus
                defaultValue={modal.initial.name}
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
              />
              <div className="grid grid-cols-2 gap-3">
                <StatusSelect name="status" defaultValue={modal.initial.status} />
                <button type="submit" className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">
                  Salvar
                </button>
              </div>
            </form>
          ) : null}

          {modal.initial.kind === "utility" ? (
            <form
              action={async (formData) => {
                const action = modal.mode === "create" ? actions.createUtilityAccount : actions.updateUtilityAccount;
                await runSave(action, formData);
              }}
              className="grid gap-3"
            >
              {modal.mode === "edit" ? <input type="hidden" name="id" value={modal.initial.id} /> : null}
              <input
                name="name"
                placeholder="Nome"
                required
                data-autofocus
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
                <button type="submit" className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">
                  Salvar
                </button>
              </div>
            </form>
          ) : null}

          {modal.initial.kind === "income" ? (
            <form
              action={async (formData) => {
                const action = modal.mode === "create" ? actions.createIncomeSource : actions.updateIncomeSource;
                await runSave(action, formData);
              }}
              className="grid gap-3"
            >
              {modal.mode === "edit" ? <input type="hidden" name="id" value={modal.initial.id} /> : null}

              <div className="grid grid-cols-2 gap-3">
                <input
                  name="name"
                  placeholder="Nome"
                  required
                  data-autofocus
                  defaultValue={modal.initial.name}
                  className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                />
                <StatusSelect name="status" defaultValue={modal.initial.status} />
              </div>

              <input
                name="observation"
                placeholder="Observação (opcional)"
                defaultValue={modal.initial.observation}
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
              />

              <button type="submit" className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">
                Salvar
              </button>
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

          {modal.initial.kind === "incomeForecast" ? (
            <IncomeForecastForm
              mode={modal.mode}
              initial={modal.initial}
              incomeSources={incomeSources}
              bankAccounts={activeBankAccounts}
              action={modal.mode === "create" ? actions.createIncomeForecast : actions.updateIncomeForecast}
              onSuccess={() => {
                closeModal();
                router.refresh();
              }}
            />
          ) : null}
        </ModalShell>
      ) : null}

      {yieldModal.open ? (
        <ModalShell title={`Registrar rendimento — ${yieldModal.bankAccountName}`} onClose={closeYieldModal}>
          <form
            action={async (formData) => {
              formData.set("bankAccountId", yieldModal.bankAccountId);
              const ok = await actions.recordBankYield(formData);
              if (!ok) return;
              closeYieldModal();
              router.refresh();
            }}
            className="grid gap-3"
          >
            <div className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">
              {yieldModal.yieldMode === "CUMULATIVE" ? (
                <div>
                  Informe o <span className="font-medium">total acumulado</span>. O sistema soma no saldo somente a diferença para o último registro.
                </div>
              ) : (
                <div>
                  Informe o <span className="font-medium">valor do rendimento</span> (incremental). Cada registro soma direto no saldo.
                </div>
              )}
              {yieldModal.yieldMode === "CUMULATIVE" ? (
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">O primeiro registro vira base e não altera o saldo.</div>
              ) : null}
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
              <input
                name="value"
                inputMode="decimal"
                data-autofocus
                placeholder="0,00"
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data</span>
              <input
                type="date"
                name="recordedAt"
                defaultValue={getLocalTodayISO()}
                className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
                required
              />
            </label>

            <button type="submit" className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">
              Registrar
            </button>
          </form>
        </ModalShell>
      ) : null}

      {yieldHistoryModal.open ? (
        <ModalShell title={`Histórico — ${yieldHistoryModal.bankAccountName}`} onClose={closeYieldHistoryModal}>
          {(() => {
            const records = bankYieldRecordsByAccountId[yieldHistoryModal.bankAccountId] ?? [];
            if (records.length === 0) {
              return <div className="text-sm text-zinc-600 dark:text-zinc-400">Sem registros de rendimento.</div>;
            }

            return (
              <div className="grid gap-3">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Mostrando os últimos {records.length} registros.</div>
                <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-black/10 dark:border-white/10">
                  <table className="w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 bg-background">
                      <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        <th className="border-b border-black/10 bg-background pb-3 pr-4 pl-3 pt-3 dark:border-white/10">Data</th>
                        <th className="border-b border-black/10 bg-background pb-3 pr-4 pt-3 dark:border-white/10">Mês</th>
                        <th className="border-b border-black/10 bg-background pb-3 pr-4 pt-3 dark:border-white/10">Modo</th>
                        <th className="border-b border-black/10 bg-background pb-3 pr-4 pt-3 dark:border-white/10 text-right">Valor</th>
                        <th className="border-b border-black/10 bg-background pb-3 pr-3 pt-3 dark:border-white/10 text-right">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {records.map((r) => (
                        <tr key={r.id} className="align-top">
                          <td className="border-b border-black/5 py-3 pr-4 pl-3 dark:border-white/5">{r.recordedAt}</td>
                          <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{r.month}</td>
                          <td className="border-b border-black/5 py-3 pr-4 text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatYieldMode(r.mode)}</td>
                          <td className="border-b border-black/5 py-3 pr-4 text-right text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatMoneyBRLFromCents(r.valueCents)}</td>
                          <td className="border-b border-black/5 py-3 pr-3 text-right font-medium text-zinc-700 dark:border-white/5 dark:text-zinc-300">{formatSignedMoneyBRLFromCents(r.deltaCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </ModalShell>
      ) : null}

      {confirmDelete.open ? (
        <ModalShell title="Confirmar exclusão" onClose={closeConfirmDelete}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Tem certeza que deseja apagar este registro?</p>
            <div className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">{confirmDelete.label}</div>
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
  initial: Extract<NonNullable<ModalState>, { open: true }>["initial"] extends infer T
    ? T extends { kind: "forecast" }
      ? T
      : never
    : never;
  utilityAccounts: UtilityAccountRow[];
  action: (formData: FormData) => Promise<boolean>;
  onSuccess: () => void;
}) {
  const [kindValue, setKindValue] = useState<ForecastKind>(initial.kindValue);
  const [selectedUtilityAccountId, setSelectedUtilityAccountId] = useState<string>(initial.utilityAccountId ?? "");
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
          <Combobox
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
            data-autofocus
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

function IncomeForecastForm({
  mode,
  initial,
  incomeSources,
  bankAccounts,
  action,
  onSuccess,
}: {
  mode: Mode;
  initial: Extract<NonNullable<ModalState>, { open: true }>["initial"] extends infer T
    ? T extends { kind: "incomeForecast" }
      ? T
      : never
    : never;
  incomeSources: IncomeSourceRow[];
  bankAccounts: BankAccountRow[];
  action: (formData: FormData) => Promise<boolean>;
  onSuccess: () => void;
}) {
  const [kindValue, setKindValue] = useState<ForecastKind>(initial.kindValue);
  const [selectedIncomeSourceId, setSelectedIncomeSourceId] = useState<string>(initial.incomeSourceId ?? "");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(initial.bankAccountId ?? "");

  const hasIncomeSources = incomeSources.length > 0;
  const hasBankAccounts = bankAccounts.length > 0;
  const todayIso = useMemo(() => getLocalTodayISO(), []);
  const todayYm = useMemo(() => getLocalYearMonth(), []);
  const todayDay = useMemo(() => getLocalDayOfMonth(), []);
  const canSubmit = hasIncomeSources && hasBankAccounts && selectedIncomeSourceId.length > 0 && selectedBankAccountId.length > 0;

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
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Entrada</span>
          <Combobox
            name="incomeSourceId"
            options={incomeSources.map((s) => ({ id: s.id, label: s.name }))}
            defaultValue={initial.incomeSourceId}
            disabled={!hasIncomeSources}
            placeholder={hasIncomeSources ? "Digite para buscar..." : "Cadastre uma entrada antes"}
            onSelectedIdChange={setSelectedIncomeSourceId}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conta bancária</span>
          <Combobox
            name="bankAccountId"
            options={bankAccounts.map((b) => ({ id: b.id, label: b.name }))}
            defaultValue={selectedBankAccountId}
            disabled={!hasBankAccounts}
            placeholder={hasBankAccounts ? "Digite para buscar..." : "Cadastre uma conta bancária antes"}
            onSelectedIdChange={setSelectedBankAccountId}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Valor</span>
          <input
            name="amount"
            placeholder="0,00"
            required
            data-autofocus
            defaultValue={formatMoneyBRLFromCents(initial.amountCents)}
            className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 dark:border-white/10 dark:focus:ring-white/15"
          />
        </label>

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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatusSelect name="status" defaultValue={initial.status} />
        <div />
      </div>

      {kindValue === "MONTHLY" || kindValue === "ANNUAL" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {kindValue === "MONTHLY" ? "Começa em (mês/ano)" : "Primeiro recebimento (mês/ano)"}
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
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dia previsto</span>
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
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dia previsto</span>
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
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Data prevista</span>
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

      <button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
        Salvar
      </button>
    </form>
  );
}
