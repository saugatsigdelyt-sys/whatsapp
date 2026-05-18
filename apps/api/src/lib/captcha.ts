import crypto from "crypto";

// Characters that are easy to read and distinguish
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CAPTCHA_LENGTH = 5;
const CAPTCHA_TTL_MS = 10 * 60 * 1000; // 10 minutes

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    code += CHARS[randomInt(0, CHARS.length - 1)];
  }
  return code;
}

function renderSvg(code: string): string {
  const W = 200;
  const H = 70;
  const bgColor = "#f8f9fa";
  const lines: string[] = [];

  // Background
  lines.push(`<rect width="${W}" height="${H}" fill="${bgColor}" rx="6"/>`);

  // Noise: random curves
  for (let i = 0; i < 5; i++) {
    const x1 = randomInt(0, W);
    const y1 = randomInt(0, H);
    const x2 = randomInt(0, W);
    const y2 = randomInt(0, H);
    const cx = randomInt(0, W);
    const cy = randomInt(0, H);
    const color = `hsl(${randomInt(0, 360)},40%,70%)`;
    lines.push(`<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="${color}" stroke-width="${randomInt(1, 2)}" fill="none" opacity="0.6"/>`);
  }

  // Noise: random dots
  for (let i = 0; i < 25; i++) {
    const x = randomInt(5, W - 5);
    const y = randomInt(5, H - 5);
    const color = `hsl(${randomInt(0, 360)},30%,60%)`;
    lines.push(`<circle cx="${x}" cy="${y}" r="${randomInt(1, 2)}" fill="${color}" opacity="0.5"/>`);
  }

  // Characters — each slightly rotated and offset
  const charW = W / (CAPTCHA_LENGTH + 1);
  for (let i = 0; i < code.length; i++) {
    const x = charW * (i + 0.8) + randomInt(-4, 4);
    const y = H / 2 + randomInt(-8, 8);
    const rotate = randomInt(-18, 18);
    const fontSize = randomInt(24, 30);
    const colors = ["#1e40af", "#7c3aed", "#065f46", "#9f1239", "#1e3a5f", "#4a1942"];
    const color = colors[randomInt(0, colors.length - 1)];
    lines.push(
      `<text x="${x}" y="${y}" transform="rotate(${rotate},${x},${y})" ` +
      `font-family="monospace,Arial" font-size="${fontSize}" font-weight="bold" ` +
      `fill="${color}" dominant-baseline="middle">${code[i]}</text>`
    );
  }

  // Overlay grid lines for extra noise
  for (let i = 0; i < 3; i++) {
    const y = randomInt(10, H - 10);
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y + randomInt(-5, 5)}" stroke="#adb5bd" stroke-width="1" opacity="0.4"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${lines.join("")}</svg>`;
}

function signToken(code: string, expiry: number): string {
  const secret = process.env.JWT_SECRET ?? "captcha-secret";
  const payload = `${code}:${expiry}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  // Encode as base64 to make it URL-safe and opaque
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function generateCaptcha(): { token: string; svgDataUrl: string } {
  const code = generateCode();
  const expiry = Date.now() + CAPTCHA_TTL_MS;
  const token = signToken(code, expiry);
  const svg = renderSvg(code);
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return { token, svgDataUrl };
}

export function verifyCaptcha(token: string, answer: string): { valid: boolean; reason?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false, reason: "Invalid captcha token" };

    const [code, expiryStr, hmac] = parts;
    const expiry = parseInt(expiryStr, 10);

    if (Date.now() > expiry) return { valid: false, reason: "Captcha expired — please refresh" };

    const secret = process.env.JWT_SECRET ?? "captcha-secret";
    const expectedHmac = crypto.createHmac("sha256", secret).update(`${code}:${expiryStr}`).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return { valid: false, reason: "Invalid captcha token" };
    }

    if (answer.toUpperCase().trim() !== code) {
      return { valid: false, reason: "Incorrect captcha — please try again" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid captcha" };
  }
}
