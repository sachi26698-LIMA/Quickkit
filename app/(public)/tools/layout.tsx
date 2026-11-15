import ToolDownloadFeedback from "@/components/tool-download-feedback";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ToolDownloadFeedback />
    </>
  );
}
