import { z } from "zod";

import type { ToolRegistration } from "./context.js";
import { runTool } from "./result.js";

const outputSchema = {
  pages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string().optional(),
      instagram: z
        .object({ id: z.string(), username: z.string().optional() })
        .nullable(),
    }),
  ),
};

export const registerListPagesTool: ToolRegistration = (server, context) => {
  server.registerTool(
    "list_pages",
    {
      title: "List Facebook Pages",
      description:
        "Lists every Facebook Page the configured Meta token administers, with each Page's linked Instagram Business account when one exists. Use this to pick the page_id other tools should target.",
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () =>
      runTool(async () => {
        const pages = await context.pages.list();

        return {
          pages: pages.map((page) => ({
            id: page.id,
            name: page.name,
            category: page.category,
            instagram: page.instagram ?? null,
          })),
        };
      }),
  );
};
