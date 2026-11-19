"use client";

import dynamic from "next/dynamic";
import type { LaunchTool } from "@/lib/tools/launch/registry";

/**
 * The single client boundary for every launched tool.
 *
 * Each workspace is a `"use client"` component, so the mapping from a tool's
 * declared `workspace` + `mode` to the component that renders it lives here and
 * nowhere else. The route files are Server Components that look up their
 * declaration and hand it to this component — which means a route file contains
 * metadata, not logic, and cannot drift from the catalogue.
 *
 * The imports are `dynamic` on purpose. A single static map pulled all eleven
 * workspaces into the bundle of every launch page — 1,025 KB of JavaScript to
 * render one form, against 801 KB for a legacy tool that uses none of it. Each
 * page only ever needs one workspace, so each is loaded on its own.
 *
 * Everything here is client-only and renders a form, so the server-rendered
 * markup matters: no loading placeholder is supplied, which means Next.js still
 * renders the workspace on the server and hydrates it, keeping the H1-adjacent
 * content in the HTML.
 */
function workspace<S extends string>(
  loader: () => Promise<{ default: React.ComponentType<{ mode: S }> }>,
) {
  return dynamic(loader, { ssr: true });
}

const WORKSPACES = {
  "salary-workspace": workspace(
    () => import("@/components/tools/launch/salary-workspace"),
  ),
  "attendance-workspace": workspace(
    () => import("@/components/tools/launch/attendance-workspace"),
  ),
  "document-studio": workspace(
    () => import("@/components/tools/launch/document-studio"),
  ),
  "people-text-kit": workspace(
    () => import("@/components/tools/launch/people-text-kit"),
  ),
  "page-analyzer": workspace(
    () => import("@/components/tools/launch/page-analyzer"),
  ),
  "schema-builder": workspace(
    () => import("@/components/tools/launch/schema-builder"),
  ),
  "technical-seo": workspace(
    () => import("@/components/tools/launch/technical-seo"),
  ),
  "content-kit": workspace(
    () => import("@/components/tools/launch/content-kit"),
  ),
  "resume-studio": workspace(
    () => import("@/components/tools/launch/resume-studio"),
  ),
  "career-text-kit": workspace(
    () => import("@/components/tools/launch/career-text-kit"),
  ),
  "job-search-kit": workspace(
    () => import("@/components/tools/launch/job-search-kit"),
  ),
} as const satisfies Record<LaunchTool["workspace"], unknown>;

export default function ToolWorkspace({ tool }: { tool: LaunchTool }) {
  const Workspace = WORKSPACES[tool.workspace] as
    | React.ComponentType<{
        mode: string;
      }>
    | undefined;
  if (!Workspace) return null;
  return <Workspace mode={tool.mode} />;
}
