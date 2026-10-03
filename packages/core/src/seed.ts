import { AgentSchema, type Agent } from "./schema";

const t = "2026-10-03T00:00:00.000Z";

const raw = [
  {
    id: "inbox-zero",
    name: "Inbox Triage",
    tagline: "Drafts replies and clears the inbox so you only approve.",
    description: "Reads incoming email, labels by urgency, drafts replies in your voice and queues them for one-click approval.",
    solves: ["email", "inbox", "replies", "follow ups"],
    tools: ["Gmail", "Outlook", "Slack"],
    category: "Communication",
    protocol: "mcp",
    owner: "agents-space",
    pricing: "free",
    createdAt: t,
  },
  {
    id: "invoice-chaser",
    name: "Invoice Chaser",
    tagline: "Chases overdue invoices so you don't have to.",
    description: "Watches your billing system for overdue invoices and sends polite, escalating reminders.",
    solves: ["invoices", "payments", "accounts receivable", "billing"],
    tools: ["Stripe", "Xero", "QuickBooks", "Gmail"],
    category: "Finance",
    protocol: "mcp",
    owner: "agents-space",
    pricing: "usage",
    createdAt: t,
  },
  {
    id: "standup-scribe",
    name: "Standup Scribe",
    tagline: "Writes the status update nobody wants to write.",
    description: "Pulls activity from issue trackers and repos and posts a daily summary to your team channel.",
    solves: ["status updates", "standups", "reporting", "project management"],
    tools: ["Linear", "GitHub", "Jira", "Slack"],
    category: "Engineering",
    protocol: "mcp",
    owner: "agents-space",
    pricing: "free",
    createdAt: t,
  },
  {
    id: "lead-qualifier",
    name: "Lead Qualifier",
    tagline: "Researches and scores inbound leads before they hit your calendar.",
    description: "Enriches new leads, scores fit, and books only the qualified ones.",
    solves: ["sales", "leads", "scheduling", "crm"],
    tools: ["HubSpot", "Salesforce", "Google Calendar", "Calendly"],
    category: "Sales",
    protocol: "a2a",
    owner: "agents-space",
    pricing: "subscription",
    createdAt: t,
  },
  {
    id: "doc-answerer",
    name: "Docs Answerer",
    tagline: "Answers the same internal questions you get asked every day.",
    description: "Indexes your docs and wiki and answers team questions in Slack with citations.",
    solves: ["questions", "onboarding", "knowledge", "support"],
    tools: ["Notion", "Google Drive", "Confluence", "Slack"],
    category: "Knowledge",
    protocol: "mcp",
    owner: "agents-space",
    pricing: "free",
    createdAt: t,
  },
];

/** Example external listings so the directory is not empty on day one. */
export const seedAgents: Agent[] = raw.map((a) => AgentSchema.parse(a));
