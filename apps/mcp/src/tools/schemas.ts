import { z } from "zod";

export const platformSchema = z
  .enum(["facebook", "instagram"])
  .describe(
    'Which network the id belongs to: "facebook" for Page posts and Page comments, "instagram" for IG media and IG comments.',
  );

export const pageRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const verificationSchema = {
  verified: z
    .boolean()
    .describe(
      "True when the object was read back from Meta and matched what was sent.",
    ),
  warnings: z.array(z.string()),
};
