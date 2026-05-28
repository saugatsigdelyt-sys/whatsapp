type SubscriptionTier = "FREE" | "STANDARD" | "PREMIUM" | "PLATINUM";

// ── Tier definitions ───────────────────────────
export const TIER_LIMITS: Record<
  SubscriptionTier,
  { maxWaAccounts: number; maxTeamMembers: number }
> = {
  FREE:     { maxWaAccounts: 1,         maxTeamMembers: 1 },
  STANDARD: { maxWaAccounts: 10,        maxTeamMembers: 2 },
  PREMIUM:  { maxWaAccounts: 100,       maxTeamMembers: 4 },
  PLATINUM: { maxWaAccounts: Infinity,  maxTeamMembers: Infinity },
};

export const TIER_DISPLAY = {
  FREE:     { label: "Free",     price: "$0",    color: "#64748b" },
  STANDARD: { label: "Standard", price: "$29",   color: "#2563eb" },
  PREMIUM:  { label: "Premium",  price: "$99",   color: "#7c3aed" },
  PLATINUM: { label: "Platinum", price: "Custom", color: "#d97706" },
};

/**
 * Returns the current subscription for a business,
 * creating a FREE one if it doesn't exist yet.
 */
export async function getOrCreateSubscription(
  businessId: string,
  prisma: any
) {
  const existing = await prisma.subscription.findUnique({
    where: { businessId },
  });
  if (existing) return existing;

  const limits = TIER_LIMITS.FREE;
  return prisma.subscription.create({
    data: {
      businessId,
      tier: "FREE",
      maxWaAccounts: limits.maxWaAccounts,
      maxTeamMembers: limits.maxTeamMembers,
    },
  });
}

// Anything >= UNLIMITED_THRESHOLD means "no limit"
const UNLIMITED_THRESHOLD = 999999;

/**
 * Checks if the business can add another WA account.
 * Returns { allowed: true } or { allowed: false, reason: string }
 * limit === -1 means unlimited.
 */
export async function canAddWaAccount(
  businessId: string,
  prisma: any
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
  const [sub, count] = await Promise.all([
    getOrCreateSubscription(businessId, prisma),
    prisma.waCredential.count({ where: { businessId } }),
  ]);

  // Treat very large numbers as unlimited
  if (sub.maxWaAccounts >= UNLIMITED_THRESHOLD) {
    return { allowed: true, current: count, limit: -1 };
  }

  if (count >= sub.maxWaAccounts) {
    return {
      allowed: false,
      reason: `Your ${sub.tier} plan allows up to ${sub.maxWaAccounts} WhatsApp account${sub.maxWaAccounts === 1 ? "" : "s"}. Upgrade to add more.`,
      current: count,
      limit: sub.maxWaAccounts,
    };
  }
  return { allowed: true, current: count, limit: sub.maxWaAccounts };
}

/**
 * Checks if the business can add another team member.
 */
export async function canAddTeamMember(
  businessId: string,
  prisma: any
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
  const [sub, count] = await Promise.all([
    getOrCreateSubscription(businessId, prisma),
    prisma.businessMember.count({ where: { businessId } }),
  ]);

  if (count >= sub.maxTeamMembers) {
    return {
      allowed: false,
      reason: `Your ${sub.tier} plan allows up to ${sub.maxTeamMembers} team member${sub.maxTeamMembers === 1 ? "" : "s"}. Upgrade to add more.`,
      current: count,
      limit: sub.maxTeamMembers,
    };
  }
  return { allowed: true, current: count, limit: sub.maxTeamMembers };
}
