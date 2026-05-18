import crypto from "crypto";
import axios from "axios";

const OXAPAY_BASE = "https://api.oxapay.com/v1";
const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_KEY ?? "3RDHFD-9WWVA6-7KWP4B-AYGMHB";

async function oxaPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  try {
    const res = await axios.post<T>(`${OXAPAY_BASE}${path}`, body, {
      headers: {
        "Content-Type": "application/json",
        merchant_api_key: MERCHANT_KEY,
      },
      timeout: 15000,
    });
    return res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error(`[OxaPay] POST ${path} failed — status=${status}`, JSON.stringify(data));
    throw new Error(`OxaPay ${path} HTTP ${status ?? "?"}: ${JSON.stringify(data)}`);
  }
}

export interface StaticAddressResult {
  address: string;
  network: string;
  currency: string;
}

export async function createStaticAddress(opts: {
  network: string;
  orderId: string;
  callbackUrl: string;
  description?: string;
}): Promise<StaticAddressResult> {
  const data = await oxaPost<{
    result: number;
    message?: string;
    data?: { address: string; network: string; currency: string };
    // Some OxaPay versions return fields at root level
    address?: string;
    network?: string;
    currency?: string;
  }>("/payment/static-address", {
    network: opts.network,
    callback_url: opts.callbackUrl,
    order_id: opts.orderId,
    description: opts.description ?? "WhatsAPI balance top-up",
  });

  console.log("[OxaPay] static-address response:", JSON.stringify(data));

  // Handle both nested and flat response shapes (OxaPay returns data directly)
  const address = data.data?.address ?? data.address;
  const network = data.data?.network ?? data.network ?? opts.network;
  const currency = data.data?.currency ?? data.currency ?? "";

  // If we have an address, it succeeded regardless of result code
  if (address) {
    return { address, network, currency };
  }

  // No address — something went wrong
  throw new Error(`OxaPay static address failed: ${data.message ?? JSON.stringify(data)}`);
}

export interface InvoiceResult {
  trackId: string;
  payLink: string;
}

export async function createInvoice(opts: {
  amount: number;
  orderId: string;
  callbackUrl: string;
  description?: string;
}): Promise<InvoiceResult> {
  const data = await oxaPost<{
    result: number;
    message?: string;
    track_id?: string;
    trackId?: string;
    pay_link?: string;
    payLink?: string;
    data?: { track_id?: string; pay_link?: string };
  }>("/payment/invoice", {
    amount: opts.amount,
    currency: "USD",
    mixed_payment: true,
    callback_url: opts.callbackUrl,
    order_id: opts.orderId,
    description: opts.description ?? "WhatsAPI balance top-up",
  });

  console.log("[OxaPay] invoice response:", JSON.stringify(data));

  const trackId = data.track_id ?? data.trackId ?? data.data?.track_id ?? "";
  const payLink = data.pay_link ?? data.payLink ?? data.data?.pay_link ?? "";

  if (trackId) {
    return { trackId, payLink };
  }

  throw new Error(`OxaPay invoice failed: ${data.message ?? JSON.stringify(data)}`);
}

export function verifyOxapayHmac(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", MERCHANT_KEY)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export interface OxapayWebhookPayload {
  track_id: string;
  status: string;
  type: string;
  amount: number;
  currency: string;
  order_id: string;
  txs?: unknown[];
}
