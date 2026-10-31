/** Soft lavender page band used behind long-form content pages. */
export function PageBand({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-full"
      style={{
        background:
          "linear-gradient(180deg, #f8f6ff 0%, #fbfaff 18%, #ffffff 38%)",
      }}
    >
      {children}
    </div>
  );
}

export default PageBand;
