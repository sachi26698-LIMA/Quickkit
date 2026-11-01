import { describe, expect, it } from "vitest";
import {
  buildQrCsvItems,
  guessQrCsvMapping,
  parseQrCsv,
} from "../lib/tools/qr-batch";
import { defaultQrOptions } from "../lib/tools/qr";

describe("QR CSV import and row validation", () => {
  it("parses BOMs, quoted commas, escaped quotes, and multiline cells", () => {
    const table = parseQrCsv(
      '\uFEFFType,Content,Filename,Notes\r\ntext,"Hello, ""Quickkit""","hello","first line\nsecond line"\r\n',
    );
    expect(table.headers).toEqual(["Type", "Content", "Filename", "Notes"]);
    expect(table.rows).toEqual([
      {
        Type: "text",
        Content: 'Hello, "Quickkit"',
        Filename: "hello",
        Notes: "first line\nsecond line",
      },
    ]);
  });

  it("guesses mapped columns and builds typed Wi-Fi, social and UPI rows", () => {
    const table = parseQrCsv(
      [
        "QR Type,Content,File Name,SSID,Password,Security,Platform,Social URL,UPI ID,Amount",
        "wifi,,guest-wifi,Studio Guest,guestpass123,WPA,,,,",
        "social,https://instagram.com/quickkit,instagram,,,,instagram,https://instagram.com/quickkit,,",
        "upi,,payment-stand,,,,,,quickkit@bank,249.50",
      ].join("\n"),
    );
    const mapping = guessQrCsvMapping(table.headers);
    expect(mapping).toEqual({
      typeColumn: "QR Type",
      contentColumn: "Content",
      filenameColumn: "File Name",
    });
    const result = buildQrCsvItems(table, mapping);
    expect(result.errors).toEqual([]);
    expect(result.items.map((item) => item.rowNumber)).toEqual([2, 3, 4]);
    expect(result.items[0]).toMatchObject({
      type: "wifi",
      filename: "guest-wifi",
      payload: "WIFI:T:WPA;S:Studio Guest;P:guestpass123;;",
    });
    expect(result.items[1]).toMatchObject({
      type: "social",
      payload: "https://instagram.com/quickkit",
    });
    expect(result.items[2]).toMatchObject({
      type: "upi",
      payload: "upi://pay?pa=quickkit%40bank&cu=INR&am=249.50",
    });
  });

  it("supports form-value JSON, row-level design options and duplicate payload detection inputs", () => {
    const table = parseQrCsv(
      [
        "type,content,filename,foreground,background,errorLevel,dotStyle,size",
        'text,"{""text"":""same payload""}",first,#171b2e,#ffffff,H,diamond,512',
        'text,"{""text"":""same payload""}",second,#174b3a,#f0faf4,Q,rounded,256',
      ].join("\n"),
    );
    const result = buildQrCsvItems(table, guessQrCsvMapping(table.headers));
    expect(result.errors).toEqual([]);
    expect(result.items.map((item) => item.payload)).toEqual([
      "same payload",
      "same payload",
    ]);
    expect(result.items[0].options).toMatchObject({
      errorLevel: "H",
      dotStyle: "diamond",
      size: 512,
      width: 512,
      height: 512,
    });
    expect(result.items[1].options).toMatchObject({
      foreground: "#174b3a",
      background: "#f0faf4",
      errorLevel: "Q",
      dotStyle: "rounded",
      width: 256,
      height: 256,
    });
  });

  it("keeps invalid input rows in the report with original spreadsheet row numbers", () => {
    const table = parseQrCsv(
      [
        "type,content,filename",
        "url,javascript://example.com,bad-link",
        "upi,not-a-vpa,bad-upi",
        "text,valid payload,valid",
      ].join("\n"),
    );
    const result = buildQrCsvItems(table, guessQrCsvMapping(table.headers));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].rowNumber).toBe(4);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map((item) => item.rowNumber)).toEqual([2, 3]);
    expect(result.errors[0].message).toMatch(/http or https/);
    expect(result.errors[1].message).toMatch(/UPI ID/);
  });

  it("rejects malformed, empty, and oversized CSV files", () => {
    expect(() => parseQrCsv('type,content\ntext,"unfinished')).toThrow(
      "unclosed quoted cell",
    );
    expect(() => parseQrCsv("type,content\n\n")).toThrow("header row");
    const rows = Array.from(
      { length: 51 },
      (_, index) => `text,item-${index}`,
    ).join("\n");
    expect(() => parseQrCsv(`type,content\n${rows}`)).toThrow("up to 50");
  });

  it("validates row customizations against the shared base design", () => {
    const table = parseQrCsv("type,content,foreground\ntext,ok,not-a-color");
    const result = buildQrCsvItems(
      table,
      guessQrCsvMapping(table.headers),
      defaultQrOptions,
    );
    expect(result.items).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/valid QR colors/);
  });
});
