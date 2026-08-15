import type { FakeMetaUser } from "./fake-meta.js";

export const ALPHA: FakeMetaUser = {
  fbUserId: "fb-user-alpha",
  name: "Alex Alpha",
  pages: [
    {
      id: "page-alpha-main",
      name: "Alpha Studio",
      category: "Media",
      instagram: { id: "ig-alpha", username: "alphastudio" },
    },
    { id: "page-alpha-side", name: "Alpha Side Project", category: "Blog" },
  ],
};

export const BETA: FakeMetaUser = {
  fbUserId: "fb-user-beta",
  name: "Bo Beta",
  pages: [{ id: "page-beta-main", name: "Beta Works", category: "Business" }],
};

export const BOTH_USERS = [ALPHA, BETA];
