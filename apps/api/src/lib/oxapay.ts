import crypto from "crypto";

const OXAPAY_BASE = "https://api.oxapay.com/v1";
const MERCHANT_KEY = process.env.OXAPAY_MERCHANT_KEY ?? "3RDHFD-9WWVA6-7KWP4B-AYGMHB";

async function oxaPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${OXAPAY_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      merchant_api_key: MERCHANT_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OxaPay ${path} ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
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
    data?: { address: string; network: string; currency: string };
    message?: string;
  }>("/payment/static-address", {
    network: opts.network,
    callback_url: opts.callbackUrl,
    order_id: opts.orderId,
    description: opts.description ?? "WhatsAPI balance top-up",
  });
  if (data.result !== 1 || !data.data) {
    throw new Error(`OxaPay static address failed: ${data.message ?? "unknown"}`);
  }
  return data.data;
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
    track_id?: string;
    pay_link?: string;
    message?: string;
  }>("/payment/invoice", {
    amount: opts.amount,
    currency: "USD",
    mixed_payment: true,
    callback_url: opts.callbackUrl,
    order_id: opts.orderId,
    description: opts.description ?? "WhatsAPI balance top-up",
  });
  if (data.result !== 1 || !data.track_id) {
    throw new Error(`OxaPay invoice failed: ${data.message ?? "unknown"}`);
  }
  return { trackId: data.track_id, payLink: data.pay_link ?? "" };
}

export function verifyOxapayHmac(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha512", MERCHANT_KEY)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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
