import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { getMessageTemplates, createMessageTemplate } from "../lib/meta";
import { requireAuth, requireBusiness } from "../middleware/auth";

export const templatesRouter = Router();
templatesRouter.use(requireAuth);
templatesRouter.use(requireBusiness);

// GET /api/templates
templatesRouter.get("/", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const credentialId = req.query.credentialId as string | undefined;
    const templates = await prisma.messageTemplate.findMany({
      where: { businessId, ...(credentialId ? { waCredentialId: credentialId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: templates });
  } catch (err) { next(err); }
});

// POST /api/templates/sync
templatesRouter.post("/sync", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const { credentialId } = req.body as { credentialId: string };
    if (!credentialId) return res.status(400).json({ success: false, error: "credentialId required" });

    const cred = await prisma.waCredential.findFirst({ where: { id: credentialId, businessId } });
    if (!cred) return res.status(404).json({ success: false, error: "Credential not found" });

    const accessToken = decrypt(cred.accessTokenEnc);
    const result = await getMessageTemplates({ wabaId: cred.wabaId, accessToken });
    if (!result.success) return res.status(400).json({ success: false, error: result.error });

    let synced = 0;
    for (const t of result.templates ?? []) {
      await prisma.messageTemplate.upsert({
        where: { waCredentialId_metaTemplateId: { waCredentialId: credentialId, metaTemplateId: String(t.id) } },
        update: { name: t.name, language: t.language, category: t.category, status: t.status, components: t.components ?? [] },
        create: {
          businessId, waCredentialId: credentialId,
          metaTemplateId: String(t.id), name: t.name, language: t.language,
          category: t.category, status: t.status, components: t.components ?? [],
        },
      });
      synced++;
    }
    return res.json({ success: true, message: `Synced ${synced} templates`, synced });
  } catch (err) { next(err); }
});

// POST /api/templates/create
const createSchema = z.object({
  credentialId: z.string(),
  name: z.string().min(1).max(512).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
  language: z.string().default("en_US"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  components: z.array(z.any()).min(1),
});

templatesRouter.post("/create", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const body = createSchema.parse(req.body);

    const cred = await prisma.waCredential.findFirst({ where: { id: body.credentialId, businessId } });
    if (!cred) return res.status(404).json({ success: false, error: "Credential not found" });

    const accessToken = decrypt(cred.accessTokenEnc);
    const result = await createMessageTemplate({
      wabaId: cred.wabaId, accessToken,
      name: body.name, language: body.language,
      category: body.category, components: body.components,
    });
    if (!result.success) return res.status(400).json({ success: false, error: result.error });

    const template = await prisma.messageTemplate.create({
      data: {
        businessId, waCredentialId: body.credentialId,
        metaTemplateId: result.templateId ?? `pending-${Date.now()}`,
        name: body.name, language: body.language,
        category: body.category, status: result.status ?? "PENDING",
        components: body.components,
      },
    });
    return res.status(201).json({ success: true, data: template, message: "Template submitted to Meta for approval" });
  } catch (err) { next(err); }
});

// DELETE /api/templates/:id
templatesRouter.delete("/:id", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const tpl = await prisma.messageTemplate.findFirst({ where: { id: req.params.id, businessId } });
    if (!tpl) return res.status(404).json({ success: false, error: "Template not found" });
    await prisma.messageTemplate.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) { next(err); }
});
