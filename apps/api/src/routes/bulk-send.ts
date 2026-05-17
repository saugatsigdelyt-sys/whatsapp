import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { sendTemplateMessage } from "../lib/meta";
import { requireAuth, requireBusiness } from "../middleware/auth";

export const bulkSendRouter = Router();
bulkSendRouter.use(requireAuth);
bulkSendRouter.use(requireBusiness);

bulkSendRouter.get("/", async (req, res, next) => {
  try {
    const jobs = await prisma.bulkSendJob.findMany({
      where: { businessId: req.user!.businessId! },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        template: { select: { name: true, status: true } },
        waCredential: { select: { name: true } },
      },
    });
    return res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
});

bulkSendRouter.get("/:id", async (req, res, next) => {
  try {
    const job = await prisma.bulkSendJob.findFirst({
      where: { id: req.params.id, businessId: req.user!.businessId! },
      include: { template: true, waCredential: { select: { name: true } } },
    });
    if (!job) return res.status(404).json({ success: false, error: "Job not found" });
    return res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

const sendSchema = z.object({
  credentialId: z.string(),
  templateId: z.string(),
  recipients: z.array(z.object({ phone: z.string().min(7), params: z.array(z.string()).optional() })).min(1).max(10000),
});

bulkSendRouter.post("/send", async (req, res, next) => {
  try {
    const businessId = req.user!.businessId!;
    const body = sendSchema.parse(req.body);

    const [cred, template] = await Promise.all([
      prisma.waCredential.findFirst({ where: { id: body.credentialId, businessId } }),
      prisma.messageTemplate.findFirst({ where: { id: body.templateId, businessId } }),
    ]);
    if (!cred) return res.status(404).json({ success: false, error: "Credential not found" });
    if (!template) return res.status(404).json({ success: false, error: "Template not found" });
    if (template.status !== "APPROVED") return res.status(400).json({ success: false, error: "Template must be APPROVED before sending" });

    const job = await prisma.bulkSendJob.create({
      data: {
        businessId, waCredentialId: body.credentialId, templateId: body.templateId,
        status: "RUNNING", totalCount: body.recipients.length, recipients: body.recipients,
      },
    });

    const accessToken = decrypt(cred.accessTokenEnc);
    processBulkJob(job.id, template, body.recipients as { phone: string; params?: string[] }[], accessToken, cred.phoneNumberId, businessId).catch(console.error);

    return res.status(202).json({ success: true, data: { jobId: job.id }, message: `Bulk send started for ${body.recipients.length} recipients` });
  } catch (err) { next(err); }
});

async function processBulkJob(
  jobId: string, template: any,
  recipients: Array<{ phone: string; params?: string[] }>,
  accessToken: string, phoneNumberId: string, businessId: string
) {
  let sentCount = 0; let failedCount = 0; const errorLog: any[] = [];

  for (const r of recipients) {
    const components = r.params?.length
      ? [{ type: "body", parameters: r.params.map((p) => ({ type: "text", text: p })) }]
      : undefined;

    const result = await sendTemplateMessage({
      phoneNumberId, accessToken, to: r.phone,
      templateName: template.name, templateLanguage: template.language, components,
    });

    if (result.success) {
      sentCount++;
      await prisma.message.create({
        data: {
          businessId, waMessageId: result.messageId ?? `bulk-${Date.now()}-${r.phone}`,
          direction: "OUTBOUND", status: "SENT",
          fromPhone: phoneNumberId, toPhone: r.phone,
          type: "TEXT", textBody: `[Template: ${template.name}]`, timestamp: new Date(),
        },
      }).catch(() => {});
    } else {
      failedCount++;
      errorLog.push({ phone: r.phone, error: result.error });
    }
    await new Promise((r) => setTimeout(r, 15));
  }

  await prisma.bulkSendJob.update({
    where: { id: jobId },
    data: {
      status: failedCount === recipients.length ? "FAILED" : "COMPLETED",
      sentCount, failedCount, errorLog, completedAt: new Date(),
    },
  });
}
