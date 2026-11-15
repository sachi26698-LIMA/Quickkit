import { Suspense } from "react";
import QrDataTemplateViewer from "@/components/qr-data-template/viewer";
import { pageMetadata } from "@/lib/seo";

// Dynamic user-encoded QR data card: excluded from search indexing, robots and
// AdSense (never place ads beside payment, contact or Wi-Fi action buttons).
export const metadata = {
  ...pageMetadata(
    "QR Data Card — view scanned QR details",
    "View structured contact, payment, Wi-Fi, event, note and link details encoded inside a QR code, with one-tap actions right in your browser.",
    "/qr",
  ),
  robots: { index: false, follow: false },
};

export default function QrDataPage() {
  return (
    <div className="home inner-page">
      <div className="container">
        <Suspense
          fallback={
            <div className="qr-dt-page">
              <div className="qr-dt-shell">
                <section className="qr-dt-empty-card" aria-busy="true">
                  <h1 className="sr-only">QR Data Card</h1>
                  <p>Loading QR Data Card…</p>
                </section>
              </div>
            </div>
          }
        >
          <QrDataTemplateViewer />
        </Suspense>
      </div>
    </div>
  );
}
