"use client";

import SalaryWorkspace from "@/components/tools/launch/salary-workspace";
import AttendanceWorkspace from "@/components/tools/launch/attendance-workspace";
import DocumentStudio from "@/components/tools/launch/document-studio";
import PeopleTextKit from "@/components/tools/launch/people-text-kit";
import PageAnalyzer from "@/components/tools/launch/page-analyzer";
import SchemaBuilder from "@/components/tools/launch/schema-builder";
import TechnicalSeo from "@/components/tools/launch/technical-seo";
import ContentKit from "@/components/tools/launch/content-kit";
import ResumeStudio from "@/components/tools/launch/resume-studio";
import CareerTextKit from "@/components/tools/launch/career-text-kit";
import JobSearchKit from "@/components/tools/launch/job-search-kit";
import type { LaunchTool } from "@/lib/tools/launch/registry";

/**
 * The single client boundary for every launched tool.
 *
 * Each workspace is a `"use client"` component, so the mapping from a tool's
 * declared `workspace` + `mode` to the component that renders it lives here and
 * nowhere else. The route files below are Server Components that look up their
 * declaration and hand it to this component — which means a route file contains
 * metadata, not logic, and cannot drift from the catalogue.
 */
export default function ToolWorkspace({ tool }: { tool: LaunchTool }) {
  switch (tool.workspace) {
    case "salary-workspace":
      return <SalaryWorkspace mode={tool.mode as "ctc-to-net"} />;
    case "attendance-workspace":
      return <AttendanceWorkspace mode={tool.mode as "attendance"} />;
    case "document-studio":
      return <DocumentStudio mode={tool.mode as "payslip"} />;
    case "people-text-kit":
      return <PeopleTextKit mode={tool.mode as "job-description"} />;
    case "page-analyzer":
      return <PageAnalyzer mode={tool.mode as "serp-preview"} />;
    case "schema-builder":
      return <SchemaBuilder mode={tool.mode as "organization-schema"} />;
    case "technical-seo":
      return <TechnicalSeo mode={tool.mode as "robots-txt-generator"} />;
    case "content-kit":
      return <ContentKit mode={tool.mode as "title-generator"} />;
    case "resume-studio":
      return <ResumeStudio mode={tool.mode as "resume-ats-checker"} />;
    case "career-text-kit":
      return <CareerTextKit mode={tool.mode as "cover-letter-generator"} />;
    case "job-search-kit":
      return <JobSearchKit mode={tool.mode as "salary-converter"} />;
    default:
      return null;
  }
}
