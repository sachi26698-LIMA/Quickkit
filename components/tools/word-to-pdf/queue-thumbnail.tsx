"use client";
import Image from "next/image";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { renderPdfThumbnail } from "@/lib/tools/pdf/pdf-preview";
import styles from "./word-to-pdf.module.css";
let chain: Promise<unknown> = Promise.resolve();
export default function QueueThumbnail({
  bytes,
  name,
}: {
  bytes?: Uint8Array;
  name: string;
}) {
  const [value, setValue] = useState<{ bytes: Uint8Array; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!bytes) return;
    let disposed = false,
      url = "";
    chain = chain
      .catch(() => undefined)
      .then(async () => {
        if (disposed) return;
        const blob = await renderPdfThumbnail(bytes, undefined);
        if (!disposed) {
          url = URL.createObjectURL(blob);
          setValue({ bytes, url });
        }
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bytes]);
  return (
    <div className={styles.queueThumb}>
      {value?.bytes === bytes && value ? (
        <Image
          unoptimized
          src={value.url}
          width={42}
          height={56}
          alt={`Converted thumbnail for ${name}`}
        />
      ) : (
        <FileText size={23} aria-label="DOCX file icon; no PDF thumbnail yet" />
      )}
    </div>
  );
}
