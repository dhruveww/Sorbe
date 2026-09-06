import { useEffect, useState } from "react";
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChatBubbleLeftRight } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text, Textarea } from "@medusajs/ui";

type Template = {
  id: string;
  key: string;
  category: string;
  body_text: string;
  is_active: boolean;
  bsp_template_name: string | null;
};

type LogRow = {
  id: string;
  phone: string;
  template_key: string;
  status: string;
  error: string | null;
  created_at: string;
};

type Payload = {
  live: boolean;
  provider: string;
  caps: { per_sku_per_week: number; per_user_per_week: number };
  templates: Template[];
  counts: Record<string, number>;
  logs: LogRow[];
};

/** Renders {{variables}} with sample values so the preview reads like a message. */
function preview(body: string): string {
  const samples: Record<string, string> = {
    order_number: "1042",
    total: "129900",
    tracking_url: "https://track.example/abc",
    retry_url: "https://sorbe.example/checkout",
    product_name: "Pearl Drop Charm",
    product_url: "https://sorbe.example/products/pearl-drop-charm",
    code: "482913",
  };
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => samples[key] ?? `{{${key}}}`);
}

const WhatsAppPage = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/admin/sorbe/whatsapp", { credentials: "include" });
    if (response.ok) setData(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save(template: Template) {
    setSaving(template.key);
    setNotice(null);
    const response = await fetch("/admin/sorbe/whatsapp", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: template.key,
        body_text: drafts[template.key] ?? template.body_text,
      }),
    });
    setSaving(null);
    setNotice(response.ok ? "Saved." : "Could not save — owners only.");
    if (response.ok) load();
  }

  if (!data) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Loading…</Text>
      </Container>
    );
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Heading level="h1">WhatsApp</Heading>
          <Badge size="2xsmall" color={data.live ? "green" : "grey"}>
            {data.live ? "Live" : "Test mode"}
          </Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle">
          {data.live
            ? `Sending through ${data.provider}.`
            : "Nothing is being sent. Every trigger is logged below as it would have gone out, so you can check the wording and the limits before connecting WhatsApp."}
        </Text>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Limits: {data.caps.per_sku_per_week}/product/week · {data.caps.per_user_per_week}
          /customer/week
        </Text>
      </div>

      <div className="flex gap-4 px-6 py-4">
        {Object.entries(data.counts).map(([status, count]) => (
          <div key={status}>
            <Text size="small" className="text-ui-fg-subtle">
              {status.replace("_", " ")}
            </Text>
            <Heading level="h3">{count}</Heading>
          </div>
        ))}
      </div>

      <div className="px-6 py-5">
        <Heading level="h2">Messages</Heading>
        <div className="mt-4 flex flex-col gap-6">
          {data.templates.map((template) => (
            <div key={template.id} className="rounded-lg border border-ui-border-base p-4">
              <div className="flex items-center gap-2">
                <Text weight="plus">{template.key.replace(/_/g, " ")}</Text>
                <Badge size="2xsmall" color={template.category === "marketing" ? "orange" : "blue"}>
                  {template.category}
                </Badge>
                {!template.is_active ? (
                  <Badge size="2xsmall" color="red">
                    off
                  </Badge>
                ) : null}
              </div>

              <Textarea
                className="mt-3"
                rows={3}
                value={drafts[template.key] ?? template.body_text}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [template.key]: event.target.value }))
                }
              />

              {/* What the customer actually sees, with variables filled in. */}
              <div className="mt-3 max-w-md rounded-xl bg-ui-bg-subtle p-3">
                <Text size="small" className="text-ui-fg-subtle">
                  Preview
                </Text>
                <Text size="small" className="mt-1 whitespace-pre-wrap">
                  {preview(drafts[template.key] ?? template.body_text)}
                </Text>
              </div>

              <Button
                className="mt-3"
                size="small"
                variant="secondary"
                isLoading={saving === template.key}
                onClick={() => save(template)}
              >
                Save
              </Button>
            </div>
          ))}
        </div>
        {notice ? (
          <Text size="small" className="mt-3">
            {notice}
          </Text>
        ) : null}
      </div>

      <div className="px-6 py-5">
        <Heading level="h2">Recent</Heading>
        <div className="mt-3 flex flex-col gap-2">
          {data.logs.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              Nothing yet.
            </Text>
          ) : (
            data.logs.slice(0, 25).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3">
                <Text size="small">
                  {row.template_key.replace(/_/g, " ")} → ••••{row.phone.slice(-4)}
                </Text>
                <div className="flex items-center gap-2">
                  {row.error ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      {row.error}
                    </Text>
                  ) : null}
                  <Badge size="2xsmall" color={row.status === "sent" ? "green" : "grey"}>
                    {row.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "WhatsApp",
  icon: ChatBubbleLeftRight,
});

export default WhatsAppPage;
