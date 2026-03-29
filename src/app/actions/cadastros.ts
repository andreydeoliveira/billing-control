"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const StatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
const BankYieldModeSchema = z.enum(["NONE", "CUMULATIVE", "MONTHLY"]);

const ForecastKindSchema = z.enum(["MONTHLY", "ANNUAL", "INSTALLMENTS", "ONE_TIME"]);

function parseMoneyToCents(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // Accept: "1234", "1234.56", "1234,56", "1.234,56"
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  // Decide decimal separator by the last occurrence.
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const decimalIsComma = hasComma && (!hasDot || lastComma > lastDot);

  const normalized = decimalIsComma
    ? s.replace(/\./g, "").replace(",", ".")
    : s.replace(/,/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  if (!Number.isFinite(cents)) return null;
  return cents;
}

function parseOptionalInt(raw: unknown): number | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isInteger(n)) return undefined;
  return n;
}

function parseOptionalDate(raw: unknown): Date | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseOptionalYearMonth(raw: unknown): Date | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return undefined;
  if (month < 1 || month > 12) return undefined;
  return new Date(Date.UTC(year, month - 1, 1));
}

const CreateBankAccountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  bank: z.string().trim().min(1).max(80),
  status: StatusSchema,
  balanceCents: z.number().int(),
  yieldMode: BankYieldModeSchema,
});

const UpdateBankAccountSchema = CreateBankAccountSchema.extend({
  id: z.string().min(1),
});

export async function createBankAccount(formData: FormData) {
  const balanceCents = parseMoneyToCents(formData.get("balance"));
  if (balanceCents === null) return false;

  const initialYieldCents = parseMoneyToCents(formData.get("initialYield"));
  const initialYieldRecordedAt = parseOptionalDate(formData.get("initialYieldRecordedAt")) ?? new Date();
  if (initialYieldCents !== null && initialYieldCents < 0) return false;

  const parsed = CreateBankAccountSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    bank: String(formData.get("bank") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    balanceCents,
    yieldMode: String(formData.get("yieldMode") ?? "NONE"),
  });

  if (!parsed.success) return false;

  if (parsed.data.yieldMode === "CUMULATIVE" && initialYieldCents === null) return false;

  await prisma.$transaction(async (tx) => {
    const acct = await tx.bankAccount.create({
      data: parsed.data,
    });

    if (parsed.data.yieldMode === "CUMULATIVE" && initialYieldCents !== null) {
      await tx.bankAccountYieldRecord.create({
        data: {
          bankAccountId: acct.id,
          mode: parsed.data.yieldMode,
          month: monthStartUtcFromDate(initialYieldRecordedAt),
          valueCents: initialYieldCents,
          deltaCents: 0,
          recordedAt: initialYieldRecordedAt,
        },
      });
    }
  });

  revalidatePath("/cadastros");
  return true;
}

const DeleteSchema = z.object({
  id: z.string().min(1),
});

export async function deleteBankAccount(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });

  if (!parsed.success) return false;

  await prisma.bankAccount.delete({
    where: { id: parsed.data.id },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function updateBankAccount(formData: FormData) {
  const balanceCents = parseMoneyToCents(formData.get("balance"));
  if (balanceCents === null) return false;

  const initialYieldCents = parseMoneyToCents(formData.get("initialYield"));
  const initialYieldRecordedAt = parseOptionalDate(formData.get("initialYieldRecordedAt")) ?? new Date();
  if (initialYieldCents !== null && initialYieldCents < 0) return false;

  const parsed = UpdateBankAccountSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    bank: String(formData.get("bank") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    balanceCents,
    yieldMode: String(formData.get("yieldMode") ?? "NONE"),
  });

  if (!parsed.success) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const prev = await tx.bankAccount.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, yieldMode: true },
      });
      if (!prev) throw new Error("notfound");

      await tx.bankAccount.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          bank: parsed.data.bank,
          status: parsed.data.status,
          balanceCents: parsed.data.balanceCents,
          yieldMode: parsed.data.yieldMode,
        },
      });

      const switchingToCumulative = prev.yieldMode !== "CUMULATIVE" && parsed.data.yieldMode === "CUMULATIVE";
      if (switchingToCumulative) {
        if (initialYieldCents === null) throw new Error("missingBaseline");

        await tx.bankAccountYieldRecord.create({
          data: {
            bankAccountId: prev.id,
            mode: "CUMULATIVE",
            month: monthStartUtcFromDate(initialYieldRecordedAt),
            valueCents: initialYieldCents,
            deltaCents: 0,
            recordedAt: initialYieldRecordedAt,
          },
        });
      }
    });
  } catch {
    return false;
  }

  revalidatePath("/cadastros");
  return true;
}

function monthStartUtcFromDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const RecordBankYieldSchema = z.object({
  bankAccountId: z.string().min(1),
  recordedAt: z.date(),
  valueCents: z.number().int().min(0),
});

export async function recordBankYield(formData: FormData) {
  const recordedAt = parseOptionalDate(formData.get("recordedAt"));
  if (!recordedAt) return false;

  const valueCents = parseMoneyToCents(formData.get("value"));
  if (valueCents === null || valueCents < 0) return false;

  const parsed = RecordBankYieldSchema.safeParse({
    bankAccountId: String(formData.get("bankAccountId") ?? ""),
    recordedAt,
    valueCents,
  });
  if (!parsed.success) return false;

  const month = monthStartUtcFromDate(parsed.data.recordedAt);

  try {
    await prisma.$transaction(async (tx) => {
      const acct = await tx.bankAccount.findUnique({
        where: { id: parsed.data.bankAccountId },
        select: { id: true, yieldMode: true },
      });
      if (!acct) throw new Error("notfound");
      if (acct.yieldMode === "NONE") throw new Error("disabled");

      const mode = acct.yieldMode;

      let deltaCents = 0;

      if (mode === "CUMULATIVE") {
        const prevCumulative = await tx.bankAccountYieldRecord.findFirst({
          where: { bankAccountId: acct.id, mode: "CUMULATIVE" },
          orderBy: { recordedAt: "desc" },
          select: { valueCents: true },
        });

        // First cumulative record is a baseline: do not change balance.
        if (prevCumulative && parsed.data.valueCents < prevCumulative.valueCents) throw new Error("decreasingTotal");
        deltaCents = prevCumulative ? parsed.data.valueCents - prevCumulative.valueCents : 0;
      } else {
        // MONTHLY: valueCents is the yield amount for the month entry (incremental).
        deltaCents = parsed.data.valueCents;
      }

      await tx.bankAccountYieldRecord.create({
        data: {
          bankAccountId: acct.id,
          mode,
          month,
          valueCents: parsed.data.valueCents,
          deltaCents,
          recordedAt: parsed.data.recordedAt,
        },
      });

      if (deltaCents !== 0) {
        await tx.bankAccount.update({
          where: { id: acct.id },
          data: { balanceCents: { increment: deltaCents } },
        });
      }
    });
  } catch {
    return false;
  }

  revalidatePath("/cadastros");
  revalidatePath("/lancamentos");
  return true;
}

const CreateCreditCardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  status: StatusSchema,
});

const UpdateCreditCardSchema = CreateCreditCardSchema.extend({
  id: z.string().min(1),
});

export async function createCreditCard(formData: FormData) {
  const parsed = CreateCreditCardSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.creditCard.create({
    data: parsed.data,
  });

  revalidatePath("/cadastros");
  return true;
}

export async function deleteCreditCard(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });

  if (!parsed.success) return false;

  await prisma.creditCard.delete({
    where: { id: parsed.data.id },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function updateCreditCard(formData: FormData) {
  const parsed = UpdateCreditCardSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.creditCard.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      status: parsed.data.status,
    },
  });

  revalidatePath("/cadastros");
  return true;
}

const CreateUtilityAccountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  observation: z.string().trim().max(200).optional(),
  status: StatusSchema,
});

const CreateIncomeSourceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  observation: z.string().trim().max(200).optional(),
  status: StatusSchema,
});

const UpdateIncomeSourceSchema = CreateIncomeSourceSchema.extend({
  id: z.string().min(1),
});

const UpdateUtilityAccountSchema = CreateUtilityAccountSchema.extend({
  id: z.string().min(1),
});

export async function createUtilityAccount(formData: FormData) {
  const observationRaw = String(formData.get("observation") ?? "").trim();

  const parsed = CreateUtilityAccountSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.utilityAccount.create({
    data: parsed.data,
  });

  revalidatePath("/cadastros");
  return true;
}

export async function deleteUtilityAccount(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });

  if (!parsed.success) return false;

  await prisma.utilityAccount.delete({
    where: { id: parsed.data.id },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function updateUtilityAccount(formData: FormData) {
  const observationRaw = String(formData.get("observation") ?? "").trim();

  const parsed = UpdateUtilityAccountSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.utilityAccount.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      observation: parsed.data.observation,
      status: parsed.data.status,
    },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function createIncomeSource(formData: FormData) {
  const observationRaw = String(formData.get("observation") ?? "").trim();

  const parsed = CreateIncomeSourceSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.incomeSource.create({
    data: parsed.data,
  });

  revalidatePath("/cadastros");
  return true;
}

export async function updateIncomeSource(formData: FormData) {
  const observationRaw = String(formData.get("observation") ?? "").trim();

  const parsed = UpdateIncomeSourceSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.incomeSource.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      observation: parsed.data.observation,
      status: parsed.data.status,
    },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function deleteIncomeSource(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });

  if (!parsed.success) return false;

  await prisma.incomeSource.delete({
    where: { id: parsed.data.id },
  });

  revalidatePath("/cadastros");
  return true;
}

const CreateIncomeForecastSchema = z.object({
  incomeSourceId: z.string().min(1),
  bankAccountId: z.string().min(1),
  amountCents: z.number().int().positive(),
  kind: ForecastKindSchema,
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  installmentsTotal: z.number().int().min(1).max(120).optional(),
  oneTimeAt: z.date().optional(),
  observation: z.string().trim().max(200).optional(),
  status: StatusSchema,
});

const UpdateIncomeForecastSchema = CreateIncomeForecastSchema.extend({
  id: z.string().min(1),
});

export async function createIncomeForecast(formData: FormData) {
  const amountCents = parseMoneyToCents(formData.get("amount"));
  if (amountCents === null || amountCents <= 0) return false;

  const kind = String(formData.get("kind") ?? "MONTHLY");
  const startsAtMonth = parseOptionalYearMonth(formData.get("startsAtMonth"));
  const endsAtMonth = parseOptionalYearMonth(formData.get("endsAtMonth"));
  const startsAtDate = parseOptionalDate(formData.get("startsAtDate"));
  const oneTimeAt = parseOptionalDate(formData.get("oneTimeAt"));
  const dueDay = parseOptionalInt(formData.get("dueDay"));
  const installmentsTotal = parseOptionalInt(formData.get("installmentsTotal"));
  const observationRaw = String(formData.get("observation") ?? "").trim();

  const startsAt = kind === "INSTALLMENTS" ? startsAtDate : startsAtMonth;
  const endsAt = kind === "MONTHLY" || kind === "ANNUAL" ? endsAtMonth : undefined;

  if ((kind === "MONTHLY" || kind === "ANNUAL") && endsAtMonth && startsAtMonth && endsAtMonth.getTime() < startsAtMonth.getTime()) return false;
  if (!(kind === "MONTHLY" || kind === "ANNUAL") && endsAtMonth) return false;

  const parsed = CreateIncomeForecastSchema.safeParse({
    incomeSourceId: String(formData.get("incomeSourceId") ?? ""),
    bankAccountId: String(formData.get("bankAccountId") ?? ""),
    amountCents,
    kind,
    startsAt: startsAt ?? undefined,
    endsAt: endsAt ?? undefined,
    dueDay: dueDay ?? undefined,
    installmentsTotal: installmentsTotal ?? undefined,
    oneTimeAt: oneTimeAt ?? undefined,
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.incomeForecast.create({
    data: {
      incomeSourceId: parsed.data.incomeSourceId,
      bankAccountId: parsed.data.bankAccountId,
      amountCents: parsed.data.amountCents,
      kind: parsed.data.kind,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      dueDay: parsed.data.dueDay,
      installmentsTotal: parsed.data.installmentsTotal,
      oneTimeAt: parsed.data.oneTimeAt,
      observation: parsed.data.observation,
      status: parsed.data.status,
    },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function updateIncomeForecast(formData: FormData) {
  const amountCents = parseMoneyToCents(formData.get("amount"));
  if (amountCents === null || amountCents <= 0) return false;

  const kind = String(formData.get("kind") ?? "MONTHLY");
  const startsAtMonth = parseOptionalYearMonth(formData.get("startsAtMonth"));
  const endsAtMonth = parseOptionalYearMonth(formData.get("endsAtMonth"));
  const startsAtDate = parseOptionalDate(formData.get("startsAtDate"));
  const oneTimeAt = parseOptionalDate(formData.get("oneTimeAt"));
  const dueDay = parseOptionalInt(formData.get("dueDay"));
  const installmentsTotal = parseOptionalInt(formData.get("installmentsTotal"));
  const observationRaw = String(formData.get("observation") ?? "").trim();

  const startsAt = kind === "INSTALLMENTS" ? startsAtDate : startsAtMonth;
  const endsAt = kind === "MONTHLY" || kind === "ANNUAL" ? endsAtMonth : undefined;

  if ((kind === "MONTHLY" || kind === "ANNUAL") && endsAtMonth && startsAtMonth && endsAtMonth.getTime() < startsAtMonth.getTime()) return false;
  if (!(kind === "MONTHLY" || kind === "ANNUAL") && endsAtMonth) return false;

  const parsed = UpdateIncomeForecastSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    incomeSourceId: String(formData.get("incomeSourceId") ?? ""),
    bankAccountId: String(formData.get("bankAccountId") ?? ""),
    amountCents,
    kind,
    startsAt: startsAt ?? undefined,
    endsAt: endsAt ?? undefined,
    dueDay: dueDay ?? undefined,
    installmentsTotal: installmentsTotal ?? undefined,
    oneTimeAt: oneTimeAt ?? undefined,
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.incomeForecast.update({
    where: { id: parsed.data.id },
    data: {
      incomeSourceId: parsed.data.incomeSourceId,
      bankAccountId: parsed.data.bankAccountId,
      amountCents: parsed.data.amountCents,
      kind: parsed.data.kind,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      dueDay: parsed.data.dueDay,
      installmentsTotal: parsed.data.installmentsTotal,
      oneTimeAt: parsed.data.oneTimeAt,
      observation: parsed.data.observation,
      status: parsed.data.status,
    },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function deleteIncomeForecast(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });

  if (!parsed.success) return false;

  await prisma.incomeForecast.delete({
    where: { id: parsed.data.id },
  });

  revalidatePath("/cadastros");
  return true;
}

const CreateForecastSchema = z
  .object({
    utilityAccountId: z.string().min(1),
    amountCents: z.number().int().min(0),
    kind: ForecastKindSchema,

    // MONTHLY/ANNUAL use startsAtMonth (1st of month)
    startsAtMonth: z.date().optional(),
    // Optional end for MONTHLY/ANNUAL (1st of month)
    endsAtMonth: z.date().optional(),
    // INSTALLMENTS uses a full date
    startsAtDate: z.date().optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    installmentsTotal: z.number().int().min(1).max(120).optional(),
    oneTimeAt: z.date().optional(),

    observation: z.string().trim().max(200).optional(),
    status: StatusSchema,
  })
  .superRefine((val, ctx) => {
    if (val.kind === "MONTHLY" || val.kind === "ANNUAL") {
      if (!val.startsAtMonth) {
        ctx.addIssue({ code: "custom", message: "Selecione mês e ano.", path: ["startsAtMonth"] });
      }
      if (!val.dueDay) {
        ctx.addIssue({ code: "custom", message: "Dia da cobrança é obrigatório.", path: ["dueDay"] });
      }

      if (val.endsAtMonth && val.startsAtMonth && val.endsAtMonth.getTime() < val.startsAtMonth.getTime()) {
        ctx.addIssue({ code: "custom", message: "Data final não pode ser antes do início.", path: ["endsAtMonth"] });
      }
    }

    if (val.kind === "INSTALLMENTS") {
      if (val.endsAtMonth) {
        ctx.addIssue({ code: "custom", message: "Data final só se aplica a Mensal/Anual.", path: ["endsAtMonth"] });
      }
      if (!val.installmentsTotal) {
        ctx.addIssue({ code: "custom", message: "Total de parcelas é obrigatório.", path: ["installmentsTotal"] });
      }
      if (!val.startsAtDate) {
        ctx.addIssue({ code: "custom", message: "Data de início é obrigatória.", path: ["startsAtDate"] });
      }
      if (!val.dueDay) {
        ctx.addIssue({ code: "custom", message: "Dia da cobrança é obrigatório.", path: ["dueDay"] });
      }
    }

    if (val.kind === "ONE_TIME") {
      if (val.endsAtMonth) {
        ctx.addIssue({ code: "custom", message: "Data final só se aplica a Mensal/Anual.", path: ["endsAtMonth"] });
      }
      if (!val.oneTimeAt) {
        ctx.addIssue({ code: "custom", message: "Data da cobrança é obrigatória.", path: ["oneTimeAt"] });
      }
    }
  });

const UpdateForecastSchema = CreateForecastSchema.extend({
  id: z.string().min(1),
});

export async function createForecast(formData: FormData) {
  const observationRaw = String(formData.get("observation") ?? "").trim();
  const amountCents = parseMoneyToCents(formData.get("amount"));
  if (amountCents === null) return false;

  const parsed = CreateForecastSchema.safeParse({
    utilityAccountId: String(formData.get("utilityAccountId") ?? ""),
    amountCents,
    kind: String(formData.get("kind") ?? "MONTHLY"),
    startsAtMonth: parseOptionalYearMonth(formData.get("startsAtMonth")),
    endsAtMonth: parseOptionalYearMonth(formData.get("endsAtMonth")),
    startsAtDate: parseOptionalDate(formData.get("startsAtDate")),
    dueDay: parseOptionalInt(formData.get("dueDay")),
    installmentsTotal: parseOptionalInt(formData.get("installmentsTotal")),
    oneTimeAt: parseOptionalDate(formData.get("oneTimeAt")),
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.forecast.create({
    data: {
      utilityAccountId: parsed.data.utilityAccountId,
      amountCents: parsed.data.amountCents,
      kind: parsed.data.kind,
      startsAt:
        parsed.data.kind === "MONTHLY" || parsed.data.kind === "ANNUAL"
          ? parsed.data.startsAtMonth
          : parsed.data.kind === "INSTALLMENTS"
            ? parsed.data.startsAtDate
            : null,
      endsAt: parsed.data.kind === "MONTHLY" || parsed.data.kind === "ANNUAL" ? (parsed.data.endsAtMonth ?? null) : null,
      dueDay:
        parsed.data.kind === "MONTHLY" || parsed.data.kind === "ANNUAL" || parsed.data.kind === "INSTALLMENTS"
          ? parsed.data.dueDay
          : null,
      installmentsTotal: parsed.data.kind === "INSTALLMENTS" ? parsed.data.installmentsTotal : null,
      oneTimeAt: parsed.data.kind === "ONE_TIME" ? parsed.data.oneTimeAt : null,

      observation: parsed.data.observation,
      status: parsed.data.status,
    },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function updateForecast(formData: FormData) {
  const observationRaw = String(formData.get("observation") ?? "").trim();
  const amountCents = parseMoneyToCents(formData.get("amount"));
  if (amountCents === null) return false;

  const parsed = UpdateForecastSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    utilityAccountId: String(formData.get("utilityAccountId") ?? ""),
    amountCents,
    kind: String(formData.get("kind") ?? "MONTHLY"),
    startsAtMonth: parseOptionalYearMonth(formData.get("startsAtMonth")),
    endsAtMonth: parseOptionalYearMonth(formData.get("endsAtMonth")),
    startsAtDate: parseOptionalDate(formData.get("startsAtDate")),
    dueDay: parseOptionalInt(formData.get("dueDay")),
    installmentsTotal: parseOptionalInt(formData.get("installmentsTotal")),
    oneTimeAt: parseOptionalDate(formData.get("oneTimeAt")),
    observation: observationRaw.length ? observationRaw : undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
  });

  if (!parsed.success) return false;

  await prisma.forecast.update({
    where: { id: parsed.data.id },
    data: {
      utilityAccountId: parsed.data.utilityAccountId,
      amountCents: parsed.data.amountCents,
      kind: parsed.data.kind,
      startsAt:
        parsed.data.kind === "MONTHLY" || parsed.data.kind === "ANNUAL"
          ? parsed.data.startsAtMonth
          : parsed.data.kind === "INSTALLMENTS"
            ? parsed.data.startsAtDate
            : null,
      endsAt: parsed.data.kind === "MONTHLY" || parsed.data.kind === "ANNUAL" ? (parsed.data.endsAtMonth ?? null) : null,
      dueDay:
        parsed.data.kind === "MONTHLY" || parsed.data.kind === "ANNUAL" || parsed.data.kind === "INSTALLMENTS"
          ? parsed.data.dueDay
          : null,
      installmentsTotal: parsed.data.kind === "INSTALLMENTS" ? parsed.data.installmentsTotal : null,
      oneTimeAt: parsed.data.kind === "ONE_TIME" ? parsed.data.oneTimeAt : null,

      observation: parsed.data.observation,
      status: parsed.data.status,
    },
  });

  revalidatePath("/cadastros");
  return true;
}

export async function deleteForecast(formData: FormData) {
  const parsed = DeleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });

  if (!parsed.success) return false;

  await prisma.forecast.delete({
    where: { id: parsed.data.id },
  });

  revalidatePath("/cadastros");
  return true;
}
