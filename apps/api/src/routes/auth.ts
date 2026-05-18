import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../lib/prisma";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  businessName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(payload: object): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// GET /api/auth/registration-status — public, no auth
authRouter.get("/registration-status", async (_req, res, next) => {
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    return res.json({ success: true, data: { enabled: settings?.registrationEnabled ?? true } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
authRouter.post("/register", async (req, res, next) => {
  try {
    // Check if registration is enabled
    const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    if (settings && !settings.registrationEnabled) {
      return res.status(403).json({
        success: false,
        error: "Registration is currently closed. Please contact the administrator.",
        registrationClosed: true,
      });
    }

    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const slug = body.businessName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Check slug uniqueness
    const existingBusiness = await prisma.business.findUnique({ where: { slug } });
    const finalSlug = existingBusiness ? `${slug}-${Date.now()}` : slug;

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        businessMembers: {
          create: {
            role: "OWNER",
            business: {
              create: {
                name: body.businessName,
                slug: finalSlug,
              },
            },
          },
        },
      },
      include: {
        businessMembers: {
          include: { business: true },
        },
      },
    });

    const business = user.businessMembers[0]?.business;
    const token = signToken({
      userId: user.id,
      email: user.email,
      businessId: business?.id,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        business: business ? { id: business.id, name: business.name, slug: business.slug } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        businessMembers: {
          include: { business: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const business = user.businessMembers[0]?.business;
    const token = signToken({
      userId: user.id,
      email: user.email,
      businessId: business?.id,
      role: user.role,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        business: business ? { id: business.id, name: business.name, slug: business.slug } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
authRouter.get("/me", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        businessMembers: {
          include: { business: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const business = user.businessMembers[0]?.business;
    return res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        business: business ? { id: business.id, name: business.name, slug: business.slug } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});
