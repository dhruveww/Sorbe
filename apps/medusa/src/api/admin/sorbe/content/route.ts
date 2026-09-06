import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { CONTENT_MODULE } from "../../../../modules/content";

/** Content editing is owner-only; packers have no reason to reword the shop. */
async function requireOwner(req: MedusaRequest): Promise<boolean> {
  const actorId = (req as any).auth_context?.actor_id as string | undefined;
  if (!actorId) return true;
  const userModule = req.scope.resolve(Modules.USER);
  const [user] = await userModule.listUsers({ id: actorId });
  return (((user?.metadata as any)?.role as string) ?? "owner") !== "packer";
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const content: any = req.scope.resolve(CONTENT_MODULE);

  const [popups, sections, faqs, reels, recommendations] = await Promise.all([
    content.listPopups({}),
    content.listCmsContents({}),
    content.listFaqItems({}),
    content.listReels({}),
    content.listManualRecommendations({}),
  ]);

  res.json({ popups, sections, faqs, reels, recommendations });
};

/**
 * Create or update one row. `entity` says which table, `id` decides create vs
 * update — one endpoint rather than five near-identical CRUD routes.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(await requireOwner(req))) {
    res.status(403).json({ message: "Only an owner can edit content." });
    return;
  }

  const content: any = req.scope.resolve(CONTENT_MODULE);
  const body = (req.body ?? {}) as { entity?: string; id?: string; data?: Record<string, unknown> };

  const creators: Record<string, string> = {
    popup: "Popups",
    section: "CmsContents",
    faq: "FaqItems",
    reel: "Reels",
    recommendation: "ManualRecommendations",
  };

  const suffix = creators[body.entity ?? ""];
  if (!suffix || !body.data) {
    res.status(400).json({ message: "entity and data are required" });
    return;
  }

  if (body.id) {
    await content[`update${suffix}`]({ id: body.id, ...body.data });
  } else {
    await content[`create${suffix}`](body.data);
  }

  res.json({ ok: true });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(await requireOwner(req))) {
    res.status(403).json({ message: "Only an owner can delete content." });
    return;
  }

  const content: any = req.scope.resolve(CONTENT_MODULE);
  const body = (req.body ?? {}) as { entity?: string; id?: string };

  const deleters: Record<string, string> = {
    popup: "Popups",
    section: "CmsContents",
    faq: "FaqItems",
    reel: "Reels",
    recommendation: "ManualRecommendations",
  };

  const suffix = deleters[body.entity ?? ""];
  if (!suffix || !body.id) {
    res.status(400).json({ message: "entity and id are required" });
    return;
  }

  await content[`delete${suffix}`](body.id);
  res.json({ ok: true });
};
