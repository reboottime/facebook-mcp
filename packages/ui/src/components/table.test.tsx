import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { jest } from "@jest/globals"
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableSelectionBar,
  TableEmptyRow,
  TableErrorBand,
} from "./table"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestTableProps = Omit<React.ComponentPropsWithoutRef<typeof Table>, "totalCount" | "pageOffset"> & {
  totalCount?: number
  pageOffset?: number
}

/** Minimal table shell to satisfy HTML validity requirements. */
function TestTable({
  children,
  totalCount = 0,
  pageOffset = 0,
  ...props
}: TestTableProps) {
  return (
    <Table totalCount={totalCount} pageOffset={pageOffset} {...props}>
      <TableHeader>
        <tr><th>Col</th></tr>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Table — data contracts on the wrapper
// ---------------------------------------------------------------------------

describe("Table", () => {
  it("exposes density as data-density on the root element", () => {
    const { container } = render(
      <Table density="compact" totalCount={5} pageOffset={0}>
        <tbody />
      </Table>
    )
    expect(container.querySelector("[data-slot='table-root']")).toHaveAttribute("data-density", "compact")
  })

  it("defaults data-density to 'default'", () => {
    const { container } = render(
      <Table totalCount={0} pageOffset={0}>
        <tbody />
      </Table>
    )
    expect(container.querySelector("[data-slot='table-root']")).toHaveAttribute("data-density", "default")
  })

  it("exposes totalCount as data-total-count", () => {
    const { container } = render(
      <Table totalCount={42} pageOffset={0}>
        <tbody />
      </Table>
    )
    expect(container.querySelector("[data-slot='table-root']")).toHaveAttribute("data-total-count", "42")
  })

  it("exposes pageOffset as data-page-offset", () => {
    const { container } = render(
      <Table totalCount={0} pageOffset={20}>
        <tbody />
      </Table>
    )
    expect(container.querySelector("[data-slot='table-root']")).toHaveAttribute("data-page-offset", "20")
  })
})

// ---------------------------------------------------------------------------
// TableHeaderCell — accessibility contract
// ---------------------------------------------------------------------------

describe("TableHeaderCell", () => {
  it("renders with scope=col for column header semantics", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell label="Name" />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("scope", "col")
  })

  it("renders label text for non-sortable header", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell label="Status" />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument()
  })

  it("renders a button for sortable header so it is keyboard-activatable", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell label="Created" sortable />
          </tr>
        </thead>
      </table>
    )
    expect(screen.getByRole("button", { name: "Created" })).toBeInTheDocument()
  })

  it("does NOT render a button for non-sortable header", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell label="Created" />
          </tr>
        </thead>
      </table>
    )
    expect(screen.queryByRole("button", { name: "Created" })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// TableRow — data contracts and interactions
// ---------------------------------------------------------------------------

describe("TableRow", () => {
  it("sets data-state=selected when selected=true", () => {
    render(
      <table>
        <tbody>
          <TableRow selected data-testid="row">
            <td>cell</td>
          </TableRow>
        </tbody>
      </table>
    )
    expect(screen.getByTestId("row")).toHaveAttribute("data-state", "selected")
  })

  it("omits data-state when not selected", () => {
    render(
      <table>
        <tbody>
          <TableRow data-testid="row">
            <td>cell</td>
          </TableRow>
        </tbody>
      </table>
    )
    expect(screen.getByTestId("row")).not.toHaveAttribute("data-state")
  })

  it("calls onDrill when the row is clicked", async () => {
    const user = userEvent.setup()
    const onDrill = jest.fn()
    render(
      <table>
        <tbody>
          <TableRow onDrill={onDrill} data-testid="row">
            <td>cell</td>
          </TableRow>
        </tbody>
      </table>
    )
    await user.click(screen.getByTestId("row"))
    expect(onDrill).toHaveBeenCalledTimes(1)
  })

  it("exposes data-density reflecting the Table context", () => {
    render(
      <TestTable density="compact">
        <TableRow data-testid="row">
          <TableCell>cell</TableCell>
        </TableRow>
      </TestTable>
    )
    expect(screen.getByTestId("row")).toHaveAttribute("data-density", "compact")
  })

  it("sets data-pinned=true when pinned", () => {
    render(
      <table>
        <tbody>
          <TableRow pinned data-testid="row">
            <td>cell</td>
          </TableRow>
        </tbody>
      </table>
    )
    expect(screen.getByTestId("row")).toHaveAttribute("data-pinned", "true")
  })
})

// ---------------------------------------------------------------------------
// TableSelectionBar — interaction contract
// ---------------------------------------------------------------------------

describe("TableSelectionBar", () => {
  it("shows the selected count", () => {
    render(
      <table>
        <tbody>
          <TableSelectionBar count={3} onClear={jest.fn()} />
        </tbody>
      </table>
    )
    expect(screen.getByText("3 selected")).toBeInTheDocument()
  })

  it("calls onClear when Clear is clicked", async () => {
    const user = userEvent.setup()
    const onClear = jest.fn()
    render(
      <table>
        <tbody>
          <TableSelectionBar count={2} onClear={onClear} />
        </tbody>
      </table>
    )
    await user.click(screen.getByRole("button", { name: "Clear" }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("renders optional actions slot", () => {
    render(
      <table>
        <tbody>
          <TableSelectionBar
            count={1}
            onClear={jest.fn()}
            actions={<button type="button">Delete</button>}
          />
        </tbody>
      </table>
    )
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// TableEmptyRow — content contract
// ---------------------------------------------------------------------------

describe("TableEmptyRow", () => {
  it("renders the CLI command text", () => {
    render(
      <table>
        <tbody>
          <TableEmptyRow cliCommand="listo create sandbox" />
        </tbody>
      </table>
    )
    expect(screen.getByText("listo create sandbox")).toBeInTheDocument()
  })

  it("renders a Docs link when docHref is provided", () => {
    render(
      <table>
        <tbody>
          <TableEmptyRow cliCommand="listo create sandbox" docHref="https://docs.listo.ai" />
        </tbody>
      </table>
    )
    const link = screen.getByRole("link", { name: "Docs" })
    expect(link).toHaveAttribute("href", "https://docs.listo.ai")
  })

  it("omits the Docs link when docHref is not provided", () => {
    render(
      <table>
        <tbody>
          <TableEmptyRow cliCommand="listo create sandbox" />
        </tbody>
      </table>
    )
    expect(screen.queryByRole("link", { name: "Docs" })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// TableErrorBand — content and interaction contract
// ---------------------------------------------------------------------------

describe("TableErrorBand", () => {
  it("renders the error cause text", () => {
    render(
      <table>
        <tbody>
          <TableErrorBand cause="Failed to load sandboxes" />
        </tbody>
      </table>
    )
    expect(screen.getByText("Failed to load sandboxes")).toBeInTheDocument()
  })

  it("calls onRetry when Retry is clicked", async () => {
    const user = userEvent.setup()
    const onRetry = jest.fn()
    render(
      <table>
        <tbody>
          <TableErrorBand cause="Network error" onRetry={onRetry} />
        </tbody>
      </table>
    )
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("omits Retry button when onRetry is not provided", () => {
    render(
      <table>
        <tbody>
          <TableErrorBand cause="Network error" />
        </tbody>
      </table>
    )
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })
})
