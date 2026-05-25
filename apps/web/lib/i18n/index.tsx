"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
export type Lang = "en" | "zh";
type TV = string | ((...args: any[]) => string);
type Dict = Record<string, TV>;

// ─── English translations ─────────────────────────────────────────────────────
const en: Dict = {
  // ── Brand / Layout
  waPlatform: "WA Platform",
  yourBusiness: "Your Business",
  signOut: "Sign out",
  currentPlan: "Current plan",
  upgradeArrow: "Upgrade →",

  // ── Nav groups
  navInbox: "Inbox",
  navCampaigns: "Campaigns",
  navAccount: "Account",
  navPlatform: "Platform",

  // ── Nav items
  navChat: "Chat",
  navMessages: "Messages",
  navTemplates: "Templates",
  navBulkSend: "Bulk Send",
  navOverview: "Overview",
  navPhoneNumbers: "Phone Numbers",
  navWebhooks: "Webhooks",
  navEvents: "Events",
  navTeam: "Team",
  navBilling: "Billing",
  navSettings: "Settings",
  navAdminPanel: "Admin Panel",
  navManagerPanel: "Manager Panel",

  // ── Plan labels
  planFree: "Free",
  planStandard: "Standard",
  planPremium: "Premium",
  planPlatinum: "Platinum",

  // ── Common
  cancel: "Cancel",
  save: "Save",
  loading: "Loading...",
  previous: "Previous",
  next: "Next",
  page: "Page",
  of: "of",
  close: "Close",
  generate: "Generate",
  syncing: "Syncing…",
  syncFromMeta: "Sync from Meta",
  upgradeBtn: "Upgrade →",
  yes: "Yes",
  no: "No",
  active: "Active",
  inactive: "Inactive",

  // ── Dashboard Overview
  overviewTitle: "Overview",
  overviewSubtitle: "Your WhatsApp Business at a glance",
  setupRequired: "Setup required:",
  setupRequiredMsg: (settingsHref: string) =>
    `Go to Settings to import your WhatsApp Cloud API credentials.`,
  almostThere: "Almost there:",
  almostThereMsg: "Go to Webhooks to register your webhook with Meta.",
  statTotalMessages: "Total Messages",
  statInbound: "Inbound",
  statOutbound: "Outbound",
  statToday: "Today",

  // ── Settings page
  settingsTitle: "WhatsApp Accounts",
  settingsSubtitle: "Import and manage your WhatsApp Cloud API credentials",
  accountsUsed: (used: number, max: string) => `${used} / ${max} accounts used`,
  upgradePlan: "Upgrade plan",
  noAccountsYet: "No accounts yet. Import your first WhatsApp Cloud API credentials below.",
  loadingAccounts: "Loading accounts...",
  accountLimitReached: "Account limit reached.",
  accountLimitMsg: "Upgrade your plan to connect more accounts.",
  importNewAccount: "Import new WhatsApp account",
  importCredentialsTitle: "Import WhatsApp Cloud API Credentials",
  importCredentialsSubtitle: "Find these in the Meta Developer Portal. All secrets are AES-256 encrypted.",
  fieldAccountLabel: "Account Label",
  fieldAppId: "App ID",
  fieldWabaId: "WhatsApp Business Account ID",
  fieldPhoneNumberId: "Phone Number ID",
  fieldAppSecret: "App Secret",
  fieldAccessToken: "System User Access Token",
  verifyingImporting: "Verifying & importing...",
  importCredentials: "Import credentials",
  webhookActive: "● Webhook active",
  confirmRemoveAccount: "Remove this WhatsApp account?",
  failedToRemoveAccount: "Failed to remove account",
  failedToRename: "Failed to rename",
  placeholderCustomerSupport: "e.g. Customer Support",
  placeholderMetaAppId: "Meta App ID",
  placeholderWabaId: "WABA ID",
  placeholderPhoneNumberId: "Phone Number ID",

  // ── Messages page
  messagesTitle: "Messages",
  messagesSubtitle: (total: number) => `${total} total messages`,
  searchMessages: "Search messages...",
  loadingMessages: "Loading messages...",
  noMessagesYet: "No messages yet. They will appear here once your webhook is set up.",
  colDirection: "Direction",
  colFrom: "From",
  colTo: "To",
  colMessage: "Message",
  colStatus: "Status",
  colTime: "Time",
  dirIn: "In",
  dirOut: "Out",

  // ── Team page
  teamTitle: "Team Members",
  teamSubtitle: "Manage who can access your WhatsApp accounts",
  teamUsage: (used: number, max: string) => `${used} / ${max} team members`,
  upgradeForMoreSeats: "Upgrade for more seats",
  loadingTeam: "Loading team...",
  roleOwner: "Owner",
  roleAdmin: "Admin",
  roleViewer: "Viewer",
  noAccountAccessAssigned: "No account access assigned",
  editAccess: "Edit access",
  ownerHasAllAccess: "Owner has access to all accounts",
  selectAccountsForMember: "Select accounts this member can access:",
  savingAccess: "Saving...",
  saveAccess: "Save access",
  seatLimitReached: "Seat limit reached.",
  seatLimitMsg: "Upgrade to add more team members.",
  addTeamMember: "Add team member",
  inviteTeamMember: "Invite a team member",
  fieldFullName: "Full Name",
  fieldEmail: "Email",
  fieldTempPassword: "Temporary Password",
  fieldRole: "Role",
  placeholderFullName: "Jane Smith",
  placeholderEmail: "jane@company.com",
  placeholderMinChars: "Min. 8 characters",
  optionViewerReadOnly: "Viewer — read only",
  optionAdminCanManage: "Admin — can manage",
  addingMember: "Adding member...",
  youLabel: "(you)",
  failedToUpdateAccess: "Failed to update access",
  failedToRemoveMember: "Failed to remove member",
  confirmRemoveMember: (name: string) => `Remove ${name} from your team?`,

  // ── Webhooks page
  webhooksTitle: "Webhooks",
  webhooksSubtitle: "Subscribe to Meta webhook events for your WhatsApp account",
  webhookRegistered: "Webhook registered with Meta",
  webhookNotRegistered: "Webhook not yet registered",
  webhookRegisteredMsg: "All 11 webhook fields are subscribed. Meta will POST events to your receiver.",
  webhookNotRegisteredMsg: "Register your webhook to start receiving WhatsApp events. Make sure your credentials are imported first.",
  registeringWebhook: "Registering...",
  reRegisterWebhook: "Re-register webhook",
  registerWebhookWithMeta: "Register webhook with Meta",
  subscribedWebhookFields: "Subscribed Webhook Fields (11)",

  // ── Events page
  eventsTitle: "Account Events",
  eventsSubtitle: "Non-message webhook events from Meta",
  loadingEvents: "Loading events...",
  noEventsYet: "No events yet. Register your webhook to start receiving account events.",
  pageOf: (page: number, total: number) => `Page ${page} of ${total}`,

  // ── Phone Numbers page
  phoneNumbersTitle: "Phone Numbers",
  phoneNumbersSubtitle: "WhatsApp Business phone numbers on your account",
  loadingPhoneNumbers: "Loading...",
  noPhoneNumbers: "No phone numbers found. Import your credentials to sync phone numbers.",
  colPhone: "Phone",
  colVerifiedName: "Verified Name",
  colQuality: "Quality",
  colPhoneNumberId: "Phone Number ID",

  // ── Templates page
  templatesTitle: "Message Templates",
  templatesSubtitle: "Design and submit WhatsApp templates for Meta approval. Approved templates can be sent in bulk.",
  newTemplate: "New Template",
  allAccounts: "All accounts",
  searchTemplates: "Search templates…",
  clearFilter: "Clear filter",
  noAccountsConnected: "No WhatsApp accounts connected yet.",
  goToSettingsImport: "Go to Settings → Import Credentials first.",
  noTemplatesMatchFilter: "No templates match your filters.",
  noTemplatesFound: `No templates found. Click "Sync from Meta" to pull existing templates, or create a new one.`,
  showingXOfY: (shown: number, total: number) => `Showing ${shown} of ${total} templates`,
  accountLabel: "Account:",
  noBody: "No body",
  createTemplateTitle: "Create Message Template",
  templateNameLabel: "Template Name *",
  templateNameHint: "Lowercase, numbers, underscores only",
  categoryLabel: "Category *",
  catMarketing: "Marketing",
  catUtility: "Utility",
  catAuthentication: "Authentication",
  languageLabel: "Language *",
  headerLabel: "Header",
  optionalLabel: "(optional)",
  none: "None",
  text: "Text",
  image: "Image",
  headerTextPlaceholder: "Header text (max 60 chars)",
  imageUploadNote: "Image will be uploaded when sending the template",
  bodyLabel: "Body",
  addVariable: "Add variable",
  bodyPlaceholder: "Hi {{1}}, your order {{2}} has been confirmed. Thank you for shopping with us!",
  bodyHint: "Use {{1}}, {{2}} etc. for dynamic variables",
  footerLabel: "Footer",
  footerPlaceholder: "Not interested? Tap Stop promotions",
  buttonsLabel: "Buttons",
  buttonsOptional: "(optional, max 3)",
  quickReply: "Quick Reply",
  urlButton: "URL",
  callButton: "Call",
  noButtonsAdded: "No buttons added. Use the buttons above to add Quick Reply, URL, or Call buttons.",
  replyText: "Reply Text",
  buttonText: "Button Text",
  buttonLabelPlaceholder: "Button label",
  livePreview: "Live Preview",
  previewUpdates: "Preview updates as you type",
  templateSubmitNote: "Templates submitted for Meta review. Approval typically takes a few minutes to 24 hours.",
  submittingTemplate: "Submitting…",
  submitToMeta: "Submit to Meta",
  chooseAccount: "Choose Account",
  chooseAccountMsg: "Which WhatsApp account should this template be created for?",
  continueBtn: "Continue",
  errTemplateNameRequired: "Template name is required",
  errTemplateNameFormat: "Name must be lowercase letters, numbers and underscores only",
  errBodyRequired: "Body text is required",
  errButtonTextsRequired: "All button texts are required",
  syncFailed: "Sync failed",
  deleteLocallyConfirm: "Delete this template locally? (It will remain on Meta.)",
  deleteFailed: "Delete failed",

  // ── Chat page
  noPhones: "No phones",
  conversationsLabel: "Conversations",
  liveLabel: "Live",
  searchConversations: "Search conversations...",
  selectPhoneAccount: "Select a phone account",
  noConversationsYet: "No conversations yet",
  selectConversation: "Select a conversation",
  chooseFromListToChat: "Choose from the list to start chatting",
  viaLabel: "via",
  typeAMessage: "Type a message...",
  failedToSend: "Failed to send",

  // ── Bulk Send page
  bulkSendTitle: "Bulk Send",
  bulkSendSubtitle: "Send approved WhatsApp templates to a list of recipients",
  stepSelectAccount: "Select WhatsApp Account",
  chooseAccountOption: "— Choose account —",
  stepSelectTemplate: "Select Approved Template",
  noApprovedTemplates: (templatesHref: string) =>
    `No approved templates found. Go to Templates to create and get approval, or click "Sync from Meta" above.`,
  stepUploadRecipients: "Upload Recipients",
  exampleCsv: "Example CSV",
  clickToUploadCsv: "Click to upload CSV",
  csvFormatHint: "One phone number per row. International format (e.g. 447700900000)",
  orPasteNumbers: "or paste numbers below",
  uniqueNumbersReady: (n: number) => `${n} unique numbers ready`,
  bulkSendWarning: (name: string, count: number) =>
    `⚠️ This will send the ${name} template to ${count} numbers. WhatsApp charges per message. Make sure your recipients have opted in.`,
  startingBulkSend: "Starting bulk send…",
  sendToRecipients: (n: number) => `Send to ${n} recipients`,
  sendHistory: "Send History",
  failedRecipients: "Failed recipients",
  sentLabel: "sent",
  runningLabel: "Running",
  bulkStarted: (jobId: string) => `Bulk send started! Job ID: ${jobId}`,

  // ── Billing page
  billingTitle: "Billing & Plans",
  billingSubtitle: "Manage your balance and subscription",
  currentBalance: "Current Balance",
  currentPlanLabel: "Current Plan",
  expiresLabel: "Expires",
  paymentLabel: "Payment",
  cryptoViaOxapay: "Crypto via OxaPay",
  cryptoCoins: "BTC · ETH · USDT · LTC · BNB + more",
  payByInvoice: "Pay by Invoice",
  invoiceNote: "One-time payment link — choose any crypto at checkout",
  amountLabel: (min: number) => `Amount (USD, min $${min})`,
  paymentLinkReady: "Payment link ready!",
  payNow: "Pay now",
  permanentDepositAddress: "Permanent Deposit Address",
  permanentDepositNote: "Set once — any deposit auto-credits your balance forever",
  selectNetworkToGenerate: "Select network to generate…",
  allNetworksGenerated: "All supported networks have been generated below.",
  yourDepositAddresses: "Your Deposit Addresses",
  permanentAddressNote: "Permanent address · Any deposit auto-credits your balance",
  scanToSend: "Scan to Send",
  networkLabel: "Network",
  addressLabel: "Address",
  qrCode: "QR Code",
  upgradePlanTitle: "Upgrade Plan",
  billedMonthly: "Billed monthly from your balance",
  popularBadge: "Popular",
  perMonth: "/mo",
  currentPlanBtn: "Current Plan",
  needMoreFunds: (amount: number) => `Need $${amount.toFixed(2)} more`,
  getPlan: (label: string) => `Get ${label}`,
  transactionHistory: "Transaction History",
  noTransactionsYet: "No transactions yet",
  balanceLabel: "Balance:",
  planFeature3WA: "3 WA Accounts",
  planFeature5Team: "5 Team members",
  planFeatureAllMsg: "All messaging features",
  planFeature10WA: "10 WA Accounts",
  planFeature20Team: "20 Team members",
  planFeaturePriority: "Priority support",
  planFeature50WA: "50 WA Accounts",
  planFeature100Team: "100 Team members",
  planFeatureDedicated: "Dedicated support",
  purchasePlanConfirm: (tier: string, price: number) => `Purchase ${tier} plan for $${price} from your balance?`,

  // ── Login page
  whatsappSaas: "WhatsApp SaaS",
  signInToAccount: "Sign in to your account",
  accountCreatedSuccess: "Account created successfully! Sign in below.",
  invalidCredentials: "Invalid email, password, or security code",
  emailLabel: "Email",
  passwordLabel: "Password",
  securityCodeLabel: "Security Code",
  enterSecurityCode: "Please enter the security code",
  newCode: "New code",
  typeCodeAbove: "Type the code shown above",
  signingIn: "Signing in...",
  signIn: "Sign in",
  noAccount: "Don't have an account?",
  createOne: "Create one",
  emailPlaceholder: "you@company.com",
  passwordPlaceholder: "••••••••",

  // ── Register page
  registrationClosed: "Registration Closed",
  registrationClosedMsg: "New account registration is not currently available. Please contact the administrator for access.",
  backToLogin: "Back to Login",
  accountCreated: "Account Created!",
  accountCreatedMsg: "Your account has been created successfully. You can now sign in with your email and password.",
  goToLogin: "Go to Login",
  createYourAccount: "Create your account",
  startManagingWA: "Start managing your WhatsApp Business",
  fieldBusinessName: "Business Name",
  placeholderYourName: "Your name",
  placeholderBusinessName: "My Company",
  enterCaptchaCode: "Please enter the captcha code",
  creatingAccount: "Creating account…",
  createAccount: "Create account",
  alreadyHaveAccount: "Already have an account?",
};

// ─── Chinese Simplified translations ─────────────────────────────────────────
const zh: Dict = {
  // ── Brand / Layout
  waPlatform: "WA 平台",
  yourBusiness: "您的业务",
  signOut: "退出登录",
  currentPlan: "当前计划",
  upgradeArrow: "升级 →",

  // ── Nav groups
  navInbox: "收件箱",
  navCampaigns: "营销活动",
  navAccount: "账户",
  navPlatform: "平台",

  // ── Nav items
  navChat: "聊天",
  navMessages: "消息",
  navTemplates: "模板",
  navBulkSend: "批量发送",
  navOverview: "总览",
  navPhoneNumbers: "电话号码",
  navWebhooks: "Webhooks",
  navEvents: "事件",
  navTeam: "团队",
  navBilling: "账单",
  navSettings: "设置",
  navAdminPanel: "管理面板",
  navManagerPanel: "经理面板",

  // ── Plan labels
  planFree: "免费",
  planStandard: "标准",
  planPremium: "高级",
  planPlatinum: "铂金",

  // ── Common
  cancel: "取消",
  save: "保存",
  loading: "加载中...",
  previous: "上一页",
  next: "下一页",
  page: "第",
  of: "共",
  close: "关闭",
  generate: "生成",
  syncing: "同步中…",
  syncFromMeta: "从 Meta 同步",
  upgradeBtn: "升级 →",
  yes: "是",
  no: "否",
  active: "已激活",
  inactive: "未激活",

  // ── Dashboard Overview
  overviewTitle: "总览",
  overviewSubtitle: "您的 WhatsApp 业务概览",
  setupRequired: "需要设置：",
  setupRequiredMsg: () => "前往设置以导入您的 WhatsApp Cloud API 凭据。",
  almostThere: "即将完成：",
  almostThereMsg: "前往 Webhooks 以向 Meta 注册您的 Webhook。",
  statTotalMessages: "总消息数",
  statInbound: "入站",
  statOutbound: "出站",
  statToday: "今日",

  // ── Settings page
  settingsTitle: "WhatsApp 账户",
  settingsSubtitle: "导入和管理您的 WhatsApp Cloud API 凭据",
  accountsUsed: (used: number, max: string) => `${used} / ${max} 账户已使用`,
  upgradePlan: "升级计划",
  noAccountsYet: "尚无账户。请在下方导入您的第一个 WhatsApp Cloud API 凭据。",
  loadingAccounts: "加载账户中...",
  accountLimitReached: "已达账户上限。",
  accountLimitMsg: "升级计划以连接更多账户。",
  importNewAccount: "导入新 WhatsApp 账户",
  importCredentialsTitle: "导入 WhatsApp Cloud API 凭据",
  importCredentialsSubtitle: "在 Meta 开发者门户中查找。所有密钥均使用 AES-256 加密。",
  fieldAccountLabel: "账户标签",
  fieldAppId: "应用程序 ID",
  fieldWabaId: "WhatsApp Business 账户 ID",
  fieldPhoneNumberId: "电话号码 ID",
  fieldAppSecret: "应用程序密钥",
  fieldAccessToken: "系统用户访问令牌",
  verifyingImporting: "验证并导入中...",
  importCredentials: "导入凭据",
  webhookActive: "● Webhook 已激活",
  confirmRemoveAccount: "删除此 WhatsApp 账户？",
  failedToRemoveAccount: "删除账户失败",
  failedToRename: "重命名失败",
  placeholderCustomerSupport: "例如：客户支持",
  placeholderMetaAppId: "Meta 应用程序 ID",
  placeholderWabaId: "WABA ID",
  placeholderPhoneNumberId: "电话号码 ID",

  // ── Messages page
  messagesTitle: "消息",
  messagesSubtitle: (total: number) => `共 ${total} 条消息`,
  searchMessages: "搜索消息...",
  loadingMessages: "加载消息中...",
  noMessagesYet: "尚无消息。设置 Webhook 后将在此处显示。",
  colDirection: "方向",
  colFrom: "发件方",
  colTo: "收件方",
  colMessage: "消息",
  colStatus: "状态",
  colTime: "时间",
  dirIn: "入站",
  dirOut: "出站",

  // ── Team page
  teamTitle: "团队成员",
  teamSubtitle: "管理谁可以访问您的 WhatsApp 账户",
  teamUsage: (used: number, max: string) => `${used} / ${max} 位团队成员`,
  upgradeForMoreSeats: "升级以获得更多席位",
  loadingTeam: "加载团队中...",
  roleOwner: "所有者",
  roleAdmin: "管理员",
  roleViewer: "观察者",
  noAccountAccessAssigned: "未分配账户访问权限",
  editAccess: "编辑访问权限",
  ownerHasAllAccess: "所有者可访问所有账户",
  selectAccountsForMember: "选择该成员可访问的账户：",
  savingAccess: "保存中...",
  saveAccess: "保存访问权限",
  seatLimitReached: "席位已达上限。",
  seatLimitMsg: "升级以添加更多团队成员。",
  addTeamMember: "添加团队成员",
  inviteTeamMember: "邀请团队成员",
  fieldFullName: "全名",
  fieldEmail: "电子邮件",
  fieldTempPassword: "临时密码",
  fieldRole: "角色",
  placeholderFullName: "张三",
  placeholderEmail: "zhang@company.com",
  placeholderMinChars: "最少 8 个字符",
  optionViewerReadOnly: "观察者 — 只读",
  optionAdminCanManage: "管理员 — 可管理",
  addingMember: "添加成员中...",
  youLabel: "（您）",
  failedToUpdateAccess: "更新访问权限失败",
  failedToRemoveMember: "删除成员失败",
  confirmRemoveMember: (name: string) => `将 ${name} 从团队中移除？`,

  // ── Webhooks page
  webhooksTitle: "Webhooks",
  webhooksSubtitle: "为您的 WhatsApp 账户订阅 Meta Webhook 事件",
  webhookRegistered: "Webhook 已向 Meta 注册",
  webhookNotRegistered: "Webhook 尚未注册",
  webhookRegisteredMsg: "所有 11 个 Webhook 字段已订阅。Meta 将向您的接收器 POST 事件。",
  webhookNotRegisteredMsg: "注册 Webhook 以开始接收 WhatsApp 事件。请先确保已导入凭据。",
  registeringWebhook: "注册中...",
  reRegisterWebhook: "重新注册 Webhook",
  registerWebhookWithMeta: "向 Meta 注册 Webhook",
  subscribedWebhookFields: "已订阅的 Webhook 字段 (11)",

  // ── Events page
  eventsTitle: "账户事件",
  eventsSubtitle: "来自 Meta 的非消息 Webhook 事件",
  loadingEvents: "加载事件中...",
  noEventsYet: "尚无事件。注册 Webhook 以开始接收账户事件。",
  pageOf: (page: number, total: number) => `第 ${page} 页，共 ${total} 页`,

  // ── Phone Numbers page
  phoneNumbersTitle: "电话号码",
  phoneNumbersSubtitle: "您账户上的 WhatsApp Business 电话号码",
  loadingPhoneNumbers: "加载中...",
  noPhoneNumbers: "未找到电话号码。导入凭据以同步电话号码。",
  colPhone: "电话",
  colVerifiedName: "已验证名称",
  colQuality: "质量",
  colPhoneNumberId: "电话号码 ID",

  // ── Templates page
  templatesTitle: "消息模板",
  templatesSubtitle: "设计并提交 WhatsApp 模板供 Meta 审批。已批准的模板可以批量发送。",
  newTemplate: "新建模板",
  allAccounts: "所有账户",
  searchTemplates: "搜索模板…",
  clearFilter: "清除筛选",
  noAccountsConnected: "尚未连接任何 WhatsApp 账户。",
  goToSettingsImport: "请先前往设置 → 导入凭据。",
  noTemplatesMatchFilter: "没有匹配您筛选条件的模板。",
  noTemplatesFound: `未找到模板。点击"从 Meta 同步"以拉取现有模板，或新建一个。`,
  showingXOfY: (shown: number, total: number) => `显示 ${shown} / ${total} 个模板`,
  accountLabel: "账户：",
  noBody: "无正文",
  createTemplateTitle: "创建消息模板",
  templateNameLabel: "模板名称 *",
  templateNameHint: "仅小写字母、数字和下划线",
  categoryLabel: "分类 *",
  catMarketing: "营销",
  catUtility: "实用",
  catAuthentication: "认证",
  languageLabel: "语言 *",
  headerLabel: "标题",
  optionalLabel: "（可选）",
  none: "无",
  text: "文本",
  image: "图片",
  headerTextPlaceholder: "标题文本（最多 60 个字符）",
  imageUploadNote: "发送模板时将上传图片",
  bodyLabel: "正文",
  addVariable: "添加变量",
  bodyPlaceholder: "您好 {{1}}，您的订单 {{2}} 已确认。感谢您的惠顾！",
  bodyHint: "使用 {{1}}、{{2}} 等表示动态变量",
  footerLabel: "页脚",
  footerPlaceholder: "不感兴趣？点击停止推广",
  buttonsLabel: "按钮",
  buttonsOptional: "（可选，最多 3 个）",
  quickReply: "快速回复",
  urlButton: "链接",
  callButton: "拨打电话",
  noButtonsAdded: "未添加按钮。使用上方按钮添加快速回复、链接或拨打电话按钮。",
  replyText: "回复文本",
  buttonText: "按钮文本",
  buttonLabelPlaceholder: "按钮标签",
  livePreview: "实时预览",
  previewUpdates: "预览将随输入实时更新",
  templateSubmitNote: "模板已提交 Meta 审核。审核通常需要几分钟到 24 小时。",
  submittingTemplate: "提交中…",
  submitToMeta: "提交至 Meta",
  chooseAccount: "选择账户",
  chooseAccountMsg: "此模板应为哪个 WhatsApp 账户创建？",
  continueBtn: "继续",
  errTemplateNameRequired: "模板名称为必填项",
  errTemplateNameFormat: "名称只能包含小写字母、数字和下划线",
  errBodyRequired: "正文文本为必填项",
  errButtonTextsRequired: "所有按钮文本均为必填项",
  syncFailed: "同步失败",
  deleteLocallyConfirm: "从本地删除此模板？（它将保留在 Meta 上。）",
  deleteFailed: "删除失败",

  // ── Chat page
  noPhones: "无电话",
  conversationsLabel: "会话",
  liveLabel: "实时",
  searchConversations: "搜索会话...",
  selectPhoneAccount: "选择一个电话账户",
  noConversationsYet: "尚无会话",
  selectConversation: "选择一个会话",
  chooseFromListToChat: "从列表中选择以开始聊天",
  viaLabel: "通过",
  typeAMessage: "输入消息...",
  failedToSend: "发送失败",

  // ── Bulk Send page
  bulkSendTitle: "批量发送",
  bulkSendSubtitle: "向接收者列表发送已批准的 WhatsApp 模板",
  stepSelectAccount: "选择 WhatsApp 账户",
  chooseAccountOption: "— 选择账户 —",
  stepSelectTemplate: "选择已批准的模板",
  noApprovedTemplates: () =>
    `未找到已批准的模板。前往模板页面创建并获得审批，或点击上方的"从 Meta 同步"。`,
  stepUploadRecipients: "上传收件人",
  exampleCsv: "示例 CSV",
  clickToUploadCsv: "点击上传 CSV",
  csvFormatHint: "每行一个电话号码。国际格式（例如 447700900000）",
  orPasteNumbers: "或在下方粘贴号码",
  uniqueNumbersReady: (n: number) => `${n} 个唯一号码已准备就绪`,
  bulkSendWarning: (name: string, count: number) =>
    `⚠️ 这将向 ${count} 个号码发送 ${name} 模板。WhatsApp 按消息收费。请确保您的收件人已选择接收。`,
  startingBulkSend: "开始批量发送…",
  sendToRecipients: (n: number) => `发送给 ${n} 位收件人`,
  sendHistory: "发送历史",
  failedRecipients: "发送失败的收件人",
  sentLabel: "已发送",
  runningLabel: "运行中",
  bulkStarted: (jobId: string) => `批量发送已启动！任务 ID：${jobId}`,

  // ── Billing page
  billingTitle: "账单与计划",
  billingSubtitle: "管理您的余额和订阅",
  currentBalance: "当前余额",
  currentPlanLabel: "当前计划",
  expiresLabel: "到期",
  paymentLabel: "付款",
  cryptoViaOxapay: "通过 OxaPay 加密货币支付",
  cryptoCoins: "BTC · ETH · USDT · LTC · BNB + 更多",
  payByInvoice: "通过发票支付",
  invoiceNote: "一次性付款链接 — 结账时选择任意加密货币",
  amountLabel: (min: number) => `金额（美元，最低 $${min}）`,
  paymentLinkReady: "付款链接已就绪！",
  payNow: "立即付款",
  permanentDepositAddress: "永久存款地址",
  permanentDepositNote: "设置一次 — 任何存款都将永久自动记入您的余额",
  selectNetworkToGenerate: "选择网络以生成…",
  allNetworksGenerated: "所有支持的网络已在下方生成。",
  yourDepositAddresses: "您的存款地址",
  permanentAddressNote: "永久地址 · 任何存款都将自动记入您的余额",
  scanToSend: "扫描发送",
  networkLabel: "网络",
  addressLabel: "地址",
  qrCode: "二维码",
  upgradePlanTitle: "升级计划",
  billedMonthly: "从余额中按月扣费",
  popularBadge: "热门",
  perMonth: "/月",
  currentPlanBtn: "当前计划",
  needMoreFunds: (amount: number) => `还需 $${amount.toFixed(2)}`,
  getPlan: (label: string) => `获取${label}`,
  transactionHistory: "交易历史",
  noTransactionsYet: "暂无交易",
  balanceLabel: "余额：",
  planFeature3WA: "3 个 WA 账户",
  planFeature5Team: "5 位团队成员",
  planFeatureAllMsg: "所有消息功能",
  planFeature10WA: "10 个 WA 账户",
  planFeature20Team: "20 位团队成员",
  planFeaturePriority: "优先支持",
  planFeature50WA: "50 个 WA 账户",
  planFeature100Team: "100 位团队成员",
  planFeatureDedicated: "专属支持",
  purchasePlanConfirm: (tier: string, price: number) => `从余额中购买 ${tier} 计划（$${price}）？`,

  // ── Login page
  whatsappSaas: "WhatsApp SaaS",
  signInToAccount: "登录您的账户",
  accountCreatedSuccess: "账户创建成功！请在下方登录。",
  invalidCredentials: "无效的邮箱、密码或安全码",
  emailLabel: "电子邮件",
  passwordLabel: "密码",
  securityCodeLabel: "安全码",
  enterSecurityCode: "请输入安全码",
  newCode: "新验证码",
  typeCodeAbove: "请输入上方显示的验证码",
  signingIn: "登录中...",
  signIn: "登录",
  noAccount: "没有账户？",
  createOne: "立即注册",
  emailPlaceholder: "you@company.com",
  passwordPlaceholder: "••••••••",

  // ── Register page
  registrationClosed: "注册已关闭",
  registrationClosedMsg: "目前无法注册新账户。请联系管理员获取访问权限。",
  backToLogin: "返回登录",
  accountCreated: "账户已创建！",
  accountCreatedMsg: "您的账户已成功创建。您现在可以使用邮箱和密码登录。",
  goToLogin: "前往登录",
  createYourAccount: "创建您的账户",
  startManagingWA: "开始管理您的 WhatsApp 业务",
  fieldBusinessName: "业务名称",
  placeholderYourName: "您的姓名",
  placeholderBusinessName: "我的公司",
  enterCaptchaCode: "请输入验证码",
  creatingAccount: "创建账户中…",
  createAccount: "创建账户",
  alreadyHaveAccount: "已有账户？",
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nCtx>({ lang: "en", setLang: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored === "en" || stored === "zh") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  return <I18nContext.Provider value={{ lang, setLang }}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  const { lang } = useI18n();
  const dict: Dict = lang === "zh" ? zh : en;

  return useCallback(
    (key: string, ...args: any[]): string => {
      const val = dict[key] ?? en[key] ?? key;
      if (typeof val === "function") return val(...args);
      return val as string;
    },
    [dict]
  );
}

// ─── Language Switcher ────────────────────────────────────────────────────────
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          lang === "en"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("zh")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          lang === "zh"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        中文
      </button>
    </div>
  );
}
