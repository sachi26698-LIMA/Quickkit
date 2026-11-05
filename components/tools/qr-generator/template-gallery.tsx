"use client";
/**
 * TEMPLATE GALLERY (V3) — browse 55 built-in designs across eleven categories
 * plus your own saved templates. Search, filter, preview the real rendered
 * code, apply with one click, then keep customizing. Save the current design as
 * a template, duplicate any template to edit it, or reset to the house look.
 * Every preview is a genuine render, never a decorative swatch.
 */
import { useMemo, useState } from "react";
import {
  Bookmark,
  Briefcase,
  Calendar,
  Copy,
  GraduationCap,
  Home,
  LayoutGrid,
  Megaphone,
  Package,
  Plane,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShoppingBag,
  Star,
  Trash,
  User,
  Utensils,
} from "lucide-react";
import {
  TEMPLATE_CATEGORIES,
  categoryLabel,
  searchTemplates,
  type QrTemplate,
  type QrTemplateCategory,
} from "@/lib/tools/qr/templates";
import { QrThumb } from "./thumb";
import type { QrStudio } from "./use-qr-studio";

const CATEGORY_ICONS: Record<string, typeof Star> = {
  briefcase: Briefcase,
  utensils: Utensils,
  share: Share2,
  calendar: Calendar,
  megaphone: Megaphone,
  package: Package,
  user: User,
  "graduation-cap": GraduationCap,
  "shopping-bag": ShoppingBag,
  plane: Plane,
  home: Home,
};

type Filter = QrTemplateCategory | "all" | "custom";

export default function TemplateGallery({ studio }: { studio: QrStudio }) {
  const {
    allTemplates,
    customTemplates,
    templateId,
    applyTemplate,
    duplicateTemplate,
    deleteCustomTemplate,
    saveCustomTemplate,
    resetDesign,
  } = studio;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] =
    useState<QrTemplateCategory>("business");

  const visible = useMemo(
    () => searchTemplates(allTemplates, query, filter),
    [allTemplates, query, filter],
  );

  const chips: { id: Filter; label: string; icon?: typeof Star }[] = [
    { id: "all", label: "All", icon: LayoutGrid },
    ...TEMPLATE_CATEGORIES.map((category) => ({
      id: category.id as Filter,
      label: category.label,
      icon: CATEGORY_ICONS[category.icon],
    })),
    {
      id: "custom",
      label: `My templates (${customTemplates.length})`,
      icon: Bookmark,
    },
  ];

  return (
    <div className="qr-gallery">
      <div className="qr-gallery-tools">
        <div className="qr-gallery-search">
          <Search size={15} aria-hidden="true" />
          <label className="sr-only" htmlFor="qr-template-search">
            Search templates
          </label>
          <input
            id="qr-template-search"
            type="search"
            className="qr-input"
            placeholder="Search templates… (menu, wedding, plum…)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="secondary qr-mini-button"
          onClick={resetDesign}
          title="Reset the design to the QUICKKIT house look"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div
        className="qr-gallery-chips"
        role="group"
        aria-label="Filter templates by category"
      >
        {chips.map((chip) => {
          const Icon = chip.icon;
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              className={active ? "qr-chip active" : "qr-chip"}
              aria-pressed={active}
              onClick={() => setFilter(chip.id)}
            >
              {Icon ? <Icon size={12} aria-hidden="true" /> : null}
              {chip.label}
            </button>
          );
        })}
      </div>

      <p className="qr-gallery-count" role="status">
        {visible.length} template{visible.length === 1 ? "" : "s"}
        {filter !== "all" && filter !== "custom"
          ? ` in ${categoryLabel(filter)}`
          : filter === "custom"
            ? " saved in this browser"
            : ""}
        {query ? ` matching “${query}”` : ""}
      </p>

      {visible.length ? (
        <ul className="qr-gallery-grid">
          {visible.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              active={templateId === template.id}
              onApply={() => applyTemplate(template.id)}
              onDuplicate={() => duplicateTemplate(template)}
              onDelete={
                template.custom
                  ? () => deleteCustomTemplate(template.id)
                  : undefined
              }
            />
          ))}
        </ul>
      ) : (
        <div className="qr-tab-empty">
          <Search size={22} aria-hidden="true" />
          <strong>No templates match</strong>
          <p>
            {filter === "custom"
              ? "Save the design you have now as a template and it will appear here — on this device only."
              : "Try a different search term or category."}
          </p>
        </div>
      )}

      <div className="qr-gallery-save">
        <span className="qr-block-label">
          Save the current design as a template
        </span>
        <div className="qr-gallery-save-row">
          <label className="sr-only" htmlFor="qr-template-save-name">
            Template name
          </label>
          <input
            id="qr-template-save-name"
            type="text"
            className="qr-input"
            placeholder="Café menu plum, Conference badge…"
            maxLength={40}
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
          />
          <label className="sr-only" htmlFor="qr-template-save-category">
            Template category
          </label>
          <select
            id="qr-template-save-category"
            className="qr-input qr-gallery-select"
            value={saveCategory}
            onChange={(event) =>
              setSaveCategory(event.target.value as QrTemplateCategory)
            }
          >
            {TEMPLATE_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="primary qr-mini-button"
            onClick={() => {
              saveCustomTemplate(saveName || "My template", saveCategory);
              setSaveName("");
              setFilter("custom");
            }}
          >
            <Save size={14} /> Save
          </button>
        </div>
        <p className="help">
          <Bookmark size={13} aria-hidden="true" /> Saved templates keep
          colours, shapes, margins and error correction — never a logo image or
          your content. They live in this browser only.
        </p>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  active,
  onApply,
  onDuplicate,
  onDelete,
}: {
  template: QrTemplate;
  active: boolean;
  onApply: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className={active ? "qr-gallery-card active" : "qr-gallery-card"}>
      <div className="qr-gallery-preview">
        <QrThumb
          design={template.design}
          size={96}
          label={`Preview of the ${template.name} template`}
        />
        {template.custom ? <span className="qr-gallery-tag">Mine</span> : null}
      </div>
      <div className="qr-gallery-meta">
        <strong>{template.name}</strong>
        <small>{template.blurb}</small>
        <span className="qr-gallery-cat">
          {categoryLabel(template.category)}
          {template.printMm ? ` · ${template.printMm} mm` : ""}
        </span>
      </div>
      <div className="qr-gallery-actions">
        <button
          type="button"
          className={
            active ? "primary qr-mini-button" : "secondary qr-mini-button"
          }
          onClick={onApply}
          aria-pressed={active}
          aria-label={`Apply the ${template.name} template`}
        >
          <Star size={13} /> {active ? "Applied" : "Apply"}
        </button>
        <button
          type="button"
          className="qr-icon-button"
          onClick={onDuplicate}
          aria-label="Duplicate this template to edit it"
          title="Duplicate to edit"
        >
          <Copy size={14} />
        </button>
        {onDelete ? (
          <button
            type="button"
            className="qr-icon-button"
            onClick={onDelete}
            aria-label="Delete this saved template"
            title="Delete"
          >
            <Trash size={14} />
          </button>
        ) : null}
      </div>
    </li>
  );
}
