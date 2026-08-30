var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl, supabaseKey, supabaseAdmin;
var init_supabaseAdmin = __esm({
  "src/lib/supabaseAdmin.ts"() {
    if (typeof globalThis.WebSocket === "undefined") {
      globalThis.WebSocket = class {
      };
    }
    supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseKey) {
      console.error("[SupabaseAdmin] CRITICAL: SUPABASE credentials missing from environment.");
    } else {
      const isServiceKey = !!process.env.SUPABASE_SECRET_KEY;
      console.log(`[SupabaseAdmin] Initializing with ${isServiceKey ? "SERVICE_ROLE" : "ANON"} key. URL: ${supabaseUrl.substring(0, 20)}...`);
    }
    supabaseAdmin = createClient(
      supabaseUrl,
      supabaseKey,
      {
        db: {
          schema: "public"
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }
});

// src/modules/activity/activity.service.ts
var activity_service_exports = {};
__export(activity_service_exports, {
  ActivityService: () => ActivityService
});
var ActivityService;
var init_activity_service = __esm({
  "src/modules/activity/activity.service.ts"() {
    init_supabaseAdmin();
    ActivityService = class {
      static async log(data) {
        const { data: activity, error } = await supabaseAdmin.from("activities").insert({
          type: data.type,
          description: data.description,
          metadata: data.metadata,
          user_id: data.userId,
          lead_id: data.leadId,
          workspace_id: data.workspaceId
        }).select().single();
        if (error) throw error;
        return activity;
      }
      static async getWorkspaceActivity(workspaceId, limit = 20) {
        try {
          const { data, error } = await supabaseAdmin.from("activities").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(limit);
          if (error) throw error;
          return data || [];
        } catch (err) {
          console.error("Error fetching activity:", err);
          return [];
        }
      }
      static async getEmailLogs(workspaceId, limit = 100) {
        try {
          const { data, error } = await supabaseAdmin.from("activities").select(`
          *,
          lead:leads(id, first_name, last_name, email)
        `).eq("workspace_id", workspaceId).in("type", [
            "EMAIL_SENT",
            "EMAIL_OPENED",
            "EMAIL_CLICKED",
            "EMAIL_BOUNCED",
            "EMAIL_FAILED",
            "EMAIL_SUPPRESSED",
            "EMAIL_SPAM",
            "EMAIL_BLOCKED",
            "EMAIL_UNSUBSCRIBED",
            "REPLY"
          ]).order("created_at", { ascending: false }).limit(limit);
          if (!error && data) {
            return data;
          }
          if (error) {
            console.warn("[ActivityService] Joined query had error, falling back to simple select:", error.message);
          }
        } catch (err) {
          console.warn("[ActivityService] Joined email logs query failed:", err);
        }
        try {
          const { data, error } = await supabaseAdmin.from("activities").select("*").eq("workspace_id", workspaceId).in("type", [
            "EMAIL_SENT",
            "EMAIL_OPENED",
            "EMAIL_CLICKED",
            "EMAIL_BOUNCED",
            "EMAIL_FAILED",
            "EMAIL_SUPPRESSED",
            "EMAIL_SPAM",
            "EMAIL_BLOCKED",
            "EMAIL_UNSUBSCRIBED",
            "REPLY"
          ]).order("created_at", { ascending: false }).limit(limit);
          if (error) throw error;
          return data || [];
        } catch (err) {
          console.error("Error fetching fallback email logs:", err);
          return [];
        }
      }
    };
  }
});

// src/serverApp.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// src/lib/middleware.ts
init_supabaseAdmin();
import { decodeJwt } from "jose";
var supabaseUrl2 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var profileCache = {};
var CACHE_TTL = 6e4;
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({ error: "Unauthorized: Invalid token string" });
    }
    let sbUser = null;
    let authError = null;
    try {
      const auth = supabaseAdmin.auth;
      const { data, error } = await auth.getUser(token);
      if (error) {
        if (error.message?.includes("session missing")) {
          const decoded = decodeJwt(token);
          if (decoded?.sub) {
            const { data: adminData, error: adminError } = await auth.admin?.getUserById(decoded.sub);
            if (adminData?.user && !adminError) {
              sbUser = adminData.user;
            } else {
              authError = adminError || new Error("Fallback failed");
            }
          }
        } else {
          authError = error;
        }
      } else {
        sbUser = data?.user;
      }
    } catch (e) {
      const auth = supabaseAdmin.auth;
      const decoded = decodeJwt(token);
      if (decoded?.sub) {
        const { data: adminData } = await auth.admin?.getUserById(decoded.sub);
        if (adminData?.user) {
          sbUser = adminData.user;
        } else {
          authError = e;
        }
      } else {
        authError = e;
      }
    }
    if (!sbUser) {
      console.error("[AuthMiddleware] Auth failed:", authError?.message || "No user found");
      return res.status(401).json({
        error: "Unauthorized: Invalid session",
        details: authError?.message || "Verification failed."
      });
    }
    const refinedEmail = (sbUser.email || "").toLowerCase().trim();
    const cached = profileCache[sbUser.id];
    let userProfile = null;
    let profileError = null;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      userProfile = cached.profile;
    } else {
      const res2 = await supabaseAdmin.from("users").select("id, email, role, workspace_id").eq("email", refinedEmail).maybeSingle();
      userProfile = res2.data;
      profileError = res2.error;
      if (userProfile && !profileError) {
        profileCache[sbUser.id] = { profile: userProfile, timestamp: Date.now() };
      }
    }
    if (profileError) {
      console.error("[AuthMiddleware] Profile fetch error:", profileError.message || profileError);
      if (profileError.message?.includes("schema cache")) {
        console.error('[AuthMiddleware] CRITICAL: The "users" table was not found in the Supabase schema cache.');
        console.error('[AuthMiddleware] SOLUTION: Please ensure you have run the schema.sql in your Supabase SQL Editor and that the "users" table exists in the "public" schema.');
      }
      console.error("[AuthMiddleware] Profile fetch error details:", JSON.stringify(profileError, null, 2));
    }
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@transferlegacy.com").toLowerCase().trim();
    const isSuperAdmin = refinedEmail === adminEmail;
    if (!userProfile && !isSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: No authorized profile found." });
    }
    const userRole = isSuperAdmin ? "SUPER_ADMIN" : userProfile?.role || "VIEWER";
    const workspaceId = userProfile?.workspace_id || "default-workspace-id";
    req.user = {
      id: userProfile?.id || sbUser.id,
      email: sbUser.email || "",
      role: userRole,
      workspaceId
    };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized: Auth processing failed" });
  }
}

// src/modules/auth/rbac.util.ts
var ROLE_PERMISSIONS = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  MANAGER: ["leads.*", "campaigns.*", "analytics.view"],
  AGENT: ["leads.view", "leads.edit", "campaigns.view"],
  VIEWER: ["leads.view", "campaigns.view", "analytics.view"]
};
function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;
  const parts = permission.split(".");
  if (parts.length > 1) {
    const wildCard = `${parts[0]}.*`;
    if (permissions.includes(wildCard)) return true;
  }
  return false;
}
var PERMISSIONS = {
  LEADS_VIEW: "leads.view",
  LEADS_EDIT: "leads.edit",
  LEADS_DELETE: "leads.delete",
  CAMPAIGNS_VIEW: "campaigns.view",
  CAMPAIGNS_EDIT: "campaigns.edit",
  ANALYTICS_VIEW: "analytics.view",
  SETTINGS_EDIT: "settings.edit",
  USER_INVITE: "users.invite",
  USER_DELETE: "users.delete",
  USERS_DELETE: "users.delete"
};

// src/lib/rbac.middleware.ts
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Missing user context" });
    }
    const role = req.user.role;
    if (hasPermission(role, permission)) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  };
}

// src/modules/analytics/analytics.service.ts
init_supabaseAdmin();
var AnalyticsService = class {
  static {
    this.cache = {};
  }
  static {
    this.CACHE_TTL = 1e4;
  }
  // 10 seconds
  static async getWorkspaceMetrics(workspaceId) {
    const now = Date.now();
    const cached = this.cache[workspaceId];
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    try {
      const [leadsRes, campaignsRes, activitiesRes] = await Promise.all([
        supabaseAdmin.from("leads").select("status", { count: "exact" }).eq("workspace_id", workspaceId).eq("is_deleted", false),
        supabaseAdmin.from("campaigns").select("stats_sent, stats_opened, stats_clicked, stats_replied, stats_bounced, status").eq("workspace_id", workspaceId),
        supabaseAdmin.from("activities").select("type").eq("workspace_id", workspaceId).limit(1e3)
      ]);
      const campaigns = campaignsRes.data || [];
      const campStats = campaigns.reduce((acc, curr) => ({
        sent: acc.sent + (curr.stats_sent || 0),
        opened: acc.opened + (curr.stats_opened || 0),
        clicked: acc.clicked + (curr.stats_clicked || 0),
        replied: acc.replied + (curr.stats_replied || 0),
        bounced: acc.bounced + (curr.stats_bounced || 0)
      }), { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 });
      const activities = activitiesRes.data || [];
      const actSent = activities.filter((a) => a.type === "EMAIL_SENT").length;
      const actOpened = activities.filter((a) => a.type === "EMAIL_OPENED").length;
      const actClicked = activities.filter((a) => a.type === "EMAIL_CLICKED").length;
      const actReplied = activities.filter((a) => a.type === "REPLY").length;
      const actBounced = activities.filter((a) => a.type === "EMAIL_BOUNCED").length;
      const actFailed = activities.filter((a) => a.type === "EMAIL_FAILED").length;
      const totalSent = Math.max(campStats.sent, actSent);
      const totalOpened = Math.max(campStats.opened, actOpened);
      const totalClicked = Math.max(campStats.clicked, actClicked);
      const totalReplied = Math.max(campStats.replied, actReplied);
      const totalBounced = Math.max(campStats.bounced, actBounced);
      const totalFailed = actFailed;
      const leadsCount = leadsRes.count || 0;
      const activeCampaignsCount = campaigns.filter((c) => c.status === "RUNNING").length;
      const openRate = totalSent > 0 ? totalOpened / totalSent * 100 : 0;
      const replyRate = totalSent > 0 ? totalReplied / totalSent * 100 : 0;
      const clickRate = totalSent > 0 ? totalClicked / totalSent * 100 : 0;
      const bounceRate = totalSent > 0 ? totalBounced / totalSent * 100 : 0;
      const deliveryRate = totalSent > 0 ? Math.max(0, (totalSent - totalFailed - totalBounced) / totalSent * 100) : 100;
      const result = {
        leadsCount,
        campaignsCount: campaigns.length,
        activeCampaignsCount,
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        totalBounced,
        totalFailed,
        openRate: Number(openRate.toFixed(1)),
        replyRate: Number(replyRate.toFixed(1)),
        clickRate: Number(clickRate.toFixed(1)),
        bounceRate: Number(bounceRate.toFixed(1)),
        deliveryRate: Number(deliveryRate.toFixed(1))
      };
      this.cache[workspaceId] = {
        data: result,
        timestamp: Date.now()
      };
      return result;
    } catch (err) {
      console.error("[AnalyticsService] Error calculating metrics:", err);
      return {
        leadsCount: 0,
        campaignsCount: 0,
        activeCampaignsCount: 0,
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalReplied: 0,
        totalBounced: 0,
        totalFailed: 0,
        openRate: 0,
        replyRate: 0,
        clickRate: 0,
        bounceRate: 0,
        deliveryRate: 100
      };
    }
  }
  static async getCampaignPerformance(campaignId) {
    const { data: campaign, error } = await supabaseAdmin.from("campaigns").select("*").eq("id", campaignId).single();
    if (error || !campaign) return null;
    const statsSent = campaign.stats_sent || 0;
    const calculateRate = (dividend) => statsSent > 0 ? (dividend / statsSent * 100).toFixed(1) + "%" : "0%";
    return {
      ...campaign,
      openRate: calculateRate(campaign.stats_opened || 0),
      replyRate: calculateRate(campaign.stats_replied || 0),
      bounceRate: calculateRate(campaign.stats_bounced || 0)
    };
  }
};

// src/modules/campaigns/campaign.service.ts
init_supabaseAdmin();

// src/modules/email/providers/mock.impl.ts
var MockEmailProvider = class {
  constructor() {
    this.name = "mock";
  }
  async send(options) {
    console.log(`[MOCK EMAIL] Sent to ${options.toEmail} with subject: ${options.subject}`);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      provider: this.name
    };
  }
};

// src/modules/email/providers/mailjet.impl.ts
import Mailjet from "node-mailjet";

// src/config/env.config.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  // Supabase (Primary Database Access)
  SUPABASE_URL: z.string().url().default("https://placeholder.supabase.co"),
  SUPABASE_SECRET_KEY: z.string().default("placeholder-secret-key"),
  SUPABASE_PUBLISHABLE_KEY: z.string().default("placeholder-publishable-key"),
  // Auth (Internal JWT)
  JWT_SECRET: z.string().min(16).default("development-jwt-secret-placeholder-key-32-chars!"),
  // AI
  GEMINI_API_KEY: z.string().optional(),
  // Email Providers (Optional ENV Fallbacks)
  BREVO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILJET_API_KEY: z.string().optional(),
  MAILJET_API_SECRET: z.string().optional(),
  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Notifications
  SLACK_WEBHOOK_URL: z.string().optional()
});
var _env = envSchema.safeParse(process.env);
if (!_env.success) {
  console.warn("\u26A0\uFE0F Environment variables warning:", _env.error.format());
}
var env = _env.success ? _env.data : envSchema.parse({});

// src/modules/email/providers/mailjet.impl.ts
var MailjetEmailProvider = class {
  constructor(credentials) {
    this.name = "mailjet";
    this.client = null;
    this.apiKey = credentials?.apiKey || env.MAILJET_API_KEY || process.env.MAILJET_API_KEY || "";
    this.apiSecret = credentials?.apiSecret || env.MAILJET_API_SECRET || process.env.MAILJET_API_SECRET || "";
  }
  getClient() {
    if (this.client) return this.client;
    if (!this.apiKey || !this.apiSecret) {
      throw new Error("Mailjet API keys are missing");
    }
    this.client = new Mailjet({
      apiKey: this.apiKey,
      apiSecret: this.apiSecret
    });
    return this.client;
  }
  async send(options) {
    try {
      const client = this.getClient();
      const eventPayload = options.metadata ? JSON.stringify(options.metadata) : void 0;
      const result = await client.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: options.fromEmail,
              Name: options.fromName
            },
            To: [
              {
                Email: options.toEmail
              }
            ],
            Subject: options.subject,
            HTMLPart: options.html,
            TextPart: options.text || options.html.replace(/<[^>]*>?/gm, ""),
            CustomID: options.metadata?.jobId || options.metadata?.customId,
            EventPayload: eventPayload
          }
        ]
      });
      const message = result.body.Messages[0];
      return {
        success: message?.Status === "success",
        messageId: message?.To?.[0]?.MessageID,
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Unknown Mailjet error",
        provider: this.name
      };
    }
  }
};

// src/modules/email/providers/brevo.impl.ts
import axios from "axios";
var BrevoEmailProvider = class {
  constructor(credentials) {
    this.name = "brevo";
    this.apiKey = credentials?.apiKey || (process.env.BREVO_API_KEY || env.BREVO_API_KEY || "");
  }
  async send(options) {
    try {
      if (!this.apiKey) {
        throw new Error("Brevo API key is missing");
      }
      const payload = {
        sender: {
          name: options.fromName,
          email: options.fromEmail
        },
        to: [
          {
            email: options.toEmail
          }
        ],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text || options.html.replace(/<[^>]*>?/gm, "")
      };
      if (options.tags && options.tags.length > 0) {
        payload.tags = options.tags;
      }
      if (options.metadata) {
        payload.params = options.metadata;
      }
      const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        timeout: 15e3
      });
      return {
        success: true,
        messageId: response.data?.messageId,
        provider: this.name
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Unknown Brevo error";
      return {
        success: false,
        error: errorMsg,
        provider: this.name
      };
    }
  }
};

// src/modules/email/providers/resend.impl.ts
import axios2 from "axios";
var ResendEmailProvider = class {
  constructor(credentials) {
    this.name = "resend";
    this.apiKey = credentials?.apiKey || (process.env.RESEND_API_KEY || env.RESEND_API_KEY || "");
  }
  async send(options) {
    try {
      if (!this.apiKey) {
        throw new Error("Resend API key is missing");
      }
      const payload = {
        from: `${options.fromName} <${options.fromEmail}>`,
        to: [options.toEmail],
        subject: options.subject,
        html: options.html
      };
      if (options.text) {
        payload.text = options.text;
      }
      if (options.tags && options.tags.length > 0) {
        payload.tags = options.tags.map((tag) => ({ name: tag, value: tag }));
      }
      const response = await axios2.post("https://api.resend.com/emails", payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 15e3
      });
      return {
        success: true,
        messageId: response.data?.id,
        provider: this.name
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Unknown Resend error";
      return {
        success: false,
        error: errorMsg,
        provider: this.name
      };
    }
  }
};

// src/modules/email/providers/sendgrid.impl.ts
import axios3 from "axios";
var SendGridEmailProvider = class {
  constructor(credentials) {
    this.name = "sendgrid";
    this.apiKey = credentials?.apiKey || process.env.SENDGRID_API_KEY || "";
  }
  async send(options) {
    try {
      if (!this.apiKey) {
        throw new Error("SendGrid API key is missing");
      }
      const payload = {
        personalizations: [
          {
            to: [{ email: options.toEmail }],
            subject: options.subject
          }
        ],
        from: {
          email: options.fromEmail,
          name: options.fromName
        },
        content: [
          {
            type: "text/html",
            value: options.html
          }
        ]
      };
      if (options.text) {
        payload.content.unshift({
          type: "text/plain",
          value: options.text
        });
      }
      if (options.metadata) {
        payload.custom_args = options.metadata;
      }
      const response = await axios3.post("https://api.sendgrid.com/v3/mail/send", payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 15e3
      });
      const messageId = response.headers["x-message-id"] || "sendgrid-ok";
      return {
        success: true,
        messageId,
        provider: this.name
      };
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.message || "Unknown SendGrid error";
      return {
        success: false,
        error: errorMsg,
        provider: this.name
      };
    }
  }
};

// src/modules/email/providers/postmark.impl.ts
import axios4 from "axios";
var PostmarkEmailProvider = class {
  constructor(credentials) {
    this.name = "postmark";
    this.serverToken = credentials?.serverToken || process.env.POSTMARK_SERVER_TOKEN || "";
  }
  async send(options) {
    try {
      if (!this.serverToken) {
        throw new Error("Postmark Server Token is missing");
      }
      const payload = {
        From: `${options.fromName} <${options.fromEmail}>`,
        To: options.toEmail,
        Subject: options.subject,
        HtmlBody: options.html,
        TextBody: options.text || options.html.replace(/<[^>]*>?/gm, ""),
        MessageStream: "outbound"
      };
      if (options.tags && options.tags.length > 0) {
        payload.Tag = options.tags[0];
      }
      if (options.metadata) {
        payload.Metadata = options.metadata;
      }
      const response = await axios4.post("https://api.postmarkapp.com/email", payload, {
        headers: {
          "X-Postmark-Server-Token": this.serverToken,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        timeout: 15e3
      });
      return {
        success: response.data?.ErrorCode === 0,
        messageId: response.data?.MessageID,
        provider: this.name
      };
    } catch (error) {
      const errorMsg = error.response?.data?.Message || error.message || "Unknown Postmark error";
      return {
        success: false,
        error: errorMsg,
        provider: this.name
      };
    }
  }
};

// src/modules/email/providers/mailgun.impl.ts
import axios5 from "axios";
var MailgunEmailProvider = class {
  constructor(credentials) {
    this.name = "mailgun";
    this.apiKey = credentials?.apiKey || process.env.MAILGUN_API_KEY || "";
    this.domain = credentials?.domain || process.env.MAILGUN_DOMAIN || "";
    const region = credentials?.region || process.env.MAILGUN_REGION || "us";
    this.host = region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  }
  async send(options) {
    try {
      if (!this.apiKey || !this.domain) {
        throw new Error("Mailgun API key and domain are required");
      }
      const params = new URLSearchParams();
      params.append("from", `${options.fromName} <${options.fromEmail}>`);
      params.append("to", options.toEmail);
      params.append("subject", options.subject);
      params.append("html", options.html);
      if (options.text) {
        params.append("text", options.text);
      }
      if (options.tags && options.tags.length > 0) {
        options.tags.forEach((tag) => params.append("o:tag", tag));
      }
      if (options.metadata) {
        Object.entries(options.metadata).forEach(([k, v]) => {
          params.append(`v:${k}`, typeof v === "string" ? v : JSON.stringify(v));
        });
      }
      const authHeader = `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`;
      const response = await axios5.post(`${this.host}/v3/${this.domain}/messages`, params, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 15e3
      });
      return {
        success: true,
        messageId: response.data?.id,
        provider: this.name
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Unknown Mailgun error";
      return {
        success: false,
        error: errorMsg,
        provider: this.name
      };
    }
  }
};

// src/modules/email/providers/smtp.impl.ts
import nodemailer from "nodemailer";
var SmtpEmailProvider = class {
  constructor(credentials) {
    this.name = "smtp";
    this.transporter = null;
    this.config = {
      host: credentials?.host || process.env.SMTP_HOST || process.env.SES_SMTP_HOST || "",
      port: Number(credentials?.port || process.env.SMTP_PORT || process.env.SES_SMTP_PORT || 587),
      secure: credentials?.secure ?? Number(credentials?.port || process.env.SMTP_PORT) === 465,
      user: credentials?.user || process.env.SMTP_USER || process.env.SES_SMTP_USERNAME || "",
      pass: credentials?.pass || process.env.SMTP_PASS || process.env.SES_SMTP_PASSWORD || ""
    };
  }
  getTransporter() {
    if (this.transporter) return this.transporter;
    if (!this.config.host || !this.config.user) {
      throw new Error("SMTP host and user credentials are required");
    }
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass
      },
      tls: {
        rejectUnauthorized: false
        // Helps with self-hosted / internal certificates
      }
    });
    return this.transporter;
  }
  async send(options) {
    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: `"${options.fromName}" <${options.fromEmail}>`,
        to: options.toEmail,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, ""),
        headers: options.metadata ? {
          "X-Campaign-ID": String(options.metadata.campaignId || ""),
          "X-Lead-ID": String(options.metadata.leadId || ""),
          "X-Job-ID": String(options.metadata.jobId || "")
        } : void 0
      });
      return {
        success: !!info.messageId,
        messageId: info.messageId,
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Unknown SMTP transport error",
        provider: this.name
      };
    }
  }
};

// src/modules/email/email.factory.ts
init_supabaseAdmin();
var EmailProviderFactory = class {
  /**
   * Instantiate an email provider by type with explicit credentials
   */
  static createProvider(type, credentials = {}) {
    switch (type.toLowerCase()) {
      case "brevo":
        return new BrevoEmailProvider(credentials);
      case "resend":
        return new ResendEmailProvider(credentials);
      case "sendgrid":
        return new SendGridEmailProvider(credentials);
      case "postmark":
        return new PostmarkEmailProvider(credentials);
      case "mailgun":
        return new MailgunEmailProvider(credentials);
      case "mailjet":
        return new MailjetEmailProvider(credentials);
      case "smtp":
      case "ses":
      case "stalwart":
        return new SmtpEmailProvider(credentials);
      default:
        return new MockEmailProvider();
    }
  }
  /**
   * Fetch active provider configuration for a workspace from the Database
   */
  static async getProviderForWorkspace(workspaceId, providerId) {
    try {
      if (workspaceId) {
        let query = supabaseAdmin.from("email_providers").select("*").eq("workspace_id", workspaceId).eq("is_active", true);
        if (providerId) {
          query = query.eq("id", providerId);
        } else {
          query = query.order("is_default", { ascending: false }).order("created_at", { ascending: false });
        }
        const { data: providers, error } = await query;
        if (!error && providers && providers.length > 0) {
          const config = providers[0];
          const providerInstance = this.createProvider(config.provider_type, config.credentials);
          return {
            provider: providerInstance,
            fromEmail: config.from_email || process.env.SENDER_EMAIL || "outreach@transferlegacy.com",
            fromName: config.from_name || process.env.SENDER_NAME || "Transfer Legacy",
            replyTo: config.reply_to,
            dailyLimit: config.daily_limit || 1e3,
            providerType: config.provider_type,
            providerId: config.id
          };
        }
      }
    } catch (err) {
      console.warn("[EmailProviderFactory] Failed to load DB provider, falling back to ENV/Mock:", err);
    }
    return this.getFallbackConfig();
  }
  /**
   * Fallback configuration from environment variables
   */
  static getFallbackConfig() {
    if (process.env.BREVO_API_KEY) {
      return {
        provider: new BrevoEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || "outreach@transferlegacy.com",
        fromName: process.env.SENDER_NAME || "Transfer Legacy",
        dailyLimit: 1e3,
        providerType: "brevo"
      };
    }
    if (process.env.RESEND_API_KEY) {
      return {
        provider: new ResendEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || "outreach@transferlegacy.com",
        fromName: process.env.SENDER_NAME || "Transfer Legacy",
        dailyLimit: 1e3,
        providerType: "resend"
      };
    }
    if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
      return {
        provider: new MailjetEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || "outreach@transferlegacy.com",
        fromName: process.env.SENDER_NAME || "Transfer Legacy",
        dailyLimit: 1e3,
        providerType: "mailjet"
      };
    }
    if (process.env.SES_SMTP_HOST && process.env.SES_SMTP_USERNAME) {
      return {
        provider: new SmtpEmailProvider(),
        fromEmail: process.env.SENDER_EMAIL || "outreach@transferlegacy.com",
        fromName: process.env.SENDER_NAME || "Transfer Legacy",
        dailyLimit: 1e3,
        providerType: "smtp"
      };
    }
    return {
      provider: new MockEmailProvider(),
      fromEmail: process.env.SENDER_EMAIL || "outreach@transferlegacy.com",
      fromName: process.env.SENDER_NAME || "Transfer Legacy",
      dailyLimit: 1e3,
      providerType: "mock"
    };
  }
  /**
   * Backwards compatible legacy method
   */
  static getProvider() {
    return this.getFallbackConfig().provider;
  }
};

// src/modules/campaigns/campaign.service.ts
var CampaignService = class {
  static async getCampaigns(workspaceId) {
    const { data, error } = await supabaseAdmin.from("campaigns").select("*, template:templates(id, name, subject)").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  static async createCampaign(workspaceId, data) {
    const { data: campaign, error } = await supabaseAdmin.from("campaigns").insert({
      name: data.name,
      template_id: data.templateId || data.template_id,
      workspace_id: workspaceId,
      target_category: data.targetCategory || data.target_category || null,
      target_status: data.targetStatus || data.target_status || null,
      provider_id: data.providerId || data.provider_id || null,
      status: "DRAFT"
    }).select("*, template:templates(id, name, subject)").single();
    if (error) throw error;
    return campaign;
  }
  static async updateCampaign(campaignId, workspaceId, data) {
    const updateData = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (data.name !== void 0) updateData.name = data.name;
    if (data.templateId !== void 0 || data.template_id !== void 0) {
      updateData.template_id = data.templateId ?? data.template_id;
    }
    if (data.targetCategory !== void 0 || data.target_category !== void 0) {
      updateData.target_category = data.targetCategory ?? data.target_category;
    }
    if (data.targetStatus !== void 0 || data.target_status !== void 0) {
      updateData.target_status = data.targetStatus ?? data.target_status;
    }
    if (data.providerId !== void 0 || data.provider_id !== void 0) {
      updateData.provider_id = data.providerId ?? data.provider_id;
    }
    if (data.status !== void 0) updateData.status = data.status;
    const { data: campaign, error } = await supabaseAdmin.from("campaigns").update(updateData).eq("id", campaignId).eq("workspace_id", workspaceId).select("*, template:templates(id, name, subject)").single();
    if (error) throw error;
    return campaign;
  }
  static async startCampaign(campaignId, workspaceId) {
    const { data: campaign, error: cError } = await supabaseAdmin.from("campaigns").select("*, template:templates(*)").eq("id", campaignId).eq("workspace_id", workspaceId).single();
    if (cError || !campaign) throw new Error("Campaign not found");
    if (!campaign.template) throw new Error("Campaign has no email template selected");
    let query = supabaseAdmin.from("leads").select("id, email, first_name, last_name, company_name, category, status").eq("workspace_id", workspaceId).eq("is_deleted", false);
    if (campaign.target_category && campaign.target_category !== "ALL") {
      query = query.eq("category", campaign.target_category);
    }
    if (campaign.target_status && campaign.target_status !== "ALL") {
      query = query.eq("status", campaign.target_status);
    }
    let { data: leads, error: lError } = await query;
    if (lError) {
      console.warn("[CampaignService] Targeted query fallback:", lError.message);
      const fallbackRes = await supabaseAdmin.from("leads").select("id, email, first_name, last_name, status").eq("workspace_id", workspaceId).eq("is_deleted", false);
      leads = fallbackRes.data || [];
    }
    if (!leads || leads.length === 0) {
      throw new Error(`No leads matched the audience filter (${campaign.target_category || "All Categories"}, ${campaign.target_status || "All Statuses"}).`);
    }
    const { data: unsubscribed } = await supabaseAdmin.from("unsubscribes").select("email").eq("workspace_id", workspaceId);
    const unsubscribedEmails = new Set((unsubscribed || []).map((u) => u.email.toLowerCase().trim()));
    await supabaseAdmin.from("campaigns").update({
      status: "RUNNING",
      started_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", campaignId);
    const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId, campaign.provider_id);
    const provider = emailConfig.provider;
    const template = campaign.template;
    const appUrl = process.env.APP_URL || "https://connect.transferlegacy.com";
    const fromEmail = emailConfig.fromEmail || process.env.SENDER_EMAIL || "outreach@transferlegacy.com";
    const fromName = emailConfig.fromName || process.env.SENDER_NAME || "Transfer Legacy";
    let sentCount = 0;
    let failedCount = 0;
    for (const lead of leads) {
      if (unsubscribedEmails.has(lead.email.toLowerCase().trim())) {
        try {
          await supabaseAdmin.from("activities").insert({
            type: "EMAIL_SUPPRESSED",
            description: `Campaign email to ${lead.email} suppressed (unsubscribed)`,
            metadata: {
              campaignId: campaign.id,
              campaignName: campaign.name,
              leadId: lead.id,
              toEmail: lead.email,
              provider: emailConfig.providerType,
              reason: "unsubscribed"
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });
        } catch {
        }
        continue;
      }
      let html = template.body_html || "";
      const leadCompany = lead.company_name || "your company";
      html = html.replace(/\{\{first_name\}\}/gi, lead.first_name || "there");
      html = html.replace(/\{\{last_name\}\}/gi, lead.last_name || "");
      html = html.replace(/\{\{company\}\}/gi, leadCompany);
      html = html.replace(/\{\{email\}\}/gi, lead.email);
      const unsubscribeLink = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(lead.email)}&workspaceId=${workspaceId}`;
      const unsubscribeFooter = `
        <br/><br/>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; font-family: sans-serif; line-height: 1.5;">
          You are receiving this outreach email from ${fromName}.<br/>
          To stop receiving emails, you can <a href="${unsubscribeLink}" style="color: #4f46e5; text-decoration: underline;" target="_blank">unsubscribe here</a>.
        </p>
      `;
      html += unsubscribeFooter;
      const recipientName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.email;
      const subject = template.subject || campaign.name || "Outreach";
      try {
        const sendResult = await provider.send({
          toEmail: lead.email,
          fromEmail,
          fromName,
          subject,
          html,
          text: html.replace(/<[^>]*>?/gm, ""),
          metadata: {
            campaignId: campaign.id,
            leadId: lead.id,
            workspaceId,
            providerType: emailConfig.providerType
          }
        });
        if (sendResult.success) {
          sentCount++;
          await supabaseAdmin.from("activities").insert({
            type: "EMAIL_SENT",
            description: `Campaign "${campaign.name}" email sent to ${lead.email} via ${emailConfig.providerType}`,
            metadata: {
              campaignId: campaign.id,
              campaignName: campaign.name,
              leadId: lead.id,
              toEmail: lead.email,
              recipientName,
              company: leadCompany,
              provider: emailConfig.providerType,
              messageId: sendResult.messageId,
              subject
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });
          await supabaseAdmin.from("leads").update({ status: "CONTACTED", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", lead.id);
        } else {
          failedCount++;
          await supabaseAdmin.from("activities").insert({
            type: "EMAIL_FAILED",
            description: `Campaign email to ${lead.email} failed: ${sendResult.error || "Unknown error"}`,
            metadata: {
              campaignId: campaign.id,
              campaignName: campaign.name,
              leadId: lead.id,
              toEmail: lead.email,
              recipientName,
              company: leadCompany,
              error: sendResult.error,
              provider: emailConfig.providerType,
              subject
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });
        }
      } catch (sendErr) {
        failedCount++;
        console.error(`[CampaignService] Error dispatching to ${lead.email}:`, sendErr);
        try {
          await supabaseAdmin.from("activities").insert({
            type: "EMAIL_FAILED",
            description: `Campaign email to ${lead.email} error: ${sendErr.message}`,
            metadata: {
              campaignId: campaign.id,
              campaignName: campaign.name,
              leadId: lead.id,
              toEmail: lead.email,
              recipientName,
              error: sendErr.message,
              provider: emailConfig.providerType,
              subject
            },
            lead_id: lead.id,
            workspace_id: workspaceId
          });
        } catch {
        }
      }
    }
    const currentSent = (campaign.stats_sent || 0) + sentCount;
    const finalStatus = sentCount > 0 ? "COMPLETED" : failedCount > 0 ? "FAILED" : "COMPLETED";
    const { data: updatedCampaign } = await supabaseAdmin.from("campaigns").update({
      status: finalStatus,
      stats_sent: currentSent,
      completed_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", campaignId).select("*, template:templates(id, name, subject)").single();
    return {
      ...updatedCampaign || campaign,
      sentCount,
      failedCount,
      totalTargeted: leads.length,
      provider: emailConfig.providerType
    };
  }
  static async stopCampaign(campaignId, workspaceId) {
    const { data: campaign, error } = await supabaseAdmin.from("campaigns").update({
      status: "PAUSED",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", campaignId).eq("workspace_id", workspaceId).select("*, template:templates(id, name, subject)").single();
    if (error) throw error;
    return campaign;
  }
  static async deleteCampaign(id, workspaceId) {
    const { error } = await supabaseAdmin.from("campaigns").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    return { success: true };
  }
};

// src/modules/templates/template.service.ts
init_supabaseAdmin();
var TemplateService = class {
  static async getTemplates(workspaceId) {
    const { data, error } = await supabaseAdmin.from("templates").select("*").eq("workspace_id", workspaceId).eq("is_deleted", false).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  static async getTemplate(id, workspaceId) {
    const { data: template, error } = await supabaseAdmin.from("templates").select("*").eq("id", id).single();
    if (error || !template || template.workspace_id !== workspaceId) {
      throw new Error("Template not found");
    }
    return template;
  }
  static async createTemplate(workspaceId, data) {
    const { data: template, error } = await supabaseAdmin.from("templates").insert({
      name: data.name,
      subject: data.subject,
      body_html: data.bodyHtml || data.body_html,
      category: data.category,
      workspace_id: workspaceId,
      is_deleted: false
    }).select().single();
    if (error) throw error;
    return template;
  }
  static async updateTemplate(id, workspaceId, data) {
    await this.getTemplate(id, workspaceId);
    const formatted = {
      name: data.name,
      subject: data.subject,
      body_html: data.bodyHtml || data.body_html,
      category: data.category,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { data: template, error } = await supabaseAdmin.from("templates").update(formatted).eq("id", id).select().single();
    if (error) throw error;
    return template;
  }
  static async deleteTemplate(id, workspaceId) {
    await this.getTemplate(id, workspaceId);
    const { data, error } = await supabaseAdmin.from("templates").update({ is_deleted: true }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  static async seedDefaults(workspaceId) {
    const { count, error: countError } = await supabaseAdmin.from("templates").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    if (countError) throw countError;
    if (count && count > 0) return;
    const createTemplateBody = (title, badge, content, ctaText, ctaUrl) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TL Connect - ${title}</title>
    <style>
      body { margin: 0; padding: 0; background: #f5f5f0; font-family: "Georgia", "Times New Roman", serif; color: #1f1d1b; }
      .wrapper { max-width: 640px; margin: 0 auto; padding: 32px 20px 48px; }
      .card { background: #ffffff; border: 1px solid #e0ddd7; border-radius: 12px; padding: 28px; box-shadow: 0 8px 24px rgba(22, 18, 14, 0.08); }
      .badge { display: inline-block; background: #1f1d1b; color: #f5f5f0; padding: 6px 12px; border-radius: 999px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
      h1 { margin: 16px 0 12px; font-size: 28px; line-height: 1.2; }
      p { margin: 0 0 12px; font-size: 16px; line-height: 1.6; }
      .cta { display: inline-block; margin: 18px 0 8px; padding: 12px 18px; background: #1f1d1b; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .meta { font-size: 13px; color: #5b5752; margin-top: 16px; }
      .code { font-family: "Courier New", monospace; font-size: 13px; background: #f3f0ea; padding: 10px; border-radius: 8px; word-break: break-all; }
      .footer { margin-top: 22px; font-size: 12px; color: #6f6b65; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <span class="badge">${badge}</span>
        <h1>${title}</h1>
        <p>${content}</p>
        <a class="cta" href="${ctaUrl}">${ctaText}</a>
        <div class="footer">
          <p><strong>About Transfer Legacy</strong><br>Secure your digital assets for the next generation. Visit <a href="https://transferlegacy.com" style="color: #1f1d1b;">transferlegacy.com</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`;
    const defaults = [
      {
        name: "Legacy Invitation",
        subject: "Invitation to {{params.policy_name}}",
        category: "Invitation",
        body_html: createTemplateBody(
          "Inheritance Plan Access",
          "INVITATION",
          '{{params.owner_name}} has invited you to join their secure inheritance plan <strong>"{{params.policy_name}}"</strong>. This plan ensures that digital assets are distributed according to their wishes.',
          "Accept Invitation",
          "{{params.invite_url}}"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Security Alert",
        subject: "Security Alert: New Device Detected",
        category: "Security",
        body_html: createTemplateBody(
          "Node Authorization Required",
          "SECURITY",
          "A new device was detected attempting to access your legacy vault. If this was not you, please rotate your master keys immediately.",
          "Review Activity",
          "{{params.app_url}}/security"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Vault Backup Success",
        subject: "Scheduled Backup Completed",
        category: "System",
        body_html: createTemplateBody(
          "Backup Integrity Verified",
          "SYSTEM",
          "The weekly encrypted backup of your workspace <strong>{{workspace_name}}</strong> has been successfully uploaded to your designated storage node.",
          "View Logs",
          "{{params.app_url}}/backups"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Document Verified",
        subject: "Legal Document Verification Successful",
        category: "Compliance",
        body_html: createTemplateBody(
          "Notarization Confirmed",
          "COMPLIANCE",
          "Your uploaded document <strong>{{params.doc_name}}</strong> has been successfully verified and time-stamped on the blockchain.",
          "Download Receipt",
          "{{params.receipt_url}}"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Trial Ending Soon",
        subject: "Your Enterprise Trial is Ending",
        category: "Billing",
        body_html: createTemplateBody(
          "Maximize Your Legacy",
          "BILLING",
          "Your trial period ends in 3 days. Upgrade to a lifetime license now to ensure uninterrupted access to your inheritance nodes.",
          "Upgrade Now",
          "{{params.app_url}}/billing"
        ),
        workspace_id: workspaceId
      },
      {
        name: "New Message Received",
        subject: "You have a secure message",
        category: "Communication",
        body_html: createTemplateBody(
          "Encrypted Signal Received",
          "INBOX",
          "A new encrypted message has arrived in your unified inbox from <strong>{{params.sender_name}}</strong>.",
          "Open Inbox",
          "{{params.app_url}}/inbox"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Policy Updated",
        subject: "Update to your inheritance policy",
        category: "Legal",
        body_html: createTemplateBody(
          "Policy Revision Detected",
          "UPDATE",
          "A change has been recorded in the policy <strong>{{params.policy_name}}</strong>. Please review the modifications to ensure they align with your requirements.",
          "Review Changes",
          "{{params.app_url}}/policies"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Beneficiary Onboarding",
        subject: "Step 1: Setting up your account",
        category: "Onboarding",
        body_html: createTemplateBody(
          "Welcome to the Legacy Network",
          "ONBOARDING",
          "You have been named a beneficiary. Let's get your secure environment set up so you can access your inheritance when the time comes.",
          "Start Setup",
          "{{params.onboarding_url}}"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Milestone Achievement",
        subject: "Legacy Score Improved!",
        category: "Gamification",
        body_html: createTemplateBody(
          "Legacy Readiness Level Up",
          "MILESTONE",
          "Congratulations! By verifying your backup nodes, your Legacy Readiness Score has increased to <strong>{{params.score}}%</strong>.",
          "View Dashboard",
          "{{params.app_url}}/overview"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Referral Program",
        subject: "Help a friend secure their legacy",
        category: "Marketing",
        body_html: createTemplateBody(
          "Share the Security",
          "REFERRAL",
          "Know someone who needs to secure their digital life? Invite them to TL Connect and both of you will receive 3 months of Enterprise features.",
          "Get Referral Link",
          "{{params.app_url}}/refer"
        ),
        workspace_id: workspaceId
      },
      {
        name: "Annual Security Review",
        subject: "Time for your annual legacy audit",
        category: "Security",
        body_html: createTemplateBody(
          "Full Node Integrity Check",
          "ANNUAL AUDIT",
          "It's been a year since your last full security audit. Let's run a complete diagnostic on all your inheritance plan nodes.",
          "Start Audit",
          "{{params.app_url}}/audit"
        ),
        workspace_id: workspaceId
      }
    ];
    const { error: insertError } = await supabaseAdmin.from("templates").insert(defaults);
    if (insertError) throw insertError;
  }
};

// src/modules/leads/lead.service.ts
init_supabaseAdmin();
var LeadService = class {
  static async getLeads(workspaceId, options = {}) {
    const { status, category, search, limit = 100, offset = 0 } = options;
    let query = supabaseAdmin.from("leads").select(`
        *,
        company:companies(name, industry),
        owner:users(name, avatar_url),
        tags:lead_tags(tag:tags(*))
      `).eq("workspace_id", workspaceId).eq("is_deleted", false).range(offset, offset + limit - 1);
    if (status && status !== "ALL") query = query.eq("status", status);
    if (category && category !== "ALL") query = query.eq("category", category);
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("[LeadService] getLeads error:", error);
      throw new Error(error.message);
    }
    return (data || []).map((lead) => ({
      ...lead,
      company_name: lead.company_name || lead.company?.name || null
    }));
  }
  static async createLead(workspaceId, data) {
    const rawCompanyName = (data.companyName || data.company_name || data.company || "").trim();
    let companyId = data.companyId || data.company_id || null;
    if (rawCompanyName && !companyId) {
      try {
        const { data: existingCompany } = await supabaseAdmin.from("companies").select("id").eq("workspace_id", workspaceId).ilike("name", rawCompanyName).maybeSingle();
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabaseAdmin.from("companies").insert([{
            name: rawCompanyName,
            workspace_id: workspaceId
          }]).select("id").single();
          if (newCompany) {
            companyId = newCompany.id;
          }
        }
      } catch (err) {
        console.warn("[LeadService] Company lookup/creation warning:", err);
      }
    }
    const formattedData = {
      email: data.email?.toLowerCase()?.trim(),
      first_name: data.firstName || data.first_name || "",
      last_name: data.lastName || data.last_name || "",
      title: data.title || "",
      phone: data.phone || "",
      linkedin_url: data.linkedinUrl || data.linkedin_url || "",
      company_id: companyId,
      company_name: rawCompanyName || null,
      category: data.category || "Outbound",
      status: data.status || "NEW",
      owner_id: data.ownerId || data.owner_id || null,
      custom_fields: data.customFields || data.custom_fields || {}
    };
    const { data: existing, error: fetchError } = await supabaseAdmin.from("leads").select("id, is_deleted").eq("email", formattedData.email).eq("workspace_id", workspaceId).maybeSingle();
    if (existing) {
      if (existing.is_deleted) {
        try {
          const { data: restored, error: restError } = await supabaseAdmin.from("leads").update({ ...formattedData, is_deleted: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", existing.id).select().single();
          if (restError) throw restError;
          return restored;
        } catch (updateErr) {
          delete formattedData.company_name;
          const { data: restored, error: retryError } = await supabaseAdmin.from("leads").update({ ...formattedData, is_deleted: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", existing.id).select().single();
          if (retryError) throw new Error(retryError.message);
          return restored;
        }
      }
      throw new Error("Lead with this email already exists in this workspace");
    }
    try {
      const { data: newLead, error: insertError } = await supabaseAdmin.from("leads").insert([{ ...formattedData, workspace_id: workspaceId }]).select().single();
      if (insertError) throw insertError;
      return newLead;
    } catch (insertErr) {
      if (insertErr.message?.includes("company_name")) {
        delete formattedData.company_name;
        const { data: retryLead, error: retryErr } = await supabaseAdmin.from("leads").insert([{ ...formattedData, workspace_id: workspaceId }]).select().single();
        if (retryErr) throw new Error(retryErr.message);
        return retryLead;
      }
      throw new Error(insertErr.message);
    }
  }
  static async updateLead(id, workspaceId, data) {
    const rawCompanyName = (data.companyName || data.company_name || data.company || "").trim();
    let companyId = data.companyId || data.company_id || null;
    if (rawCompanyName && !companyId) {
      try {
        const { data: existingCompany } = await supabaseAdmin.from("companies").select("id").eq("workspace_id", workspaceId).ilike("name", rawCompanyName).maybeSingle();
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabaseAdmin.from("companies").insert([{
            name: rawCompanyName,
            workspace_id: workspaceId
          }]).select("id").single();
          if (newCompany) {
            companyId = newCompany.id;
          }
        }
      } catch (err) {
        console.warn("[LeadService] Company lookup/creation warning on update:", err);
      }
    }
    const updateData = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (data.email !== void 0) updateData.email = data.email.toLowerCase().trim();
    if (data.firstName !== void 0 || data.first_name !== void 0) updateData.first_name = data.firstName ?? data.first_name;
    if (data.lastName !== void 0 || data.last_name !== void 0) updateData.last_name = data.lastName ?? data.last_name;
    if (data.title !== void 0) updateData.title = data.title;
    if (data.phone !== void 0) updateData.phone = data.phone;
    if (data.linkedinUrl !== void 0 || data.linkedin_url !== void 0) updateData.linkedin_url = data.linkedinUrl ?? data.linkedin_url;
    if (companyId !== null) updateData.company_id = companyId;
    if (rawCompanyName) updateData.company_name = rawCompanyName;
    if (data.category !== void 0) updateData.category = data.category;
    if (data.status !== void 0) updateData.status = data.status;
    if (data.customFields !== void 0 || data.custom_fields !== void 0) updateData.custom_fields = data.customFields ?? data.custom_fields;
    try {
      const { data: updatedLead, error } = await supabaseAdmin.from("leads").update(updateData).eq("id", id).eq("workspace_id", workspaceId).select().single();
      if (error) throw error;
      return updatedLead;
    } catch (err) {
      if (err.message?.includes("company_name")) {
        delete updateData.company_name;
        const { data: retryLead, error: retryErr } = await supabaseAdmin.from("leads").update(updateData).eq("id", id).eq("workspace_id", workspaceId).select().single();
        if (retryErr) throw new Error(retryErr.message);
        return retryLead;
      }
      throw new Error(err.message);
    }
  }
  static async bulkCreateLeads(workspaceId, leads) {
    const formattedLeads = leads.map((lead) => {
      const companyName = (lead.companyName || lead.company_name || lead.company || "").trim();
      return {
        email: (lead.email || "").toLowerCase().trim(),
        first_name: lead.firstName || lead.first_name || "",
        last_name: lead.lastName || lead.last_name || "",
        title: lead.title || "",
        phone: lead.phone || "",
        linkedin_url: lead.linkedinUrl || lead.linkedin_url || "",
        company_name: companyName || null,
        category: lead.category || "Outbound",
        workspace_id: workspaceId,
        custom_fields: lead.customFields || lead.custom_fields || {},
        status: lead.status || "NEW",
        is_deleted: false
      };
    }).filter((l) => l.email);
    try {
      const { data, error } = await supabaseAdmin.from("leads").upsert(formattedLeads, {
        onConflict: "email,workspace_id",
        ignoreDuplicates: false
      }).select();
      if (error) throw error;
      return data;
    } catch (err) {
      if (err.message?.includes("company_name")) {
        const cleaned = formattedLeads.map((l) => {
          const { company_name, ...rest } = l;
          return rest;
        });
        const { data: retryData, error: retryErr } = await supabaseAdmin.from("leads").upsert(cleaned, {
          onConflict: "email,workspace_id",
          ignoreDuplicates: false
        }).select();
        if (retryErr) throw new Error(retryErr.message);
        return retryData;
      }
      throw new Error(err.message);
    }
  }
  static async deleteLead(id, workspace_id) {
    const { error } = await supabaseAdmin.from("leads").update({ is_deleted: true, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).eq("workspace_id", workspace_id);
    if (error) throw new Error(error.message);
    return { success: true };
  }
  /**
   * Send a direct, one-off email to a specific lead
   */
  static async sendDirectEmail(leadId, workspaceId, options) {
    const { data: lead, error: leadErr } = await supabaseAdmin.from("leads").select("*, company:companies(name)").eq("id", leadId).eq("workspace_id", workspaceId).single();
    if (leadErr || !lead) throw new Error("Lead not found");
    const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId);
    const provider = emailConfig.provider;
    const effectiveFromEmail = options.fromEmail || emailConfig.fromEmail || "outreach@transferlegacy.com";
    const effectiveFromName = options.fromName || emailConfig.fromName || "TL Connect";
    const leadCompany = lead.company_name || lead.company?.name || "your company";
    let finalHtml = options.html;
    finalHtml = finalHtml.replace(/\{\{first_name\}\}/gi, lead.first_name || "there");
    finalHtml = finalHtml.replace(/\{\{last_name\}\}/gi, lead.last_name || "");
    finalHtml = finalHtml.replace(/\{\{company\}\}/gi, leadCompany);
    finalHtml = finalHtml.replace(/\{\{email\}\}/gi, lead.email);
    const sendResult = await provider.send({
      toEmail: lead.email,
      fromEmail: effectiveFromEmail,
      fromName: effectiveFromName,
      subject: options.subject,
      html: finalHtml,
      text: finalHtml.replace(/<[^>]*>?/gm, ""),
      metadata: {
        leadId: lead.id,
        workspaceId,
        directSend: true,
        provider: emailConfig.providerType
      }
    });
    const recipientName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.email;
    if (!sendResult.success) {
      try {
        await supabaseAdmin.from("activities").insert({
          type: "EMAIL_FAILED",
          description: `Direct email to ${lead.email} failed: ${sendResult.error || "Unknown error"}`,
          metadata: {
            leadId: lead.id,
            toEmail: lead.email,
            recipientName,
            company: leadCompany,
            error: sendResult.error,
            provider: emailConfig.providerType,
            subject: options.subject,
            direct: true
          },
          lead_id: lead.id,
          workspace_id: workspaceId
        });
      } catch (logErr) {
        console.error("[LeadService] Failed to record failure activity log:", logErr);
      }
      throw new Error(sendResult.error || "Failed to dispatch email");
    }
    try {
      await supabaseAdmin.from("activities").insert({
        type: "EMAIL_SENT",
        description: `Direct email sent to ${lead.email} via ${emailConfig.providerType}`,
        metadata: {
          leadId: lead.id,
          toEmail: lead.email,
          recipientName,
          company: leadCompany,
          provider: emailConfig.providerType,
          messageId: sendResult.messageId,
          subject: options.subject,
          direct: true
        },
        lead_id: lead.id,
        workspace_id: workspaceId
      });
    } catch (logErr) {
      console.error("[LeadService] Failed to record success activity log:", logErr);
    }
    try {
      await supabaseAdmin.from("leads").update({ status: "CONTACTED", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", lead.id);
    } catch (leadUpdateErr) {
      console.warn("[LeadService] Status update warning on lead:", leadUpdateErr);
    }
    return { success: true, messageId: sendResult.messageId, provider: emailConfig.providerType };
  }
};

// src/modules/queue/queue.service.ts
init_supabaseAdmin();
var QueueService = class {
  static {
    this.isProcessing = false;
  }
  /**
   * Add a job to the queue using Supabase
   */
  static async enqueue(type, payload, priority = 0) {
    const workspaceId = payload.workspaceId || payload.workspace_id || null;
    const { data, error } = await supabaseAdmin.from("queue_jobs").insert([{
      type,
      payload,
      priority,
      status: "PENDING",
      run_at: (/* @__PURE__ */ new Date()).toISOString(),
      workspace_id: workspaceId
    }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  /**
   * Process pending jobs with Supabase
   */
  static async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const { data: job, error: fetchError } = await supabaseAdmin.from("queue_jobs").select("*").eq("status", "PENDING").lte("run_at", (/* @__PURE__ */ new Date()).toISOString()).order("priority", { ascending: false }).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!job || fetchError) {
        this.isProcessing = false;
        return;
      }
      await this.processJob(job);
    } catch (error) {
      console.error("Queue Processing Error:", error);
    } finally {
      this.isProcessing = false;
    }
  }
  /**
   * Process a batch of pending jobs sequentially (used for cron)
   */
  static async processBatch(limit = 10) {
    if (this.isProcessing) return 0;
    this.isProcessing = true;
    let processedCount = 0;
    try {
      const { data: jobs, error: fetchError } = await supabaseAdmin.from("queue_jobs").select("*").eq("status", "PENDING").lte("run_at", (/* @__PURE__ */ new Date()).toISOString()).order("priority", { ascending: false }).order("created_at", { ascending: true }).limit(limit);
      if (fetchError || !jobs || jobs.length === 0) {
        return 0;
      }
      for (const job of jobs) {
        await this.processJob(job);
        processedCount++;
      }
    } catch (error) {
      console.error("Batch Queue Processing Error:", error);
    } finally {
      this.isProcessing = false;
    }
    return processedCount;
  }
  /**
   * Core logic to process a single queue job
   */
  static async processJob(job) {
    await supabaseAdmin.from("queue_jobs").update({ status: "PROCESSING", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", job.id);
    let success = true;
    let lastError = null;
    const payload = job.payload;
    if (job.type === "SEND_EMAIL") {
      const toEmail = payload.toEmail || payload.to;
      const fromEmail = payload.fromEmail || payload.from || process.env.SENDER_EMAIL || "outreach@transferlegacy.com";
      const fromName = payload.fromName || process.env.SENDER_NAME || "Transfer Legacy";
      const { data: campaign } = await supabaseAdmin.from("campaigns").select("status, stats_sent").eq("id", payload.campaignId).single();
      if (!campaign || campaign.status !== "RUNNING") {
        await supabaseAdmin.from("queue_jobs").update({
          status: "COMPLETED",
          last_error: "Campaign not running",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", job.id);
        if (payload.campaignId) {
          await this.checkCampaignCompletion(payload.campaignId);
        }
        return;
      }
      const { data: isUnsubscribed } = await supabaseAdmin.from("unsubscribes").select("id").eq("email", toEmail).eq("workspace_id", payload.workspaceId).maybeSingle();
      if (isUnsubscribed) {
        await supabaseAdmin.from("queue_jobs").update({
          status: "COMPLETED",
          last_error: "Suppressed: Recipient unsubscribed",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", job.id);
        await supabaseAdmin.from("activities").insert({
          type: "EMAIL_SUPPRESSED",
          description: `Email to ${toEmail} suppressed (unsubscribed)`,
          metadata: { campaignId: payload.campaignId, leadId: payload.leadId, reason: "unsubscribed" },
          lead_id: payload.leadId,
          workspace_id: payload.workspaceId
        });
        if (payload.campaignId) {
          await this.checkCampaignCompletion(payload.campaignId);
        }
        return;
      }
      const emailConfig = await EmailProviderFactory.getProviderForWorkspace(payload.workspaceId);
      const provider = emailConfig.provider;
      const effectiveFromEmail = payload.fromEmail || payload.from || emailConfig.fromEmail;
      const effectiveFromName = payload.fromName || emailConfig.fromName;
      const limit = emailConfig.dailyLimit || 1e3;
      const startOfDay = /* @__PURE__ */ new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: sentCount } = await supabaseAdmin.from("activities").select("*", { count: "exact", head: true }).eq("workspace_id", payload.workspaceId).eq("type", "EMAIL_SENT").gte("created_at", startOfDay.toISOString());
      if ((sentCount || 0) >= limit) {
        const tomorrow = /* @__PURE__ */ new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 5, 0);
        await supabaseAdmin.from("queue_jobs").update({
          status: "PENDING",
          run_at: tomorrow.toISOString(),
          last_error: `Daily limit exceeded (${sentCount}/${limit}), postponed to tomorrow`,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", job.id);
        return;
      }
      try {
        const result = await provider.send({
          toEmail,
          fromEmail: effectiveFromEmail,
          fromName: effectiveFromName,
          subject: payload.subject || "Outreach",
          html: payload.html,
          metadata: {
            jobId: job.id,
            campaignId: payload.campaignId,
            leadId: payload.leadId,
            workspaceId: payload.workspaceId,
            providerType: emailConfig.providerType
          }
        });
        success = result.success;
        lastError = result.error;
        if (success) {
          await supabaseAdmin.from("campaigns").update({ stats_sent: (campaign.stats_sent || 0) + 1 }).eq("id", payload.campaignId);
          await supabaseAdmin.from("activities").insert({
            type: "EMAIL_SENT",
            description: `Campaign email sent to ${toEmail} via ${emailConfig.providerType}`,
            metadata: {
              campaignId: payload.campaignId,
              leadId: payload.leadId,
              provider: emailConfig.providerType,
              messageId: result.messageId
            },
            lead_id: payload.leadId,
            workspace_id: payload.workspaceId
          });
        }
      } catch (err) {
        success = false;
        lastError = err.message;
      }
    }
    if (success) {
      await supabaseAdmin.from("queue_jobs").update({
        status: "COMPLETED",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", job.id);
    } else {
      const newRetryCount = (job.retry_count || 0) + 1;
      const maxRetries = job.max_retries || 3;
      const status = newRetryCount >= maxRetries ? "FAILED" : "PENDING";
      await supabaseAdmin.from("queue_jobs").update({
        status,
        retry_count: newRetryCount,
        last_error: lastError,
        run_at: new Date(Date.now() + Math.pow(2, newRetryCount) * 5e3).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", job.id);
    }
    if (payload.campaignId) {
      await this.checkCampaignCompletion(payload.campaignId);
    }
  }
  /**
   * Helper to verify and update campaign status if all enqueued jobs are processed
   */
  static async checkCampaignCompletion(campaignId) {
    const { count, error } = await supabaseAdmin.from("queue_jobs").select("*", { count: "exact", head: true }).eq("payload->>campaignId", campaignId).in("status", ["PENDING", "PROCESSING"]);
    if (!error && count === 0) {
      await supabaseAdmin.from("campaigns").update({
        status: "COMPLETED",
        completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", campaignId);
    }
  }
  /**
   * Start the worker loop
   */
  static startWorker() {
    setInterval(async () => {
      await this.processNext();
    }, 15e3);
  }
};

// src/serverApp.ts
init_supabaseAdmin();
import { serve } from "inngest/express";

// src/lib/inngest.client.ts
import { Inngest } from "inngest";
var inngest = new Inngest({
  id: "tl-connect",
  name: "TL Connect Outreach Engine"
});

// src/modules/inngest/email.workflow.ts
init_supabaseAdmin();
var dispatchEmailWorkflow = inngest.createFunction(
  {
    id: "dispatch-outreach-email",
    name: "Dispatch Outreach Email",
    triggers: [{ event: "outreach/email.dispatch" }],
    retries: 3,
    concurrency: {
      limit: 2,
      key: "event.data.workspaceId"
    },
    throttle: {
      limit: 1,
      period: "2s",
      key: "event.data.workspaceId"
    }
  },
  async ({ event, step }) => {
    const { campaignId, leadId, workspaceId, toEmail, subject, html } = event.data;
    const canSend = await step.run("validate-recipient-and-limits", async () => {
      const { data: isUnsubscribed } = await supabaseAdmin.from("unsubscribes").select("id").eq("email", toEmail.toLowerCase().trim()).eq("workspace_id", workspaceId).maybeSingle();
      if (isUnsubscribed) {
        await supabaseAdmin.from("activities").insert({
          type: "EMAIL_SUPPRESSED",
          description: `Email to ${toEmail} suppressed (unsubscribed)`,
          metadata: { campaignId, leadId, reason: "unsubscribed" },
          lead_id: leadId,
          workspace_id: workspaceId
        });
        return { ok: false, reason: "unsubscribed" };
      }
      if (campaignId) {
        const { data: campaign } = await supabaseAdmin.from("campaigns").select("status").eq("id", campaignId).single();
        if (!campaign || campaign.status !== "RUNNING") {
          return { ok: false, reason: "campaign_stopped" };
        }
      }
      const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId);
      const limit = emailConfig.dailyLimit || 1e3;
      const startOfDay = /* @__PURE__ */ new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: sentToday } = await supabaseAdmin.from("activities").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("type", "EMAIL_SENT").gte("created_at", startOfDay.toISOString());
      if ((sentToday || 0) >= limit) {
        return { ok: false, reason: "daily_limit_reached" };
      }
      return { ok: true, emailConfig };
    });
    if (!canSend.ok) {
      return { skipped: true, reason: canSend.reason };
    }
    const sendResult = await step.run("send-email-via-provider", async () => {
      const emailConfig = await EmailProviderFactory.getProviderForWorkspace(workspaceId);
      const provider = emailConfig.provider;
      const fromEmail = event.data.fromEmail || emailConfig.fromEmail;
      const fromName = event.data.fromName || emailConfig.fromName;
      const result = await provider.send({
        toEmail,
        fromEmail,
        fromName,
        subject: subject || "Outreach",
        html: html || "<p>Hello</p>",
        metadata: {
          campaignId,
          leadId,
          workspaceId,
          provider: emailConfig.providerType
        }
      });
      if (!result.success) {
        throw new Error(result.error || `Failed to send email via ${emailConfig.providerType}`);
      }
      if (campaignId) {
        const { data: campaign } = await supabaseAdmin.from("campaigns").select("stats_sent").eq("id", campaignId).single();
        await supabaseAdmin.from("campaigns").update({ stats_sent: (campaign?.stats_sent || 0) + 1 }).eq("id", campaignId);
      }
      await supabaseAdmin.from("activities").insert({
        type: "EMAIL_SENT",
        description: `Campaign email sent to ${toEmail} via ${emailConfig.providerType}`,
        metadata: {
          campaignId,
          leadId,
          provider: emailConfig.providerType,
          messageId: result.messageId
        },
        lead_id: leadId,
        workspace_id: workspaceId
      });
      return {
        success: true,
        messageId: result.messageId,
        provider: emailConfig.providerType
      };
    });
    return sendResult;
  }
);

// src/modules/inngest/campaign.workflow.ts
init_supabaseAdmin();
var runCampaignWorkflow = inngest.createFunction(
  {
    id: "run-outreach-campaign",
    name: "Run Outreach Campaign Fanout",
    triggers: [{ event: "outreach/campaign.started" }]
  },
  async ({ event, step }) => {
    const { campaignId, workspaceId } = event.data;
    const campaignData = await step.run("fetch-campaign-and-leads", async () => {
      const { data: campaign2, error: campErr } = await supabaseAdmin.from("campaigns").select("*, templates(*)").eq("id", campaignId).eq("workspace_id", workspaceId).single();
      if (campErr || !campaign2) {
        throw new Error("Campaign not found");
      }
      const { data: leads2, error: leadsErr } = await supabaseAdmin.from("leads").select("*").eq("workspace_id", workspaceId).eq("is_deleted", false);
      if (leadsErr) throw leadsErr;
      return {
        campaign: campaign2,
        template: campaign2.templates,
        leads: leads2 || []
      };
    });
    const { campaign, template, leads } = campaignData;
    if (!leads.length || !template) {
      return { status: "completed", dispatched: 0 };
    }
    const eventsToDispatch = leads.map((lead) => {
      let personalizedHtml = template.body_html || "";
      personalizedHtml = personalizedHtml.replace(/{{first_name}}/gi, lead.first_name || lead.firstName || "there").replace(/{{last_name}}/gi, lead.last_name || lead.lastName || "").replace(/{{email}}/gi, lead.email || "").replace(/{{company}}/gi, lead.company_name || lead.companyName || "your company").replace(/{{title}}/gi, lead.title || "Leader").replace(
        /{{unsubscribe_link}}/gi,
        `${process.env.APP_URL || "https://connect.transferlegacy.com"}/api/unsubscribe?email=${encodeURIComponent(lead.email)}&workspaceId=${workspaceId}`
      );
      let personalizedSubject = template.subject || "Outreach";
      personalizedSubject = personalizedSubject.replace(/{{first_name}}/gi, lead.first_name || lead.firstName || "there").replace(/{{company}}/gi, lead.company_name || lead.companyName || "your company");
      return {
        name: "outreach/email.dispatch",
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          workspaceId,
          toEmail: lead.email,
          subject: personalizedSubject,
          html: personalizedHtml
        }
      };
    });
    await step.sendEvent("fan-out-lead-emails", eventsToDispatch);
    return {
      status: "dispatched",
      totalLeads: leads.length,
      campaignId
    };
  }
);

// src/modules/inngest/index.ts
var inngestFunctions = [dispatchEmailWorkflow, runCampaignWorkflow];

// src/serverApp.ts
async function createApp() {
  const app = express();
  if (process.env.VERCEL !== "1" && !process.env.NOW_REGION) {
    QueueService.startWorker();
  }
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
  async function bootstrap() {
    try {
      const adminEmail = (process.env.ADMIN_EMAIL || "admin@transferlegacy.com").toLowerCase().trim();
      const adminPass = (process.env.ADMIN_PASSWORD || "change-me-immediately").trim();
      console.log("[Bootstrap] Starting admin sync...");
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
        console.warn("[Bootstrap] Missing Supabase credentials. Background sync skipped.");
        return;
      }
      const authAdmin = supabaseAdmin.auth.admin;
      if (!authAdmin) {
        console.warn("[Bootstrap] Supabase auth admin API not available. Skipping admin bootstrap.");
        return;
      }
      const { data: listData, error: listError } = await authAdmin.listUsers();
      if (listError) {
        console.error("[Bootstrap] Auth list failed:", listError.message);
        return;
      }
      const users = listData?.users || [];
      let targetAuthUser = users.find((u) => u.email?.toLowerCase() === adminEmail);
      if (!targetAuthUser) {
        const { data: createData, error: sbError } = await authAdmin.createUser({
          email: adminEmail,
          password: adminPass,
          email_confirm: true,
          user_metadata: { bootstrapped: true }
        });
        if (sbError) {
          console.error("[Bootstrap] Auth creation failed:", sbError.message);
          return;
        }
        targetAuthUser = createData?.user;
      } else {
        await authAdmin.updateUserById(targetAuthUser.id, {
          password: adminPass,
          email_confirm: true
        });
      }
      const { data: workspaces, error: wsError } = await supabaseAdmin.from("workspaces").select("*").limit(1);
      if (wsError) {
        console.error("[Bootstrap] Workspace fetch error:", wsError.message);
        if (wsError.message?.includes("schema cache")) {
          console.error("[Bootstrap] CRITICAL: Tables missing in Supabase. Did you run schema.sql?");
        }
      }
      let workspace = workspaces?.[0];
      if (!workspace) {
        const { data, error: insertWsError } = await supabaseAdmin.from("workspaces").insert({
          id: "default-workspace-id",
          name: "Transfer Legacy HQ",
          slug: "tl-hq",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).select().single();
        if (insertWsError) {
          console.error("[Bootstrap] Workspace creation failed:", insertWsError.message);
        }
        workspace = data;
      }
      if (workspace && targetAuthUser) {
        const { data: dbUser, error: fetchUserError } = await supabaseAdmin.from("users").select("*").eq("email", adminEmail).maybeSingle();
        if (fetchUserError) {
          console.error("[Bootstrap] User fetch error:", fetchUserError.message);
        }
        if (!dbUser) {
          const { error: insertUserError } = await supabaseAdmin.from("users").insert({
            id: targetAuthUser.id,
            email: adminEmail,
            role: "SUPER_ADMIN",
            workspace_id: workspace.id,
            name: "System Super Admin",
            password_hash: "SB_MANAGED",
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          if (insertUserError) {
            console.error("[Bootstrap] user creation failed:", insertUserError.message);
          }
        } else {
          await supabaseAdmin.from("users").update({ role: "SUPER_ADMIN" }).eq("email", adminEmail);
        }
        console.log("[Bootstrap] Admin sync complete.");
        console.log("[Bootstrap] Seeding templates...");
        await TemplateService.seedDefaults(workspace.id);
        console.log("[Bootstrap] Template seeding complete.");
      }
    } catch (err) {
      console.error("[Bootstrap] Error:", err.message || err);
    }
  }
  bootstrap().catch((err) => console.error("[Bootstrap Background Error]", err));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/unsubscribe", async (req, res) => {
    const { email, workspaceId } = req.query;
    if (!email || !workspaceId) {
      return res.status(400).send("<h1>Invalid unsubscribe link</h1>");
    }
    try {
      const { error } = await supabaseAdmin.from("unsubscribes").insert({
        email: String(email).toLowerCase().trim(),
        workspace_id: String(workspaceId)
      });
      if (error && error.code !== "23505") {
        throw error;
      }
      await supabaseAdmin.from("activities").insert({
        type: "EMAIL_UNSUBSCRIBED",
        description: `${email} unsubscribed from campaign emails`,
        metadata: { email, source: "unsubscribe_link" },
        workspace_id: String(workspaceId)
      });
      res.send(`
        <html>
          <head>
            <title>Unsubscribed</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
              .card { background: white; padding: 2.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; max-width: 400px; width: 100%; border: 1px solid #e5e7eb; }
              h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 700; color: #1f2937; }
              p { color: #4b5563; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem; }
              .logo { font-weight: 800; font-size: 1.25rem; color: #4f46e5; margin-bottom: 1.5rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">TL Connect</div>
              <h1>Unsubscribe Successful</h1>
              <p>You have been successfully unsubscribed from this workspace's mailing list. You will no longer receive marketing or outreach emails from us.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("Unsubscribe error:", err);
      res.status(500).send("<h1>Something went wrong</h1>");
    }
  });
  app.post("/api/webhooks/mailjet", async (req, res) => {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const event of events) {
      try {
        const payloadStr = event.Payload || event.payload;
        if (!payloadStr) continue;
        let metadata;
        try {
          metadata = JSON.parse(payloadStr);
        } catch {
          continue;
        }
        const { campaignId, leadId, workspaceId, jobId } = metadata;
        if (!campaignId || !workspaceId) continue;
        const { data: campaign } = await supabaseAdmin.from("campaigns").select("stats_opened, stats_clicked, stats_bounced").eq("id", campaignId).single();
        if (campaign) {
          const updateObj = {};
          if (event.event === "open") updateObj.stats_opened = (campaign.stats_opened || 0) + 1;
          if (event.event === "click") updateObj.stats_clicked = (campaign.stats_clicked || 0) + 1;
          if (event.event === "bounce") updateObj.stats_bounced = (campaign.stats_bounced || 0) + 1;
          if (Object.keys(updateObj).length > 0) {
            await supabaseAdmin.from("campaigns").update(updateObj).eq("id", campaignId);
          }
        }
        let activityType = "EMAIL_EVENT";
        let description = `Mailjet event: ${event.event} for ${event.email}`;
        if (event.event === "open") {
          activityType = "EMAIL_OPENED";
          description = `Email opened by ${event.email}`;
        } else if (event.event === "click") {
          activityType = "EMAIL_CLICKED";
          description = `Email link clicked by ${event.email}`;
        } else if (event.event === "bounce") {
          activityType = "EMAIL_BOUNCED";
          description = `Email bounced for ${event.email}`;
        } else if (event.event === "spam") {
          activityType = "EMAIL_SPAM";
          description = `Email reported as spam by ${event.email}`;
        } else if (event.event === "blocked") {
          activityType = "EMAIL_BLOCKED";
          description = `Email blocked for ${event.email}`;
        } else if (event.event === "unsub") {
          activityType = "EMAIL_UNSUBSCRIBED";
          description = `Email unsubscribed by ${event.email}`;
          await supabaseAdmin.from("unsubscribes").insert({
            email: String(event.email).toLowerCase().trim(),
            workspace_id: workspaceId
          }).select().maybeSingle();
        }
        await supabaseAdmin.from("activities").insert({
          type: activityType,
          description,
          metadata: {
            campaignId,
            leadId,
            jobId,
            mailjetMessageId: event.MessageID,
            mailjetEvent: event.event,
            eventTime: event.time
          },
          lead_id: leadId,
          workspace_id: workspaceId
        });
      } catch (err) {
        console.error("Error processing Mailjet event:", err);
      }
    }
    res.status(200).json({ status: "ok" });
  });
  app.post("/api/webhooks/brevo", async (req, res) => {
    try {
      const event = req.body;
      const email = event.email;
      const eventType = event.event;
      if (email) {
        let activityType = "EMAIL_EVENT";
        if (eventType === "opened") activityType = "EMAIL_OPENED";
        else if (eventType === "click") activityType = "EMAIL_CLICKED";
        else if (eventType?.includes("bounce")) activityType = "EMAIL_BOUNCED";
        else if (eventType === "unsubscribe") {
          activityType = "EMAIL_UNSUBSCRIBED";
          await supabaseAdmin.from("unsubscribes").insert({
            email: String(email).toLowerCase().trim(),
            workspace_id: event.workspaceId || "default-workspace-id"
          }).select().maybeSingle();
        }
        await supabaseAdmin.from("activities").insert({
          type: activityType,
          description: `Brevo event: ${eventType} for ${email}`,
          metadata: { ...event, provider: "brevo" },
          workspace_id: event.workspaceId || "default-workspace-id"
        });
      }
      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("Brevo webhook error:", err);
      res.status(200).json({ status: "ok" });
    }
  });
  app.post("/api/webhooks/resend", async (req, res) => {
    try {
      const { type, data } = req.body;
      const email = data?.to?.[0];
      if (email && type) {
        let activityType = "EMAIL_EVENT";
        if (type === "email.opened") activityType = "EMAIL_OPENED";
        else if (type === "email.clicked") activityType = "EMAIL_CLICKED";
        else if (type === "email.bounced") activityType = "EMAIL_BOUNCED";
        else if (type === "email.complained") activityType = "EMAIL_SPAM";
        await supabaseAdmin.from("activities").insert({
          type: activityType,
          description: `Resend event: ${type} for ${email}`,
          metadata: { ...data, eventType: type, provider: "resend" },
          workspace_id: data?.workspaceId || "default-workspace-id"
        });
      }
      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("Resend webhook error:", err);
      res.status(200).json({ status: "ok" });
    }
  });
  app.post("/api/webhooks/sendgrid", async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      for (const event of events) {
        const email = event.email;
        const eventType = event.event;
        if (email) {
          let activityType = "EMAIL_EVENT";
          if (eventType === "open") activityType = "EMAIL_OPENED";
          else if (eventType === "click") activityType = "EMAIL_CLICKED";
          else if (eventType === "bounce" || eventType === "dropped") activityType = "EMAIL_BOUNCED";
          else if (eventType === "spamreport") activityType = "EMAIL_SPAM";
          await supabaseAdmin.from("activities").insert({
            type: activityType,
            description: `SendGrid event: ${eventType} for ${email}`,
            metadata: { ...event, provider: "sendgrid" },
            workspace_id: event.workspaceId || "default-workspace-id"
          });
        }
      }
      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("SendGrid webhook error:", err);
      res.status(200).json({ status: "ok" });
    }
  });
  app.post("/api/queue/process", async (req, res) => {
    const cronSecret = req.headers["x-cron-secret"];
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized: Invalid cron secret" });
    }
    try {
      const processedCount = await QueueService.processBatch(10);
      res.json({ success: true, processed: processedCount });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.use("/api/inngest", serve({ client: inngest, functions: inngestFunctions }));
  const api = express.Router();
  api.use(authMiddleware);
  api.get("/health", async (req, res) => {
    try {
      const results = {};
      const tables = ["users", "workspaces", "leads", "templates", "campaigns"];
      for (const table of tables) {
        const { data, error, count } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
        results[table] = error ? { error: error.message, code: error.code } : { ok: true, count };
      }
      res.json({
        status: "ok",
        database: results,
        env: {
          hasUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
          hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
          hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
          adminEmail: process.env.ADMIN_EMAIL || "admin@transferlegacy.com"
        }
      });
    } catch (e) {
      res.status(500).json({ status: "error", error: e.message });
    }
  });
  api.get("/leads", requirePermission(PERMISSIONS.LEADS_VIEW), async (req, res) => {
    try {
      const data = await LeadService.getLeads(req.user.workspaceId, req.query);
      res.json(data);
    } catch (e) {
      console.error("[API] GET /leads failure:", {
        message: e.message,
        stack: e.stack,
        workspaceId: req.user?.workspaceId
      });
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });
  api.post("/leads", requirePermission(PERMISSIONS.LEADS_EDIT), async (req, res) => {
    try {
      const data = await LeadService.createLead(req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      console.error("[API] POST /leads failure:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });
  api.post("/leads/bulk", requirePermission(PERMISSIONS.LEADS_EDIT), async (req, res) => {
    try {
      const { leads } = req.body;
      if (!Array.isArray(leads)) {
        return res.status(400).json({ error: "Leads must be an array" });
      }
      const data = await LeadService.bulkCreateLeads(req.user.workspaceId, leads);
      res.json(data);
    } catch (e) {
      console.error("[API] POST /leads/bulk failure:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });
  api.delete("/leads/:id", requirePermission(PERMISSIONS.LEADS_DELETE), async (req, res) => {
    try {
      await LeadService.deleteLead(req.params.id, req.user.workspaceId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.put("/leads/:id", requirePermission(PERMISSIONS.LEADS_EDIT), async (req, res) => {
    try {
      const data = await LeadService.updateLead(req.params.id, req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to update lead" });
    }
  });
  api.patch("/leads/:id", requirePermission(PERMISSIONS.LEADS_EDIT), async (req, res) => {
    try {
      const data = await LeadService.updateLead(req.params.id, req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to update lead" });
    }
  });
  api.post("/leads/:id/send-email", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const { subject, html, fromName, fromEmail, providerId } = req.body;
      if (!subject || !html) {
        return res.status(400).json({ error: "Subject and HTML content are required" });
      }
      const result = await LeadService.sendDirectEmail(req.params.id, req.user.workspaceId, {
        subject,
        html,
        fromName,
        fromEmail,
        providerId
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to send direct email" });
    }
  });
  api.get("/auth/me", async (req, res) => {
    res.json(req.user);
  });
  api.post("/auth/log-login", async (req, res) => {
    try {
      await supabaseAdmin.from("login_logs").insert({
        user_id: req.user.id,
        email: req.user.email,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        status: "SUCCESS"
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to log login" });
    }
  });
  api.get("/campaigns", requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
    try {
      const data = await CampaignService.getCampaigns(req.user.workspaceId);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/campaigns", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.createCampaign(req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/campaigns/:id/start", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.startCampaign(req.params.id, req.user.workspaceId);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/campaigns/:id/stop", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.stopCampaign(req.params.id, req.user.workspaceId);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.delete("/campaigns/:id", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      await CampaignService.deleteCampaign(req.params.id, req.user.workspaceId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.put("/campaigns/:id", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.updateCampaign(req.params.id, req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to update campaign" });
    }
  });
  api.patch("/campaigns/:id", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await CampaignService.updateCampaign(req.params.id, req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to update campaign" });
    }
  });
  api.get("/templates", requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
    try {
      const data = await TemplateService.getTemplates(req.user.workspaceId);
      res.json(data);
    } catch (e) {
      console.error("[API] GET /templates failure:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });
  api.post("/templates", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await TemplateService.createTemplate(req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.patch("/templates/:id", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      const data = await TemplateService.updateTemplate(req.params.id, req.user.workspaceId, req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.delete("/templates/:id", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      await TemplateService.deleteTemplate(req.params.id, req.user.workspaceId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/templates/seed", requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req, res) => {
    try {
      await TemplateService.seedDefaults(req.user.workspaceId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.get("/analytics/overview", requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
    try {
      const data = await AnalyticsService.getWorkspaceMetrics(req.user.workspaceId);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.get("/activity", requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
    try {
      const { ActivityService: ActivityService2 } = await Promise.resolve().then(() => (init_activity_service(), activity_service_exports));
      const data = await ActivityService2.getWorkspaceActivity(req.user.workspaceId);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.get("/logs/emails", requirePermission(PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
    try {
      const { ActivityService: ActivityService2 } = await Promise.resolve().then(() => (init_activity_service(), activity_service_exports));
      const data = await ActivityService2.getEmailLogs(req.user.workspaceId, Number(req.query.limit) || 100);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.get("/inbox", requirePermission("inbox.view"), async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from("activities").select("*").eq("workspace_id", req.user.workspaceId).eq("type", "REPLY").order("created_at", { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.get("/domains", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { data: domains, error } = await supabaseAdmin.from("domains").select("*").eq("workspace_id", req.user.workspaceId);
      if (error) throw error;
      res.json(domains);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/domains", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { data: domain, error } = await supabaseAdmin.from("domains").insert({
        ...req.body,
        workspace_id: req.user.workspaceId
      }).select().single();
      if (error) throw error;
      res.json(domain);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.delete("/domains/:id", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { error } = await supabaseAdmin.from("domains").delete().eq("id", req.params.id).eq("workspace_id", req.user.workspaceId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.get("/users", requirePermission("users.view"), async (req, res) => {
    try {
      const { data: users, error } = await supabaseAdmin.from("users").select("id, email, name, role, created_at").eq("workspace_id", req.user.workspaceId);
      if (error) throw error;
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.delete("/users/:id", requirePermission(PERMISSIONS.USER_DELETE), async (req, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      const { error } = await supabaseAdmin.from("users").delete().eq("id", req.params.id).eq("workspace_id", req.user.workspaceId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.get("/settings/email-providers", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from("email_providers").select("*").eq("workspace_id", req.user.workspaceId).order("is_default", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/settings/email-providers", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { provider_type, name, from_email, from_name, reply_to, credentials, daily_limit, is_default } = req.body;
      if (!provider_type || !from_email || !from_name) {
        return res.status(400).json({ error: "provider_type, from_email, and from_name are required" });
      }
      if (is_default) {
        await supabaseAdmin.from("email_providers").update({ is_default: false }).eq("workspace_id", req.user.workspaceId);
      }
      const { data, error } = await supabaseAdmin.from("email_providers").insert({
        workspace_id: req.user.workspaceId,
        provider_type,
        name: name || `${provider_type.toUpperCase()} Provider`,
        from_email,
        from_name,
        reply_to: reply_to || null,
        credentials: credentials || {},
        daily_limit: Number(daily_limit) || 1e3,
        is_active: true,
        is_default: !!is_default
      }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.put("/settings/email-providers/:id", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { id } = req.params;
      const { provider_type, name, from_email, from_name, reply_to, credentials, daily_limit, is_active, is_default } = req.body;
      if (is_default) {
        await supabaseAdmin.from("email_providers").update({ is_default: false }).eq("workspace_id", req.user.workspaceId);
      }
      const updateData = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      if (provider_type !== void 0) updateData.provider_type = provider_type;
      if (name !== void 0) updateData.name = name;
      if (from_email !== void 0) updateData.from_email = from_email;
      if (from_name !== void 0) updateData.from_name = from_name;
      if (reply_to !== void 0) updateData.reply_to = reply_to;
      if (credentials !== void 0) updateData.credentials = credentials;
      if (daily_limit !== void 0) updateData.daily_limit = Number(daily_limit);
      if (is_active !== void 0) updateData.is_active = is_active;
      if (is_default !== void 0) updateData.is_default = is_default;
      const { data, error } = await supabaseAdmin.from("email_providers").update(updateData).eq("id", id).eq("workspace_id", req.user.workspaceId).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.delete("/settings/email-providers/:id", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin.from("email_providers").delete().eq("id", id).eq("workspace_id", req.user.workspaceId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/settings/email-providers/:id/set-default", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { id } = req.params;
      await supabaseAdmin.from("email_providers").update({ is_default: false }).eq("workspace_id", req.user.workspaceId);
      const { data, error } = await supabaseAdmin.from("email_providers").update({ is_default: true, is_active: true, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).eq("workspace_id", req.user.workspaceId).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  api.post("/settings/email-providers/test", requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
    try {
      const { provider_type, credentials, from_email, from_name, test_to_email } = req.body;
      const targetEmail = test_to_email || req.user.email;
      if (!targetEmail) {
        return res.status(400).json({ error: "Target email for test is required" });
      }
      const provider = EmailProviderFactory.createProvider(provider_type, credentials);
      const result = await provider.send({
        toEmail: targetEmail,
        fromEmail: from_email || "outreach@transferlegacy.com",
        fromName: from_name || "TL Connect Tester",
        subject: `[TL Connect] Test Email via ${provider_type?.toUpperCase()}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">TL Connect Test Message</h2>
            <p>Congratulations! Your <strong>${provider_type?.toUpperCase()}</strong> configuration is working properly.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 15px 0;">
            <p style="font-size: 12px; color: #64748b;">Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}</p>
          </div>
        `,
        text: `TL Connect Test Message. Your ${provider_type?.toUpperCase()} configuration is working properly.`
      });
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error || "Failed to send test email" });
      }
      res.json({ success: true, messageId: result.messageId, provider: result.provider });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.use("/api", api);
  return app;
}

// src/serverless.ts
var cachedApp = null;
async function handler(req, res) {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return cachedApp(req, res);
}
export {
  handler as default
};
