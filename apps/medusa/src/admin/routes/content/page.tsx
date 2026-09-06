import { useEffect, useState } from "react";
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { DocumentText } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Input, Text, Textarea } from "@medusajs/ui";

type Popup = {
  id: string;
  title: string;
  body_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  is_active: boolean;
  display_mode: string;
};

type Section = { id: string; section: string; title: string | null; body_html: string };
type Reel = {
  id: string;
  product_id: string;
  instagram_url: string;
  rights_status: string;
  is_published: boolean;
};

type Payload = { popups: Popup[]; sections: Section[]; reels: Reel[] };

const ContentPage = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [newPopup, setNewPopup] = useState({ title: "", body_text: "", cta_label: "", cta_url: "" });

  async function load() {
    const response = await fetch("/admin/sorbe/content", { credentials: "include" });
    if (response.ok) setData(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save(entity: string, id: string | undefined, payload: Record<string, unknown>) {
    const response = await fetch("/admin/sorbe/content", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity, id, data: payload }),
    });
    setNotice(response.ok ? "Saved." : "Could not save — owners only.");
    if (response.ok) load();
  }

  async function remove(entity: string, id: string) {
    const response = await fetch("/admin/sorbe/content", {
      method: "DELETE",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity, id }),
    });
    setNotice(response.ok ? "Deleted." : "Could not delete — owners only.");
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
        <Heading level="h1">Content</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Offers, page copy and Instagram Reels. Changes go live within a minute.
        </Text>
        {notice ? (
          <Text size="small" className="mt-2">
            {notice}
          </Text>
        ) : null}
      </div>

      {/* ---- Popups ---- */}
      <div className="px-6 py-5">
        <Heading level="h2">Offer popup</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Only one shows at a time — the active one with the highest priority.
        </Text>

        <div className="mt-4 flex flex-col gap-3">
          {data.popups.map((popup) => (
            <div
              key={popup.id}
              className="flex items-center justify-between rounded-lg border border-ui-border-base p-3"
            >
              <div>
                <Text weight="plus">{popup.title}</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {popup.body_text ?? "—"}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="2xsmall" color={popup.is_active ? "green" : "grey"}>
                  {popup.is_active ? "live" : "off"}
                </Badge>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => save("popup", popup.id, { is_active: !popup.is_active })}
                >
                  {popup.is_active ? "Turn off" : "Turn on"}
                </Button>
                <Button size="small" variant="danger" onClick={() => remove("popup", popup.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-ui-border-base p-3">
          <Text weight="plus">New popup</Text>
          <div className="mt-2 flex flex-col gap-2">
            <Input
              placeholder="Title, e.g. Free delivery over ₹999"
              value={newPopup.title}
              onChange={(event) => setNewPopup({ ...newPopup, title: event.target.value })}
            />
            <Input
              placeholder="Body text"
              value={newPopup.body_text}
              onChange={(event) => setNewPopup({ ...newPopup, body_text: event.target.value })}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Button label"
                value={newPopup.cta_label}
                onChange={(event) => setNewPopup({ ...newPopup, cta_label: event.target.value })}
              />
              <Input
                placeholder="Button link, e.g. /shop"
                value={newPopup.cta_url}
                onChange={(event) => setNewPopup({ ...newPopup, cta_url: event.target.value })}
              />
            </div>
            <Button
              size="small"
              disabled={!newPopup.title}
              onClick={() => {
                // Created switched OFF so nothing appears on the shop before
                // it has been read back and checked.
                save("popup", undefined, { ...newPopup, is_active: false });
                setNewPopup({ title: "", body_text: "", cta_label: "", cta_url: "" });
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Page copy ---- */}
      <div className="px-6 py-5">
        <Heading level="h2">Page copy</Heading>
        <div className="mt-4 flex flex-col gap-4">
          {data.sections.map((section) => (
            <div key={section.id} className="rounded-lg border border-ui-border-base p-3">
              <Text weight="plus">{section.section.replace(/_/g, " ")}</Text>
              <Textarea
                className="mt-2"
                rows={3}
                value={drafts[section.id] ?? section.body_html}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))
                }
              />
              <Button
                className="mt-2"
                size="small"
                variant="secondary"
                onClick={() =>
                  save("section", section.id, {
                    body_html: drafts[section.id] ?? section.body_html,
                  })
                }
              >
                Save
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Reels ---- */}
      <div className="px-6 py-5">
        <Heading level="h2">Instagram Reels</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          A Reel only appears on the shop when it is published AND rights are granted.
        </Text>
        <div className="mt-3 flex flex-col gap-2">
          {data.reels.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              None added yet. Attach Reels from a product's page.
            </Text>
          ) : (
            data.reels.map((reel) => (
              <div key={reel.id} className="flex items-center justify-between gap-3">
                <Text size="small" className="truncate">
                  {reel.instagram_url}
                </Text>
                <div className="flex items-center gap-2">
                  <Badge
                    size="2xsmall"
                    color={reel.rights_status === "granted" ? "green" : "orange"}
                  >
                    {reel.rights_status}
                  </Badge>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => save("reel", reel.id, { is_published: !reel.is_published })}
                  >
                    {reel.is_published ? "Unpublish" : "Publish"}
                  </Button>
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
  label: "Content",
  icon: DocumentText,
});

export default ContentPage;
