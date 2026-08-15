// ── Utilities ──────────────────────────────────────────────────────────────
export { cn } from "./lib/cn";
export { cva, type VariantProps } from "./lib/variants";
export { useCopyToClipboard } from "./lib/use-copy-to-clipboard";
export { useScrolled } from "./lib/use-scrolled";
export { formFieldBoxVariants, type FormFieldBoxVariants } from "./lib/form-field-box";
export {
  overlayPanelSurface,
  overlayPanelHeaderBase,
  overlayPanelHeaderScrolled,
  overlayPanelBody,
  overlayPanelFooterBase,
  overlayPanelFooterScrolled,
  overlayPanelTitle,
  overlayPanelDescription,
} from "./lib/overlay-panel";

// ── Components ────────────────────────────────────────────────────────────

// Wave 1 — leaf primitives
export * from "./components/avatar";
export * from "./components/badge";
export * from "./components/brand-mark";
export * from "./components/breadcrumb";
export * from "./components/button";
export * from "./components/icon-button";
export * from "./components/popover";
export * from "./components/progress";
export * from "./components/scroll-area";
export * from "./components/separator";
export * from "./components/skeleton";

// Wave 2 — mid-tier primitives
export * from "./components/accordion";
export * from "./components/collapsible";
export * from "./components/slider";
export * from "./components/alert";
export * from "./components/avatar-group";
export * from "./components/card";
export * from "./components/checkbox";
export * from "./components/code-block";
export * from "./components/switch";
export * from "./components/tooltip";

// Wave 2.5 — state feedback primitives
export * from "./components/empty-state";
export * from "./components/error-state";
export * from "./components/resource-not-found";
export * from "./components/status-block";

// Wave 3 — composites
export * from "./components/command";
export * from "./components/combobox";
export * from "./components/alert-dialog";
export * from "./components/dialog";
export * from "./components/drawer";
export * from "./components/dropdown-menu";
export * from "./components/form-field";
export * from "./components/input";
export * from "./components/search-input";
export * from "./components/label";
export * from "./components/multi-select";
export * from "./components/select";
export * from "./components/toast";
export * from "./components/table";
export * from "./components/segmented-control";
export * from "./components/tabs";
export * from "./components/textarea";
export * from "./components/star-count";
export * from "./components/copy-button";
export * from "./components/chip";
export * from "./components/visibility-icon";
export * from "./components/calendar";
export * from "./components/date-range-selector";
export * from "./components/date-time-range-selector";
