"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const StatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

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
});

const UpdateBankAccountSchema = CreateBankAccountSchema.extend({
  id: z.string().min(1),
});

export async function createBankAccount(formData: FormData) {
  const balanceCents = parseMoneyToCents(formData.get("balance"));
  if (balanceCents === null) return false;

  const parsed = CreateBankAccountSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    bank: String(formData.get("bank") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    balanceCents,
  });

  if (!parsed.success) return false;

  await prisma.bankAccount.create({
    data: parsed.data,
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

  const parsed = UpdateBankAccountSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    bank: String(formData.get("bank") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    balanceCents,
  });

  if (!parsed.success) return false;

  await prisma.bankAccount.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      bank: parsed.data.bank,
      status: parsed.data.status,
      balanceCents: parsed.data.balanceCents,
    },
  });

  revalidatePath("/cadastros");
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

const CreateForecastSchema = z
  .object({
    utilityAccountId: z.string().min(1),
    amountCents: z.number().int().min(0),
    kind: ForecastKindSchema,

    // MONTHLY/ANNUAL use startsAtMonth (1st of month)
    startsAtMonth: z.date().optional(),
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
    }

    if (val.kind === "INSTALLMENTS") {
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
