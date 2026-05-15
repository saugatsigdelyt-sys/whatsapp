import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { canAddTeamMember } from "../lib/subscription";

export const teamRouter = Router();
teamRouter.use(requireAuth);
teamRouter.use(requireBusiness);

// GET /api/team — list all members with their accessible WA accounts
teamRouter.get("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const members = await prisma.businessMember.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        waAccountAccess: {
          include: {
            waCredential: { select: { id: true, name: true, wabaId: true, appId: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      success: true,
      data: members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
        waAccounts: m.waAccountAccess.map((a) => a.waCredential),
        isCurrentUser: m.user.id === req.user!.userId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/team/invite — add a new team member (tier-checked)
const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "VIEWER"]).default("VIEWER"),
  waCredentialIds: z.array(z.string()).default([]),
});

teamRouter.post("/invite", async (req, res, next) => {
  try {
    const body = inviteSchema.parse(req.body);
    const businessId = req.user!.businessId!;

    // Only OWNER or ADMIN can invite
    const callerMember = await prisma.businessMember.findFirst({
      where: { businessId, userId: req.user!.userId },
    });
    if (!callerMember || callerMember.role === "VIEWER") {
      return res.status(403).json({ success: false, error: "Only owners and admins can invite members" });
    }

    // ── Tier limit check ───────────────────────
    const check = await canAddTeamMember(businessId, prisma);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: check.reason,
        current: check.current,
        limit: check.limit,
        upgradeRequired: true,
      });
    }

    // ── Find or create the user account ───────
    let user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(body.password, 12);
      user = await prisma.user.create({
        data: { email: body.email, name: body.name, passwordHash },
      });
    }

    // Check not already a member
    const alreadyMember = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId: user.id } },
    });
    if (alreadyMember) {
      return res.status(409).json({ success: false, error: "User is already a team member" });
    }

    // ── Create membership + WA access ────────
    const member = await prisma.businessMember.create({
      data: {
        businessId,
        userId: user.id,
        role: body.role,
        waAccountAccess: body.waCredentialIds.length
          ? {
              create: body.waCredentialIds.map((id) => ({ waCredentialId: id })),
            }
          : undefined,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        waAccountAccess: {
          include: { waCredential: { select: { id: true, name: true } } },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: `${body.name} added as a team member`,
      data: {
        id: member.id,
        role: member.role,
        user: member.user,
        waAccounts: member.waAccountAccess.map((a) => a.waCredential),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/team/:memberId/access — update which WA accounts a member can access
teamRouter.put("/:memberId/access", async (req, res, next) => {
  try {
    const { waCredentialIds } = z
      .object({ waCredentialIds: z.array(z.string()) })
      .parse(req.body);
    const businessId = req.user!.businessId!;
    const { memberId } = req.params;

    // Verify member belongs to same business
    const member = await prisma.businessMember.findFirst({
      where: { id: memberId, businessId },
    });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    // Owners always have full access — can't restrict
    if (member.role === "OWNER") {
      return res.status(400).json({ success: false, error: "Cannot restrict owner access" });
    }

    // Verify all credential IDs belong to this business
    const validCreds = await prisma.waCredential.findMany({
      where: { id: { in: waCredentialIds }, businessId },
      select: { id: true },
    });
    const validIds = validCreds.map((c) => c.id);

    // Replace access list atomically
    await prisma.$transaction([
      prisma.waAccountAccess.deleteMany({ where: { businessMemberId: memberId } }),
      prisma.waAccountAccess.createMany({
        data: validIds.map((id) => ({
          businessMemberId: memberId,
          waCredentialId: id,
        })),
      }),
    ]);

    return res.json({
      success: true,
      message: "Access updated",
      data: { memberId, waCredentialIds: validIds },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/team/:memberId/role — change role
teamRouter.patch("/:memberId/role", async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(["ADMIN", "VIEWER"]) }).parse(req.body);
    const businessId = req.user!.businessId!;

    const member = await prisma.businessMember.findFirst({
      where: { id: req.params.memberId, businessId },
    });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });
    if (member.role === "OWNER") {
      return res.status(400).json({ success: false, error: "Cannot change owner role" });
    }

    const updated = await prisma.businessMember.update({
      where: { id: req.params.memberId },
      data: { role },
    });
    return res.json({ success: true, data: { id: updated.id, role: updated.role } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/team/:memberId — remove a team member
teamRouter.delete("/:memberId", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const member = await prisma.businessMember.findFirst({
      where: { id: req.params.memberId, businessId },
    });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });
    if (member.role === "OWNER") {
      return res.status(400).json({ success: false, error: "Cannot remove the owner" });
    }
    if (member.userId === req.user!.userId) {
      return res.status(400).json({ success: false, error: "Cannot remove yourself" });
    }

    await prisma.businessMember.delete({ where: { id: req.params.memberId } });
    return res.json({ success: true, message: "Team member removed" });
  } catch (err) {
    next(err);
  }
});
