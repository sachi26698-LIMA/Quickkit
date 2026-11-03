import { describe, expect, it } from "vitest";
import { crc32, createZip, type ZipEntry } from "../lib/tools/zip";

const decoder = new TextDecoder();

function readZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  const centralSize = view.getUint32(end + 12, true);
  const centralOffset = view.getUint32(end + 16, true);
  expect(centralOffset + centralSize).toBe(end);

  const entries: {
    name: string;
    crc: number;
    size: number;
    data: Uint8Array;
    time: number;
    date: number;
  }[] = [];
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
    const flags = view.getUint16(offset + 8, true);
    expect(flags & 0x0800).toBe(0x0800);
    expect(view.getUint16(offset + 10, true)).toBe(0);
    const time = view.getUint16(offset + 12, true);
    const date = view.getUint16(offset + 14, true);
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localName + localExtra;
    entries.push({
      name,
      crc,
      size,
      data: bytes.slice(start, start + size),
      time,
      date,
    });
    offset += 46 + nameLength;
  }
  return entries;
}

const sample = (label: string, length = 8) =>
  new TextEncoder().encode(
    label.repeat(Math.ceil(length / label.length)).slice(0, length),
  );

describe("CRC-32", () => {
  it("matches the standard check vector", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
    expect(crc32(new TextEncoder().encode("The quick brown fox"))).toBe(
      0xb74574de,
    );
  });
});

describe("ZIP writer", () => {
  it("refuses an empty archive", () =>
    expect(() => createZip([])).toThrow("no files"));

  it("creates stored entries with names, CRCs and payloads", () => {
    const entries: ZipEntry[] = [
      { name: "photo-320x240.png", data: sample("png!") },
      { name: "café-1080x1080.webp", data: sample("webp") },
    ];
    const parsed = readZip(createZip(entries));
    expect(parsed.map((entry) => entry.name)).toEqual([
      "photo-320x240.png",
      "café-1080x1080.webp",
    ]);
    expect(parsed[0].data).toEqual(entries[0].data);
    expect(parsed[1].data).toEqual(entries[1].data);
    expect(parsed[0].crc).toBe(crc32(entries[0].data));
    expect(parsed[1].crc).toBe(crc32(entries[1].data));
    expect(parsed[0].size).toBe(entries[0].data.length);
  });

  it("writes a DOS timestamp", () => {
    const parsed = readZip(
      createZip(
        [{ name: "a.png", data: new Uint8Array([1, 2, 3]) }],
        new Date(2026, 10, 1, 14, 30, 40),
      ),
    );
    const entry = parsed[0];
    expect(entry.date >> 9).toBe(2026 - 1980);
    expect((entry.date >> 5) & 0x0f).toBe(11);
    expect(entry.date & 0x1f).toBe(1);
    expect(entry.time >> 11).toBe(14);
    expect((entry.time >> 5) & 0x3f).toBe(30);
    expect((entry.time & 0x1f) * 2).toBe(40);
  });

  it("handles binary payloads and many entries", () => {
    const bytes = new Uint8Array(1024);
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = index % 256;
    const many = Array.from({ length: 50 }, (_, index) => ({
      name: `image-${index}.bin`,
      data: bytes.slice(0, 64 + index),
    }));
    const parsed = readZip(createZip(many));
    expect(parsed).toHaveLength(50);
    expect(parsed[49].data).toEqual(many[49].data);
    expect(parsed[49].crc).toBe(crc32(many[49].data));
  });

  it("rejects blank and oversized entry names", () => {
    expect(() => createZip([{ name: "  ", data: new Uint8Array() }])).toThrow(
      "needs a name",
    );
    expect(() =>
      createZip([{ name: "x".repeat(70_000), data: new Uint8Array() }]),
    ).toThrow("too long");
  });

  it("produces a deterministic archive for the same date and data", () => {
    const date = new Date(2026, 0, 2, 3, 4, 6);
    const one = createZip([{ name: "a.png", data: sample("a") }], date);
    const two = createZip([{ name: "a.png", data: sample("a") }], date);
    expect(Array.from(one)).toEqual(Array.from(two));
  });
});
