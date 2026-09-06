import { useEffect, useState } from "react";
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChartBar } from "@medusajs/icons";
import { Container, Heading, Text, Badge } from "@medusajs/ui";

type Overview = {
  sales_today_paise: number;
  orders_today: number;
  orders_total: number;
  pending_cod: number;
  awaiting_packing: number;
  packed: number;
  shipped: number;
  low_stock_count: number;
  low_stock: { inventory_item_id: string; available: number }[];
};

function rupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

/**
 * The morning screen: what came in, what needs doing, what is running out.
 *
 * Deliberately not a chart wall — with two owners packing from home, the useful
 * question is "what do I do next", not "how is the funnel trending".
 */
const OverviewPage = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/admin/sorbe/overview", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.statusText)))
      .then(setData)
      .catch(() => setError("Could not load the overview."));
  }, []);

  if (error) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-error">{error}</Text>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Loading…</Text>
      </Container>
    );
  }

  const tiles = [
    { label: "Sales today", value: rupees(data.sales_today_paise) },
    { label: "Orders today", value: String(data.orders_today) },
    { label: "Pending COD", value: String(data.pending_cod), urgent: data.pending_cod > 0 },
    { label: "To pack", value: String(data.awaiting_packing), urgent: data.awaiting_packing > 0 },
    { label: "Shipped", value: String(data.shipped) },
    { label: "Low stock", value: String(data.low_stock_count), urgent: data.low_stock_count > 0 },
  ];

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Overview</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          Everything that needs a decision today.
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-px bg-ui-border-base md:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-ui-bg-base px-6 py-5">
            <Text size="small" className="text-ui-fg-subtle">
              {tile.label}
            </Text>
            <div className="mt-1 flex items-center gap-2">
              <Heading level="h2">{tile.value}</Heading>
              {tile.urgent ? <Badge size="2xsmall" color="orange">needs action</Badge> : null}
            </div>
          </div>
        ))}
      </div>

      {data.low_stock.length > 0 ? (
        <div className="px-6 py-5">
          <Heading level="h3">Running out</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Available means stocked minus already reserved by open checkouts.
          </Text>
          <div className="mt-3 flex flex-col gap-2">
            {data.low_stock.map((item) => (
              <div key={item.inventory_item_id} className="flex justify-between">
                <Text size="small" className="font-mono">
                  {item.inventory_item_id.slice(0, 24)}…
                </Text>
                <Badge size="2xsmall" color={item.available <= 0 ? "red" : "orange"}>
                  {item.available} left
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Overview",
  icon: ChartBar,
});

export default OverviewPage;
