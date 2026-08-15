import { z } from "zod";

import { PageResolutionError } from "../errors.js";
import type { UserToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { graphIdSchema } from "./schemas.js";

const inputSchema = {
  page_id: graphIdSchema("page_id").describe(
    'Facebook Page id to make the standing target for every other tool, e.g. "102938475610293". Call list_pages first to see the available ids.',
  ),
};

const outputSchema = {
  selected: z.object({
    id: z.string(),
    name: z.string(),
    instagram: z
      .object({ id: z.string(), username: z.string().optional() })
      .nullable(),
  }),
  note: z.string(),
};

// Confused-deputy defence: the id arrives from the client, but the Page it names is looked up in
// the *authenticated user's* own /me/accounts before anything is stored. A Page the caller does
// not administer resolves to nothing and the selection is refused.
export const registerSelectPageTool: UserToolRegistration = (
  server,
  context,
) => {
  server.registerTool(
    "select_page",
    {
      title: "Select the Facebook Page to manage",
      description:
        "Chooses which Facebook Page every other tool targets, and remembers it for this account until it is changed. The Page must be one you administer — it is verified against your own Meta account before it is stored.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const pages = await context.pages.list();
        const page = pages.find((candidate) => candidate.id === args.page_id);

        if (!page) {
          throw new PageResolutionError(
            `No Facebook Page with id ${args.page_id} is available to your Meta account. Call list_pages to see the ids you can select.`,
          );
        }

        await context.persistSelection(page);

        return {
          selected: {
            id: page.id,
            name: page.name,
            instagram: page.instagram ?? null,
          },
          note: `Every Page-scoped tool now targets "${page.name}" until you call select_page again.`,
        };
      }),
  );
};
