"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const IdSchema = z.string().min(1);

function isSameYearMonthUtc(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function monthsDiffUtc(from: Date, to: Date) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

type ForecastLike = {
  status: "ACTIVE" | "INACTIVE";
  amountCents: number;
  kind: "MONTHLY" | "ANNUAL" | "INSTALLMENTS" | "ONE_TIME";
  startsAt: Date | null;
  endsAt: Date | null;
  oneTimeAt: Date | null;
  installmentsTotal: number | null;
  utilityAccount: {
    status: "ACTIVE" | "INACTIVE";
  };
};

function occursInMonth(forecast: ForecastLike, monthStart: Date): boolean {
  if (forecast.status !== "ACTIVE") return false;
  if (forecast.utilityAccount.status !== "ACTIVE") return false;
  if (forecast.amountCents <= 0) return false;

  if (forecast.endsAt && monthsDiffUtc(monthStart, forecast.endsAt) > 0) return false;

  switch (forecast.kind) {
    case "ONE_TIME": {
      if (!forecast.oneTimeAt) return false;
      return isSameYearMonthUtc(forecast.oneTimeAt, monthStart);
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

  const normalized = decimalIsComma
    ? s.replace(/\./g, "").replace(",", ".")
    : s.replace(/,/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  if (!Number.isFinite(cents)) return null;
  return cents;
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

function monthStartUtcFromDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function assignForecastToCard(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      forecastId: IdSchema,
      month: z.string().min(1),
      creditCardId: IdSchema,
    })
    .safeParse({
      forecastId: formData.get("forecastId"),
      month: formData.get("month"),
      creditCardId: formData.get("creditCardId"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  await prisma.forecastCardAssignment.upsert({
    where: {
      forecastId_month: {
        forecastId: parsed.data.forecastId,
        month,
      },
    },
    update: { creditCardId: parsed.data.creditCardId },
    create: {
      forecastId: parsed.data.forecastId,
      month,
      creditCardId: parsed.data.creditCardId,
    },
  });

  revalidatePath("/lancamentos");
  return true;
}

export async function unassignForecastFromCard(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({ forecastId: IdSchema, month: z.string().min(1) })
    .safeParse({
      forecastId: formData.get("forecastId"),
      month: formData.get("month"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  await prisma.forecastCardAssignment
    .delete({
      where: {
        forecastId_month: {
          forecastId: parsed.data.forecastId,
          month,
        },
      },
    })
    .catch(() => {
      // ignore
    });

  revalidatePath("/lancamentos");
  return true;
}

export async function payUtilityForecast(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      forecastId: IdSchema,
      month: z.string().min(1),
      bankAccountId: IdSchema,
      amount: z.any(),
      paidAt: z.string().min(1),
    })
    .safeParse({
      forecastId: formData.get("forecastId"),
      month: formData.get("month"),
      bankAccountId: formData.get("bankAccountId"),
      amount: formData.get("amount"),
      paidAt: formData.get("paidAt"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  const paidAt = parseOptionalDate(parsed.data.paidAt);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!month || !paidAt || amountCents === null) return false;
  if (amountCents <= 0) return false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.utilityPayment.create({
        data: {
          forecastId: parsed.data.forecastId,
          month,
          bankAccountId: parsed.data.bankAccountId,
          amountCents,
          paidAt,
        },
      });

      await tx.bankAccount.update({
        where: { id: parsed.data.bankAccountId },
        data: { balanceCents: { decrement: amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function payCreditCardInvoice(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      creditCardId: IdSchema,
      month: z.string().min(1),
      bankAccountId: IdSchema,
      amount: z.any(),
      paidAt: z.string().min(1),
    })
    .safeParse({
      creditCardId: formData.get("creditCardId"),
      month: formData.get("month"),
      bankAccountId: formData.get("bankAccountId"),
      amount: formData.get("amount"),
      paidAt: formData.get("paidAt"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  const paidAt = parseOptionalDate(parsed.data.paidAt);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!month || !paidAt || amountCents === null) return false;
  if (amountCents <= 0) return false;

  // Enforce confirmation for all forecast items inside the invoice.
  // (Manual charges are considered explicit and don't require separate confirmation.)
  const assignedForecastIds = await prisma.forecastCardAssignment.findMany({
    where: {
      creditCardId: parsed.data.creditCardId,
      month,
    },
    select: { forecastId: true },
  });

  if (assignedForecastIds.length > 0) {
    const forecastIds = assignedForecastIds.map((a) => a.forecastId);
    const [forecasts, overrides] = await Promise.all([
      prisma.forecast.findMany({
        where: { id: { in: forecastIds } },
        select: {
          id: true,
          status: true,
          amountCents: true,
          kind: true,
          startsAt: true,
          endsAt: true,
          oneTimeAt: true,
          installmentsTotal: true,
          utilityAccount: { select: { status: true, name: true } },
        },
      }),
      prisma.forecastMonthOverride.findMany({
        where: {
          month,
          forecastId: { in: forecastIds },
        },
        select: {
          forecastId: true,
          skipped: true,
          cardConfirmedAmountCents: true,
          cardConfirmedAt: true,
        },
      }),
    ]);

    const overrideByForecastId = new Map(overrides.map((o) => [o.forecastId, o] as const));

    const hasUnconfirmed = forecasts.some((f) => {
      const o = overrideByForecastId.get(f.id);
      if (o?.skipped) return false;
      if (!occursInMonth(f, month)) return false;
      return !(o?.cardConfirmedAmountCents !== null && o?.cardConfirmedAt);
    });

    if (hasUnconfirmed) return false;
  }

  // Manual card charges are explicit; no extra confirmation gate here.

  try {
    await prisma.$transaction(async (tx) => {
      await tx.creditCardInvoicePayment.create({
        data: {
          creditCardId: parsed.data.creditCardId,
          month,
          bankAccountId: parsed.data.bankAccountId,
          amountCents,
          paidAt,
        },
      });

      await tx.bankAccount.update({
        where: { id: parsed.data.bankAccountId },
        data: { balanceCents: { decrement: amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function confirmCardForecastAmount(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({ forecastId: IdSchema, month: z.string().min(1), amount: z.any(), confirmedAt: z.string().optional() })
    .safeParse({
      forecastId: formData.get("forecastId"),
      month: formData.get("month"),
      amount: formData.get("amount"),
      confirmedAt: formData.get("confirmedAt") ? String(formData.get("confirmedAt")) : undefined,
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!month || amountCents === null) return false;
  if (amountCents <= 0) return false;

  const confirmedAt = parsed.data.confirmedAt ? parseOptionalDate(parsed.data.confirmedAt) : new Date();
  if (!confirmedAt) return false;

  await prisma.forecastMonthOverride.upsert({
    where: {
      forecastId_month: {
        forecastId: parsed.data.forecastId,
        month,
      },
    },
    update: {
      cardConfirmedAmountCents: amountCents,
      cardConfirmedAt: confirmedAt,
    },
    create: {
      forecastId: parsed.data.forecastId,
      month,
      cardConfirmedAmountCents: amountCents,
      cardConfirmedAt: confirmedAt,
    },
  });

  revalidatePath("/lancamentos");
  return true;
}

export async function unconfirmCardManualCharge(formData: FormData): Promise<boolean> {
  const parsed = z.object({ manualChargeId: IdSchema, month: z.string().min(1) }).safeParse({
    manualChargeId: formData.get("manualChargeId"),
    month: formData.get("month"),
  });
  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  try {
    const existing = await prisma.manualCharge.findUnique({
      where: { id: parsed.data.manualChargeId },
      select: { id: true, month: true, creditCardId: true },
    });
    if (!existing) return false;
    if (!existing.creditCardId) return false;
    if (existing.month.getTime() !== month.getTime()) return false;

    await prisma.manualCharge.update({
      where: { id: existing.id },
      data: {
        cardConfirmedAmountCents: null,
        cardConfirmedAt: null,
      },
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function unconfirmCardForecastAmount(formData: FormData): Promise<boolean> {
  const parsed = z.object({ forecastId: IdSchema, month: z.string().min(1) }).safeParse({
    forecastId: formData.get("forecastId"),
    month: formData.get("month"),
  });
  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  await prisma.forecastMonthOverride.upsert({
    where: {
      forecastId_month: {
        forecastId: parsed.data.forecastId,
        month,
      },
    },
    update: {
      cardConfirmedAmountCents: null,
      cardConfirmedAt: null,
    },
    create: {
      forecastId: parsed.data.forecastId,
      month,
      cardConfirmedAmountCents: null,
      cardConfirmedAt: null,
    },
  });

  revalidatePath("/lancamentos");
  return true;
}

export async function skipForecastForMonth(formData: FormData): Promise<boolean> {
  const parsed = z.object({ forecastId: IdSchema, month: z.string().min(1) }).safeParse({
    forecastId: formData.get("forecastId"),
    month: formData.get("month"),
  });
  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  const paid = await prisma.utilityPayment.findUnique({
    where: {
      forecastId_month: {
        forecastId: parsed.data.forecastId,
        month,
      },
    },
    select: { id: true },
  });
  if (paid) return false;

  await prisma.forecastMonthOverride.upsert({
    where: {
      forecastId_month: {
        forecastId: parsed.data.forecastId,
        month,
      },
    },
    update: { skipped: true },
    create: {
      forecastId: parsed.data.forecastId,
      month,
      skipped: true,
    },
  });

  // Optional cleanup: remove assignment for this month so it doesn't appear in card manager.
  await prisma.forecastCardAssignment
    .delete({
      where: {
        forecastId_month: {
          forecastId: parsed.data.forecastId,
          month,
        },
      },
    })
    .catch(() => {
      // ignore
    });

  revalidatePath("/lancamentos");
  return true;
}

export async function unskipForecastForMonth(formData: FormData): Promise<boolean> {
  const parsed = z.object({ forecastId: IdSchema, month: z.string().min(1) }).safeParse({
    forecastId: formData.get("forecastId"),
    month: formData.get("month"),
  });
  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  await prisma.forecastMonthOverride.upsert({
    where: {
      forecastId_month: {
        forecastId: parsed.data.forecastId,
        month,
      },
    },
    update: { skipped: false },
    create: {
      forecastId: parsed.data.forecastId,
      month,
      skipped: false,
    },
  });

  revalidatePath("/lancamentos");
  return true;
}

export async function undoUtilityForecastPayment(formData: FormData): Promise<boolean> {
  const parsed = z.object({ forecastId: IdSchema, month: z.string().min(1) }).safeParse({
    forecastId: formData.get("forecastId"),
    month: formData.get("month"),
  });
  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const p = await tx.utilityPayment.findUnique({
        where: { forecastId_month: { forecastId: parsed.data.forecastId, month } },
        select: { id: true, amountCents: true, bankAccountId: true },
      });
      if (!p) throw new Error("notfound");

      await tx.utilityPayment.delete({ where: { id: p.id } });
      await tx.bankAccount.update({
        where: { id: p.bankAccountId },
        data: { balanceCents: { increment: p.amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function undoManualChargePayment(formData: FormData): Promise<boolean> {
  const parsed = z.object({ manualChargeId: IdSchema }).safeParse({
    manualChargeId: formData.get("manualChargeId"),
  });
  if (!parsed.success) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const c = await tx.manualCharge.findUnique({
        where: { id: parsed.data.manualChargeId },
        select: {
          id: true,
          creditCardId: true,
          paidAt: true,
          bankAccountId: true,
          paidAmountCents: true,
        },
      });
      if (!c) throw new Error("notfound");
      if (c.creditCardId) throw new Error("isCard");
      if (!c.paidAt || !c.bankAccountId || !c.paidAmountCents) throw new Error("notpaid");

      await tx.manualCharge.update({
        where: { id: c.id },
        data: { paidAt: null, bankAccountId: null, paidAmountCents: null },
      });

      await tx.bankAccount.update({
        where: { id: c.bankAccountId },
        data: { balanceCents: { increment: c.paidAmountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function receiveIncomeForecast(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      incomeForecastId: IdSchema,
      month: z.string().min(1),
      bankAccountId: IdSchema,
      amount: z.any(),
      receivedAt: z.string().min(1),
    })
    .safeParse({
      incomeForecastId: formData.get("incomeForecastId"),
      month: formData.get("month"),
      bankAccountId: formData.get("bankAccountId"),
      amount: formData.get("amount"),
      receivedAt: formData.get("receivedAt"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  const receivedAt = parseOptionalDate(parsed.data.receivedAt);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!month || !receivedAt || amountCents === null) return false;
  if (amountCents <= 0) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const forecast = await tx.incomeForecast.findUnique({
        where: { id: parsed.data.incomeForecastId },
        select: { id: true, incomeSourceId: true, status: true },
      });
      if (!forecast) throw new Error("notfound");
      if (forecast.status !== "ACTIVE") throw new Error("inactive");

      await tx.incomeReceipt.create({
        data: {
          incomeForecastId: forecast.id,
          incomeSourceId: forecast.incomeSourceId,
          month,
          bankAccountId: parsed.data.bankAccountId,
          amountCents,
          receivedAt,
        },
      });

      await tx.bankAccount.update({
        where: { id: parsed.data.bankAccountId },
        data: { balanceCents: { increment: amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function undoIncomeReceipt(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      incomeForecastId: IdSchema,
      month: z.string().min(1),
    })
    .safeParse({
      incomeForecastId: formData.get("incomeForecastId"),
      month: formData.get("month"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.incomeReceipt.findUnique({
        where: {
          incomeForecastId_month: {
            incomeForecastId: parsed.data.incomeForecastId,
            month,
          },
        },
        select: { id: true, amountCents: true, bankAccountId: true },
      });
      if (!r) throw new Error("notfound");

      await tx.incomeReceipt.delete({ where: { id: r.id } });
      await tx.bankAccount.update({
        where: { id: r.bankAccountId },
        data: { balanceCents: { decrement: r.amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

const CreateIncomeEntrySchema = z.object({
  incomeSourceId: IdSchema,
  note: z.string().trim().max(80).optional(),
  amountCents: z.number().int().min(1),
  date: z.date(),
});

export async function createIncomeEntry(formData: FormData): Promise<boolean> {
  const amountCents = parseMoneyToCents(formData.get("amount"));
  if (amountCents === null) return false;
  if (amountCents <= 0) return false;

  const date = parseOptionalDate(formData.get("date"));
  if (!date) return false;

  const noteRaw = String(formData.get("note") ?? "").trim();

  const parsed = CreateIncomeEntrySchema.safeParse({
    incomeSourceId: formData.get("incomeSourceId"),
    note: noteRaw ? noteRaw : undefined,
    amountCents,
    date,
  });

  if (!parsed.success) return false;

  const incomeSource = await prisma.incomeSource.findUnique({
    where: { id: parsed.data.incomeSourceId },
    select: { id: true, name: true, status: true },
  });
  if (!incomeSource) return false;
  if (incomeSource.status !== "ACTIVE") return false;

  await prisma.transaction.create({
    data: {
      type: "INCOME",
      amountCents: parsed.data.amountCents,
      description: incomeSource.name,
      category: parsed.data.note ?? null,
      incomeSourceId: incomeSource.id,
      date: parsed.data.date,
    },
  });

  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
  return true;
}

export async function createBankTransfer(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      fromBankAccountId: IdSchema,
      toBankAccountId: IdSchema,
      amount: z.any(),
      transferAt: z.string().min(1),
    })
    .safeParse({
      fromBankAccountId: formData.get("fromBankAccountId"),
      toBankAccountId: formData.get("toBankAccountId"),
      amount: formData.get("amount"),
      transferAt: formData.get("transferAt"),
    });

  if (!parsed.success) return false;
  if (parsed.data.fromBankAccountId === parsed.data.toBankAccountId) return false;

  const transferAt = parseOptionalDate(parsed.data.transferAt);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!transferAt || amountCents === null) return false;
  if (amountCents <= 0) return false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bankTransfer.create({
        data: {
          fromBankAccountId: parsed.data.fromBankAccountId,
          toBankAccountId: parsed.data.toBankAccountId,
          amountCents,
          transferAt,
        },
      });

      await tx.bankAccount.update({
        where: { id: parsed.data.fromBankAccountId },
        data: { balanceCents: { decrement: amountCents } },
      });

      await tx.bankAccount.update({
        where: { id: parsed.data.toBankAccountId },
        data: { balanceCents: { increment: amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function updateBankTransfer(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      transferId: IdSchema,
      fromBankAccountId: IdSchema,
      toBankAccountId: IdSchema,
      amount: z.any(),
      transferAt: z.string().min(1),
    })
    .safeParse({
      transferId: formData.get("transferId"),
      fromBankAccountId: formData.get("fromBankAccountId"),
      toBankAccountId: formData.get("toBankAccountId"),
      amount: formData.get("amount"),
      transferAt: formData.get("transferAt"),
    });

  if (!parsed.success) return false;
  if (parsed.data.fromBankAccountId === parsed.data.toBankAccountId) return false;

  const transferAt = parseOptionalDate(parsed.data.transferAt);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!transferAt || amountCents === null) return false;
  if (amountCents <= 0) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankTransfer.findUnique({
        where: { id: parsed.data.transferId },
        select: {
          id: true,
          fromBankAccountId: true,
          toBankAccountId: true,
          amountCents: true,
        },
      });
      if (!existing) throw new Error("not_found");

      // Revert old balances
      await tx.bankAccount.update({
        where: { id: existing.fromBankAccountId },
        data: { balanceCents: { increment: existing.amountCents } },
      });
      await tx.bankAccount.update({
        where: { id: existing.toBankAccountId },
        data: { balanceCents: { decrement: existing.amountCents } },
      });

      // Update transfer record
      await tx.bankTransfer.update({
        where: { id: existing.id },
        data: {
          fromBankAccountId: parsed.data.fromBankAccountId,
          toBankAccountId: parsed.data.toBankAccountId,
          amountCents,
          transferAt,
        },
      });

      // Apply new balances
      await tx.bankAccount.update({
        where: { id: parsed.data.fromBankAccountId },
        data: { balanceCents: { decrement: amountCents } },
      });
      await tx.bankAccount.update({
        where: { id: parsed.data.toBankAccountId },
        data: { balanceCents: { increment: amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function deleteBankTransfer(formData: FormData): Promise<boolean> {
  const parsed = z.object({ transferId: IdSchema }).safeParse({ transferId: formData.get("transferId") });
  if (!parsed.success) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankTransfer.findUnique({
        where: { id: parsed.data.transferId },
        select: { id: true, fromBankAccountId: true, toBankAccountId: true, amountCents: true },
      });
      if (!existing) throw new Error("not_found");

      // Revert balances
      await tx.bankAccount.update({
        where: { id: existing.fromBankAccountId },
        data: { balanceCents: { increment: existing.amountCents } },
      });
      await tx.bankAccount.update({
        where: { id: existing.toBankAccountId },
        data: { balanceCents: { decrement: existing.amountCents } },
      });

      await tx.bankTransfer.delete({ where: { id: existing.id } });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function createManualCharge(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      month: z.string().min(1),
      utilityAccountId: IdSchema,
      observation: z.string().trim().max(240).optional(),
      amount: z.any(),
      dueDay: z.string().optional(),
      occurredAt: z.string().optional(),
      creditCardId: z.string().optional(),
      bankAccountId: z.string().optional(),
      paidAt: z.string().optional(),
    })
    .safeParse({
      month: formData.get("month"),
      utilityAccountId: formData.get("utilityAccountId"),
      observation: formData.get("observation") ? String(formData.get("observation")) : undefined,
      amount: formData.get("amount"),
      dueDay: formData.get("dueDay") ? String(formData.get("dueDay")) : undefined,
      occurredAt: formData.get("occurredAt") ? String(formData.get("occurredAt")) : undefined,
      creditCardId: formData.get("creditCardId") ? String(formData.get("creditCardId")) : undefined,
      bankAccountId: formData.get("bankAccountId") ? String(formData.get("bankAccountId")) : undefined,
      paidAt: formData.get("paidAt") ? String(formData.get("paidAt")) : undefined,
    });

  if (!parsed.success) return false;
  const monthInput = parseOptionalYearMonth(parsed.data.month);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!monthInput || amountCents === null) return false;
  if (amountCents <= 0) return false;

  const dueDayRaw = String(parsed.data.dueDay ?? "").trim();
  const dueDay = dueDayRaw.length ? Number(dueDayRaw) : undefined;
  if (dueDay !== undefined && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) return false;

  const creditCardId = parsed.data.creditCardId?.trim() || undefined;
  const bankAccountId = parsed.data.bankAccountId?.trim() || undefined;
  const paidAt = parsed.data.paidAt ? parseOptionalDate(parsed.data.paidAt) : undefined;

  const occurredAt = parsed.data.occurredAt ? parseOptionalDate(parsed.data.occurredAt) : undefined;
  if (parsed.data.occurredAt && !occurredAt) return false;

  if (creditCardId && !occurredAt) return false;

  // Month semantics:
  // - Card charges: month is the invoice month (user-selected)
  // - Direct charges: month follows the actual date when provided
  const month = creditCardId
    ? monthInput
    : paidAt
      ? monthStartUtcFromDate(paidAt)
      : occurredAt
        ? monthStartUtcFromDate(occurredAt)
        : monthInput;

  let derivedDueDay: number | undefined;
  if (creditCardId) {
    // When charging a card, the occurrence date is required.
    if (!occurredAt) return false;
    derivedDueDay = occurredAt.getUTCDate();
  } else {
    derivedDueDay = dueDay ?? (occurredAt ? occurredAt.getUTCDate() : undefined);
  }

  if ((bankAccountId && !paidAt) || (!bankAccountId && paidAt)) return false;
  if (creditCardId && (bankAccountId || paidAt)) return false;

  const utilityAccount = await prisma.utilityAccount.findUnique({
    where: { id: parsed.data.utilityAccountId },
    select: { name: true, status: true },
  });
  if (!utilityAccount) return false;
  if (utilityAccount.status !== "ACTIVE") return false;

  const description = utilityAccount.name;
  const observation = (parsed.data.observation ?? "").trim() || null;

  if (bankAccountId && paidAt) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.manualCharge.create({
          data: {
            month,
            utilityAccountId: parsed.data.utilityAccountId,
            description,
            observation,
            amountCents,
            dueDay: derivedDueDay,
            occurredAt,
            paidAt,
            bankAccountId,
            paidAmountCents: amountCents,
            creditCardId: null,
            cardConfirmedAmountCents: null,
            cardConfirmedAt: null,
          },
        });

        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balanceCents: { decrement: amountCents } },
        });
      });
    } catch {
      return false;
    }
  } else {
    await prisma.manualCharge.create({
      data: {
        month,
        utilityAccountId: parsed.data.utilityAccountId,
        description,
        observation,
        amountCents,
        dueDay: derivedDueDay,
        occurredAt,
        creditCardId: creditCardId && creditCardId.length ? creditCardId : null,
        cardConfirmedAmountCents: creditCardId ? amountCents : null,
        cardConfirmedAt: creditCardId ? occurredAt : null,
      },
    });
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function updateManualCharge(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      manualChargeId: IdSchema,
      observation: z.string().trim().max(240).optional(),
      amount: z.any(),
      dueDay: z.string().optional(),
      occurredAt: z.string().optional(),
    })
    .safeParse({
      manualChargeId: formData.get("manualChargeId"),
      observation: formData.get("observation") ? String(formData.get("observation")) : undefined,
      amount: formData.get("amount"),
      dueDay: formData.get("dueDay") ? String(formData.get("dueDay")) : undefined,
      occurredAt: formData.get("occurredAt") ? String(formData.get("occurredAt")) : undefined,
    });

  if (!parsed.success) return false;
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (amountCents === null) return false;
  if (amountCents <= 0) return false;

  const dueDayRaw = String(parsed.data.dueDay ?? "").trim();
  const dueDay = dueDayRaw.length ? Number(dueDayRaw) : undefined;
  if (dueDay !== undefined && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) return false;

  const occurredAtRaw = String(parsed.data.occurredAt ?? "").trim();
  const occurredAt = occurredAtRaw.length ? parseOptionalDate(occurredAtRaw) : undefined;
  if (occurredAtRaw.length && !occurredAt) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.manualCharge.findUnique({
        where: { id: parsed.data.manualChargeId },
        select: {
          id: true,
          amountCents: true,
          paidAmountCents: true,
          paidAt: true,
          bankAccountId: true,
          creditCardId: true,
        },
      });

      if (!existing) throw new Error("not_found");

      const wasPaidDirect = Boolean(existing.paidAt && existing.bankAccountId);
      const oldPaidCents = wasPaidDirect ? (existing.paidAmountCents ?? existing.amountCents) : null;

      if (existing.creditCardId && !occurredAt) throw new Error("missing_occurredAt");

      const derivedDueDay = (() => {
        if (existing.creditCardId) return occurredAt ? occurredAt.getUTCDate() : dueDay;
        if (dueDay !== undefined) return dueDay;
        if (occurredAt) return occurredAt.getUTCDate();
        return undefined;
      })();

      const nextMonth = existing.creditCardId
        ? undefined
        : occurredAt
          ? monthStartUtcFromDate(occurredAt)
          : undefined;

      await tx.manualCharge.update({
        where: { id: existing.id },
        data: {
          observation: parsed.data.observation !== undefined ? (parsed.data.observation.trim() || null) : undefined,
          amountCents,
          dueDay: derivedDueDay,
          occurredAt,
          month: nextMonth,
          cardConfirmedAmountCents: existing.creditCardId ? amountCents : undefined,
          cardConfirmedAt: existing.creditCardId ? occurredAt : undefined,
          paidAmountCents: wasPaidDirect ? amountCents : undefined,
        },
      });

      if (wasPaidDirect && existing.bankAccountId && oldPaidCents !== null) {
        const delta = amountCents - oldPaidCents;
        if (delta !== 0) {
          await tx.bankAccount.update({
            where: { id: existing.bankAccountId },
            data: {
              balanceCents: delta > 0 ? { decrement: delta } : { increment: -delta },
            },
          });
        }
      }

    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function deleteManualCharge(formData: FormData): Promise<boolean> {
  const parsed = z.object({ id: IdSchema }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return false;

  try {
    await prisma.manualCharge.delete({ where: { id: parsed.data.id } });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function assignManualChargeToCard(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      manualChargeId: IdSchema,
      month: z.string().min(1),
      creditCardId: IdSchema,
      occurredAt: z.string().min(1),
    })
    .safeParse({
      manualChargeId: formData.get("manualChargeId"),
      month: formData.get("month"),
      creditCardId: formData.get("creditCardId"),
      occurredAt: formData.get("occurredAt"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  const occurredAt = parseOptionalDate(parsed.data.occurredAt);
  if (!month || !occurredAt) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.manualCharge.findUnique({
        where: { id: parsed.data.manualChargeId },
        select: {
          id: true,
          month: true,
          amountCents: true,
          paidAt: true,
          bankAccountId: true,
        },
      });

      if (!existing) throw new Error("not_found");
      if (existing.month.getTime() !== month.getTime()) throw new Error("wrong_month");
      if (existing.paidAt || existing.bankAccountId) throw new Error("already_paid");

      await tx.manualCharge.update({
        where: { id: existing.id },
        data: {
          creditCardId: parsed.data.creditCardId,
          occurredAt,
          dueDay: occurredAt.getUTCDate(),
          cardConfirmedAmountCents: existing.amountCents,
          cardConfirmedAt: occurredAt,
        },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function unassignManualChargeFromCard(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({ manualChargeId: IdSchema, month: z.string().min(1) })
    .safeParse({
      manualChargeId: formData.get("manualChargeId"),
      month: formData.get("month"),
    });

  if (!parsed.success) return false;
  const month = parseOptionalYearMonth(parsed.data.month);
  if (!month) return false;

  try {
    await prisma.manualCharge.update({
      where: { id: parsed.data.manualChargeId },
      data: {
        creditCardId: null,
        cardConfirmedAmountCents: null,
        cardConfirmedAt: null,
      },
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}

export async function payManualCharge(formData: FormData): Promise<boolean> {
  const parsed = z
    .object({
      manualChargeId: IdSchema,
      bankAccountId: IdSchema,
      amount: z.any(),
      paidAt: z.string().min(1),
    })
    .safeParse({
      manualChargeId: formData.get("manualChargeId"),
      bankAccountId: formData.get("bankAccountId"),
      amount: formData.get("amount"),
      paidAt: formData.get("paidAt"),
    });

  if (!parsed.success) return false;
  const paidAt = parseOptionalDate(parsed.data.paidAt);
  const amountCents = parseMoneyToCents(parsed.data.amount);
  if (!paidAt || amountCents === null) return false;
  if (amountCents <= 0) return false;

  try {
    await prisma.$transaction(async (tx) => {
      const charge = await tx.manualCharge.findUnique({
        where: { id: parsed.data.manualChargeId },
        select: { id: true, creditCardId: true, paidAt: true },
      });
      if (!charge) throw new Error("notfound");
      if (charge.creditCardId) throw new Error("isCard");
      if (charge.paidAt) throw new Error("alreadyPaid");

      await tx.manualCharge.update({
        where: { id: parsed.data.manualChargeId },
        data: {
          paidAt,
          bankAccountId: parsed.data.bankAccountId,
          paidAmountCents: amountCents,
        },
      });

      await tx.bankAccount.update({
        where: { id: parsed.data.bankAccountId },
        data: { balanceCents: { decrement: amountCents } },
      });
    });
  } catch {
    return false;
  }

  revalidatePath("/lancamentos");
  return true;
}
