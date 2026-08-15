import type { Meta, StoryObj } from "@storybook/react"

import { Breadcrumb } from "./breadcrumb"

const meta: Meta<typeof Breadcrumb> = {
  title: "Components/Breadcrumb",
  component: Breadcrumb,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

// ── TwoLevel ──────────────────────────────────────────────────────────────────
// Canonical case: parent section link + entity-name leaf. Mirrors the real
// call sites (`Jobs › Oscar Delgado`, `Customers › Jenna Ortiz`) replacing
// "← Back" on detail pages. No next/link in Storybook, so the parent renders
// as a plain `<a>` — `Breadcrumb.Link` defaults to that when `asChild` is
// omitted, same as a consumer passing its own `Link` via `asChild` would.
export const TwoLevel: Story = {
  render: () => (
    <Breadcrumb>
      <Breadcrumb.Item>
        <Breadcrumb.Link href="#">Jobs</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Oscar Delgado</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb>
  ),
}

// ── ParentOnly ────────────────────────────────────────────────────────────────
// Spec fallback: "if the entity name is unavailable (loading / not-found),
// render the parent crumb alone rather than a placeholder leaf." Read
// literally, the parent crumb is what renders alone — it stays a `Link`
// (not a `Page`), since there is no leaf state to mark as current; no
// separator, no second item.
export const ParentOnly: Story = {
  render: () => (
    <Breadcrumb>
      <Breadcrumb.Item>
        <Breadcrumb.Link href="#">Jobs</Breadcrumb.Link>
      </Breadcrumb.Item>
    </Breadcrumb>
  ),
}

// ── LongName ──────────────────────────────────────────────────────────────────
// Long entity name at a narrow container width, exercising the root `<ol>`'s
// `flex-wrap` + `break-words` so the leaf wraps instead of overflowing the
// detail-page head.
export const LongName: Story = {
  render: () => (
    <div className="max-w-[240px]">
      <Breadcrumb>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="#">Customers</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>
            Alessandra Montgomery-Whitfield-Escobar
          </Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb>
    </div>
  ),
}
