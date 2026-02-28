"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface EmailSetting {
  trigger_name: string;
  enabled: number;
  recipients: string;
}

interface EmailTemplate {
  trigger_name: string;
  label: string;
  subject: string;
  body_html: string;
  customer_subject: string;
  customer_body_html: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  new_order: "New Order",
  order_approved: "Approved",
  order_rejected: "Rejected",
  order_paid: "Paid (Kitchen)",
  order_completed: "Completed",
  production_done: "Production Done",
  daily_schedule_foh: "FOH Schedule",
  production_alert_kitchen: "Kitchen Alert",
};

const EVENT_TRIGGERS = ["new_order", "order_approved", "order_rejected", "order_paid", "order_completed", "production_done"];
const SCHEDULED_TRIGGERS = ["daily_schedule_foh", "production_alert_kitchen"];

const SCHEDULED_TRIGGER_DESCRIPTIONS: Record<string, string> = {
  daily_schedule_foh: "Sent nightly with the next day's complete catering schedule — deliveries, pickups, customer info, and box counts. Configure your Railway cron to call GET /api/cron/daily-schedule at your preferred time (e.g., 9pm).",
  production_alert_kitchen: "Sent nightly with a production breakdown for orders fulfilling in 48 hours — flavor totals, box counts, and per-order checklists. Sent in the same cron call as the FOH schedule.",
};

const AVAILABLE_VARIABLES = [
  { name: "{{order_id}}", desc: "Order number" },
  { name: "{{customer_name}}", desc: "Customer full name" },
  { name: "{{customer_email}}", desc: "Customer email" },
  { name: "{{customer_phone}}", desc: "Customer phone" },
  { name: "{{fulfillment_type}}", desc: "Delivery or Pickup" },
  { name: "{{fulfillment_date}}", desc: "Date (YYYY-MM-DD)" },
  { name: "{{fulfillment_date_formatted}}", desc: "Date (e.g. Thursday, March 5, 2026)" },
  { name: "{{fulfillment_time}}", desc: "Time window" },
  { name: "{{delivery_address_line}}", desc: "Address line (delivery only)" },
  { name: "{{total}}", desc: "Order total (e.g. $225.00)" },
  { name: "{{items_html}}", desc: "Box & flavor breakdown with piece counts (HTML)" },
  { name: "{{items_html_simple}}", desc: "Box & flavor names only, no piece counts (HTML)" },
  { name: "{{delivery_note}}", desc: "Delivery quote note (delivery orders only)" },
  { name: "{{serves_count}}", desc: "Number of people being served (if provided)" },
  { name: "{{admin_url}}", desc: "Link to admin dashboard" },
  { name: "{{production_sheet}}", desc: "Full kitchen production sheet (order_paid only)" },
  { name: "{{rejection_reason}}", desc: "Rejection reason (order_rejected only)" },
];

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState<EmailSetting[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string>("new_order");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [templateMsg, setTemplateMsg] = useState("");
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/email-settings").then(r => r.json()),
      fetch("/api/email-templates").then(r => r.json()),
    ]).then(([s, t]) => {
      setSettings(s);
      setTemplates(t);
    });
  }, []);

  const currentTemplate = templates.find(t => t.trigger_name === activeTemplate);

  const updateSetting = (trigger: string, field: "enabled" | "recipients", value: string | number) => {
    setSettings(prev => prev.map(s =>
      s.trigger_name === trigger ? { ...s, [field]: value } : s
    ));
  };

  const updateTemplate = (field: "subject" | "body_html" | "customer_subject" | "customer_body_html", value: string) => {
    setTemplates(prev => prev.map(t =>
      t.trigger_name === activeTemplate ? { ...t, [field]: value } : t
    ));
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/email-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSettingsMsg(res.ok ? "Settings saved!" : "Failed to save settings.");
    } catch {
      setSettingsMsg("Error saving settings.");
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSettingsMsg(""), 3000);
    }
  };

  const saveTemplate = async () => {
    if (!currentTemplate) return;
    setIsSavingTemplate(true);
    setTemplateMsg("");
    try {
      const res = await fetch("/api/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger_name: currentTemplate.trigger_name,
          subject: currentTemplate.subject,
          body_html: currentTemplate.body_html,
          customer_subject: currentTemplate.customer_subject || '',
          customer_body_html: currentTemplate.customer_body_html || '',
        }),
      });
      setTemplateMsg(res.ok ? "Template saved!" : "Failed to save template.");
    } catch {
      setTemplateMsg("Error saving template.");
    } finally {
      setIsSavingTemplate(false);
      setTimeout(() => setTemplateMsg(""), 3000);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmailAddress) {
      setTestMsg("Enter a test email address.");
      return;
    }
    setIsSendingTest(true);
    setTestMsg("");
    try {
      const res = await fetch("/api/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailAddress, trigger_name: activeTemplate }),
      });
      const data = await res.json();
      setTestMsg(res.ok ? `Test email sent to ${testEmailAddress}!` : (data.error || "Failed to send test email."));
    } catch {
      setTestMsg("Error sending test email.");
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestMsg(""), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight">Email Settings</h1>
          <button
            onClick={() => router.push("/admin")}
            className="bg-black text-white font-black px-6 py-2 uppercase tracking-tight border-4 border-black hover:bg-white hover:text-black transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* SECTION 1: Event Notification Recipients */}
        <div className="border-4 border-black p-6 mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-1">Event Notifications</h2>
          <p className="text-sm text-gray-600 mb-6">
            Triggered immediately when an order changes state. Use comma-separated addresses for multiple recipients.
          </p>
          <div className="space-y-4">
            {settings.filter(s => EVENT_TRIGGERS.includes(s.trigger_name)).map((s) => (
              <div key={s.trigger_name} className="border-2 border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id={`toggle-${s.trigger_name}`}
                    checked={s.enabled === 1}
                    onChange={(e) => updateSetting(s.trigger_name, "enabled", e.target.checked ? 1 : 0)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor={`toggle-${s.trigger_name}`} className="font-black uppercase tracking-wide text-sm cursor-pointer">
                    {TRIGGER_LABELS[s.trigger_name] || s.trigger_name}
                  </label>
                </div>
                <input
                  type="text"
                  value={s.recipients}
                  onChange={(e) => updateSetting(s.trigger_name, "recipients", e.target.value)}
                  placeholder="email@example.com, another@example.com"
                  disabled={s.enabled === 0}
                  className="w-full px-3 py-2 border-2 border-black text-sm font-medium disabled:opacity-40 disabled:bg-gray-100"
                />
              </div>
            ))}
          </div>

          {/* Scheduled Notifications */}
          <div className="mt-8 pt-6 border-t-2 border-gray-300">
            <h3 className="text-lg font-black uppercase tracking-tight mb-1">Scheduled Notifications</h3>
            <p className="text-sm text-gray-600 mb-2">
              Sent on a schedule via Railway cron. Configure recipients here, then set up a cron job in Railway to call:
            </p>
            <code className="block text-xs bg-gray-100 border border-gray-300 px-3 py-2 rounded mb-4 font-mono">
              GET /api/cron/daily-schedule — add header: x-cron-secret: [your CRON_SECRET env var]
            </code>
            <div className="space-y-4">
              {settings.filter(s => SCHEDULED_TRIGGERS.includes(s.trigger_name)).map((s) => (
                <div key={s.trigger_name} className="border-2 border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id={`toggle-${s.trigger_name}`}
                      checked={s.enabled === 1}
                      onChange={(e) => updateSetting(s.trigger_name, "enabled", e.target.checked ? 1 : 0)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor={`toggle-${s.trigger_name}`} className="font-black uppercase tracking-wide text-sm cursor-pointer">
                      {TRIGGER_LABELS[s.trigger_name] || s.trigger_name}
                    </label>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">{SCHEDULED_TRIGGER_DESCRIPTIONS[s.trigger_name]}</p>
                  <input
                    type="text"
                    value={s.recipients}
                    onChange={(e) => updateSetting(s.trigger_name, "recipients", e.target.value)}
                    placeholder="email@example.com, another@example.com"
                    disabled={s.enabled === 0}
                    className="w-full px-3 py-2 border-2 border-blue-300 text-sm font-medium bg-white disabled:opacity-40 disabled:bg-gray-100"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={saveSettings}
              disabled={isSavingSettings}
              className="bg-[#E10600] text-white font-black px-6 py-3 uppercase tracking-tight border-4 border-[#E10600] hover:bg-black hover:border-black transition-colors disabled:opacity-50"
            >
              {isSavingSettings ? "Saving..." : "Save Recipients"}
            </button>
            {settingsMsg && (
              <span className={`text-sm font-black ${settingsMsg.includes("saved") ? "text-green-600" : "text-red-600"}`}>
                {settingsMsg}
              </span>
            )}
          </div>
        </div>

        {/* SECTION 2: Email Templates */}
        <div className="border-4 border-black p-6 mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-1">Email Templates</h2>
          <p className="text-sm text-gray-600 mb-6">
            Customize the subject and body for each notification. HTML is supported.
          </p>

          <div className="flex gap-2 flex-wrap mb-6">
            {templates.map((t) => (
              <button
                key={t.trigger_name}
                onClick={() => setActiveTemplate(t.trigger_name)}
                className={`px-4 py-2 text-sm font-black uppercase tracking-tight border-2 transition-colors ${
                  activeTemplate === t.trigger_name
                    ? "bg-[#E10600] text-white border-[#E10600]"
                    : "bg-white text-black border-black hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {currentTemplate && (
            <div className="space-y-6">
              {/* Admin notification template */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-1">
                  Admin / Internal Notification
                </p>
                <div>
                  <label className="block text-sm font-black uppercase tracking-wide mb-1">Subject</label>
                  <input
                    type="text"
                    value={currentTemplate.subject}
                    onChange={(e) => updateTemplate("subject", e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-wide mb-1">Body (HTML)</label>
                  <textarea
                    value={currentTemplate.body_html}
                    onChange={(e) => updateTemplate("body_html", e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border-2 border-black text-sm font-mono"
                  />
                </div>
              </div>

              {/* Customer-facing template (approved + rejected only) */}
              {(currentTemplate.trigger_name === "order_approved" || currentTemplate.trigger_name === "order_rejected") && (
                <div className="space-y-3 border-2 border-blue-200 bg-blue-50 p-4 rounded">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700 border-b border-blue-200 pb-1">
                    Customer Email — sent to {"{{"+"customer_email"+"}}"} on this trigger
                  </p>
                  <div>
                    <label className="block text-sm font-black uppercase tracking-wide mb-1 text-blue-800">Customer Subject</label>
                    <input
                      type="text"
                      value={currentTemplate.customer_subject || ""}
                      onChange={(e) => updateTemplate("customer_subject", e.target.value)}
                      placeholder="Leave blank to skip customer email"
                      className="w-full px-3 py-2 border-2 border-blue-300 text-sm font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black uppercase tracking-wide mb-1 text-blue-800">Customer Body (HTML)</label>
                    <textarea
                      value={currentTemplate.customer_body_html || ""}
                      onChange={(e) => updateTemplate("customer_body_html", e.target.value)}
                      rows={10}
                      placeholder="Leave blank to skip customer email"
                      className="w-full px-3 py-2 border-2 border-blue-300 text-sm font-mono bg-white"
                    />
                  </div>
                  <p className="text-xs text-blue-600">
                    💡 Leave both fields blank to disable the customer email for this trigger.
                    {currentTemplate.trigger_name === "order_rejected" && " Use {{rejection_reason}} to include the admin-entered reason."}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-200">
            <p className="text-xs font-black uppercase tracking-wide text-gray-700 mb-3">Available Template Variables</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <div key={v.name} className="text-xs flex items-baseline gap-1">
                  <code className="bg-white border border-gray-300 px-1 py-0.5 text-[#E10600] font-mono shrink-0">{v.name}</code>
                  <span className="text-gray-500">— {v.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={saveTemplate}
              disabled={isSavingTemplate}
              className="bg-[#E10600] text-white font-black px-6 py-3 uppercase tracking-tight border-4 border-[#E10600] hover:bg-black hover:border-black transition-colors disabled:opacity-50"
            >
              {isSavingTemplate ? "Saving..." : "Save Template"}
            </button>
            {templateMsg && (
              <span className={`text-sm font-black ${templateMsg.includes("saved") ? "text-green-600" : "text-red-600"}`}>
                {templateMsg}
              </span>
            )}
          </div>
        </div>

        {/* SECTION 3: Test Email */}
        <div className="border-4 border-black p-6">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-1">Send Test Email</h2>
          <p className="text-sm text-gray-600 mb-4">
            Send a test of the <strong>{TRIGGER_LABELS[activeTemplate]}</strong> template with sample data to verify formatting.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="your@email.com"
              className="px-3 py-2 border-2 border-black text-sm font-medium w-64"
            />
            <button
              onClick={sendTestEmail}
              disabled={isSendingTest}
              className="bg-black text-white font-black px-6 py-2 uppercase tracking-tight border-4 border-black hover:bg-[#E10600] hover:border-[#E10600] transition-colors disabled:opacity-50"
            >
              {isSendingTest ? "Sending..." : "Send Test"}
            </button>
            {testMsg && (
              <span className={`text-sm font-black ${testMsg.includes("sent") ? "text-green-600" : "text-red-600"}`}>
                {testMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
