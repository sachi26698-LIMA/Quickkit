import {
  buildQrPayload,
  defaultQrFormValues,
  defaultQrOptions,
  MAX_BATCH_ITEMS,
  QR_CONTENT_TYPES,
  validateQrOptions,
  type QrContentType,
  type QrFormValues,
  type QrOptions,
} from "./qr";

export type QrCsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

export type QrCsvMapping = {
  typeColumn: string;
  contentColumn: string;
  filenameColumn: string;
};

export type ParsedQrCsvItem = {
  rowNumber: number;
  type: QrContentType;
  filename: string;
  payload: string;
  options: QrOptions;
};

export function parseQrCsv(input: string): QrCsvTable {
  const source = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && !field) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted cell.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error(
      "Choose a CSV with a header row and at least one data row.",
    );
  if (rows.length - 1 > MAX_BATCH_ITEMS)
    throw new Error(`A batch can contain up to ${MAX_BATCH_ITEMS} QR codes.`);

  const sourceHeaders = rows[0].map(
    (header, index) => header.trim() || `Column ${index + 1}`,
  );
  const seen = new Map<string, number>();
  const headers = sourceHeaders.map((header) => {
    const count = (seen.get(header.toLowerCase()) ?? 0) + 1;
    seen.set(header.toLowerCase(), count);
    return count === 1 ? header : `${header} (${count})`;
  });
  return {
    headers,
    rows: rows
      .slice(1)
      .map((cells) =>
        Object.fromEntries(
          headers.map((header, index) => [header, cells[index] ?? ""]),
        ),
      ),
  };
}

function normalizedHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cell(row: Record<string, string>, ...names: string[]): string {
  const entries = Object.entries(row);
  for (const name of names) {
    const target = normalizedHeader(name);
    const entry = entries.find(
      ([header]) => normalizedHeader(header) === target,
    );
    if (entry?.[1]?.trim()) return entry[1].trim();
  }
  return "";
}

function parseContentType(value: string): QrContentType {
  const normalized = normalizedHeader(value);
  const aliases: Record<string, QrContentType> = {
    text: "text",
    plaintext: "text",
    customtext: "text",
    url: "url",
    website: "url",
    link: "url",
    customurl: "url",
    wifi: "wifi",
    wireless: "wifi",
    phone: "phone",
    telephone: "phone",
    sms: "sms",
    email: "email",
    vcard: "vcard",
    contact: "vcard",
    whatsapp: "whatsapp",
    location: "location",
    map: "location",
    event: "event",
    calendar: "event",
    upi: "upi",
    payment: "upi",
    social: "social",
    profile: "social",
    app: "app",
    application: "app",
    business: "business",
    product: "product",
  };
  const type = aliases[normalized];
  if (!type || !QR_CONTENT_TYPES.some((item) => item.value === type))
    throw new Error(`Unsupported QR type “${value}”.`);
  return type;
}

function jsonFormValues(content: string): Partial<QrFormValues> | null {
  if (!content.trim().startsWith("{")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The Content JSON is invalid.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Content JSON must be an object of QR form fields.");
  const safe: Partial<QrFormValues> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in defaultQrFormValues)) continue;
    const defaultValue = defaultQrFormValues[key as keyof QrFormValues];
    if (typeof value === typeof defaultValue)
      (safe as Record<string, unknown>)[key] = value;
  }
  return safe;
}

function csvFormValues(
  type: QrContentType,
  row: Record<string, string>,
  content: string,
): QrFormValues {
  const values: QrFormValues = { ...defaultQrFormValues };
  const pick = (...keys: string[]) => cell(row, ...keys);
  switch (type) {
    case "text":
      values.text = content || pick("text", "value", "content");
      break;
    case "url":
      values.url = content || pick("url", "website", "link", "value");
      break;
    case "wifi": {
      values.wifiSsid =
        pick("wifiSsid", "ssid", "network", "networkName") || content;
      values.wifiPassword = pick("wifiPassword", "password", "passphrase");
      const security = pick("wifiSecurity", "security").toUpperCase();
      values.wifiSecurity =
        security === "OPEN" || security === "NOPASS"
          ? "nopass"
          : security === "WEP"
            ? "WEP"
            : "WPA";
      values.wifiHidden = /^(true|yes|1)$/i.test(pick("wifiHidden", "hidden"));
      break;
    }
    case "phone":
      values.phone = content || pick("phone", "number", "telephone");
      break;
    case "email":
      values.emailAddress = content || pick("emailAddress", "email", "to");
      values.emailSubject = pick("subject", "emailSubject");
      values.emailBody = pick("body", "message", "emailBody");
      break;
    case "sms":
      values.smsNumber = pick("smsNumber", "phone", "number") || content;
      values.smsMessage = pick("smsMessage", "message", "body");
      break;
    case "vcard":
      values.firstName = pick("firstName", "givenName", "given");
      values.lastName = pick("lastName", "familyName", "family");
      values.contactOrganization = pick("organization", "company");
      values.contactTitle = pick("title", "jobTitle");
      values.contactPhone = pick("contactPhone", "phone", "telephone");
      values.contactEmail = pick("contactEmail", "email");
      values.contactWebsite = pick("contactWebsite", "website", "url");
      values.contactStreet = pick("street", "address");
      values.contactCity = pick("city");
      values.contactRegion = pick("region", "state");
      values.contactPostalCode = pick("postalCode", "zip");
      values.contactCountry = pick("country");
      break;
    case "whatsapp":
      values.whatsappNumber =
        pick("whatsappNumber", "phone", "number") || content;
      values.whatsappMessage = pick("whatsappMessage", "message", "body");
      break;
    case "location":
      values.latitude = pick("latitude", "lat");
      values.longitude = pick("longitude", "lng", "lon");
      values.locationLabel = pick("locationLabel", "label", "place");
      values.locationMapUrl =
        pick("locationMapUrl", "mapUrl", "mapsUrl", "link") || content;
      break;
    case "event":
      values.eventTitle = pick("eventTitle", "title", "name") || content;
      values.eventStart = pick("eventStart", "start", "starts");
      values.eventEnd = pick("eventEnd", "end", "ends");
      values.eventTimezone = pick("eventTimezone", "timezone", "timeZone");
      values.eventLocation = pick("eventLocation", "location");
      values.eventDescription = pick("eventDescription", "description");
      break;
    case "upi":
      values.upiId = pick("upiId", "vpa", "payeeVpa") || content;
      values.upiName = pick("upiName", "payee", "payeeName");
      values.upiAmount = pick("upiAmount", "amount");
      values.upiNote = pick("upiNote", "note", "transactionNote");
      break;
    case "social": {
      const platform = normalizedHeader(
        pick("socialPlatform", "platform") || "other",
      );
      values.socialPlatform = (
        platform === "twitter" ? "x" : platform
      ) as QrFormValues["socialPlatform"];
      values.socialUrl =
        pick("socialUrl", "profileUrl", "url", "link") || content;
      break;
    }
    case "app": {
      values.appName = pick("appName", "name");
      const platform = normalizedHeader(
        pick("appPlatform", "platform") || "universal",
      );
      values.appPlatform = (
        platform === "ios" || platform === "android" ? platform : "universal"
      ) as QrFormValues["appPlatform"];
      values.appUrl = pick("appUrl", "downloadUrl", "url", "link") || content;
      break;
    }
    case "business":
      values.businessName =
        pick("businessName", "business", "company", "name") || content;
      values.businessDescription = pick("businessDescription", "description");
      values.businessPhone = pick("businessPhone", "phone", "telephone");
      values.businessEmail = pick("businessEmail", "email");
      values.businessWebsite = pick("businessWebsite", "website", "url");
      values.businessStreet = pick("businessStreet", "street", "address");
      values.businessCity = pick("businessCity", "city");
      values.businessRegion = pick("businessRegion", "region", "state");
      values.businessPostalCode = pick(
        "businessPostalCode",
        "postalCode",
        "zip",
      );
      values.businessCountry = pick("businessCountry", "country");
      break;
    case "product":
      values.productName = pick("productName", "product", "name") || content;
      values.productSku = pick("productSku", "sku", "id");
      values.productPrice = pick("productPrice", "price");
      values.productUrl = pick("productUrl", "url", "link");
      values.productDescription = pick("productDescription", "description");
      break;
  }
  return values;
}

function csvRowOptions(
  row: Record<string, string>,
  baseOptions: QrOptions,
): QrOptions {
  const options = { ...baseOptions };
  const color = (key: string, aliases: string[]) => {
    const value = cell(row, key, ...aliases);
    if (value) (options as unknown as Record<string, unknown>)[key] = value;
  };
  color("foreground", ["codeColor", "foregroundColor"]);
  color("background", ["backgroundColor"]);
  color("gradientEnd", ["gradientEndColor"]);
  color("eyeColor", ["finderColor"]);
  const level = cell(row, "errorLevel", "correction");
  if (level)
    options.errorLevel = level.toUpperCase() as QrOptions["errorLevel"];
  const fill = cell(row, "fillStyle");
  if (fill) options.fillStyle = fill.toLowerCase() as QrOptions["fillStyle"];
  const dots = cell(row, "dotStyle", "dots");
  if (dots) options.dotStyle = dots.toLowerCase() as QrOptions["dotStyle"];
  const corners = cell(row, "cornerStyle", "finderStyle");
  if (corners)
    options.cornerStyle = corners.toLowerCase() as QrOptions["cornerStyle"];
  const margin = cell(row, "margin", "quietZone");
  if (margin) options.margin = Number(margin);
  const size = cell(row, "size", "qrSize");
  if (size) {
    options.size = Number(size);
    options.width = Number(size);
    options.height = Number(size);
  }
  return validateQrOptions(options);
}

export function buildQrCsvItems(
  table: QrCsvTable,
  mapping: QrCsvMapping,
  baseOptions: QrOptions = defaultQrOptions,
): {
  items: ParsedQrCsvItem[];
  errors: { rowNumber: number; message: string }[];
} {
  const items: ParsedQrCsvItem[] = [];
  const errors: { rowNumber: number; message: string }[] = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      const typeValue = mapping.typeColumn
        ? (row[mapping.typeColumn]?.trim() ?? "")
        : "text";
      const type = parseContentType(typeValue || "text");
      const content = mapping.contentColumn
        ? (row[mapping.contentColumn]?.trim() ?? "")
        : "";
      const filename =
        (mapping.filenameColumn
          ? (row[mapping.filenameColumn]?.trim() ?? "")
          : "") ||
        cell(row, "filename", "fileName", "name") ||
        `qr-${String(index + 1).padStart(3, "0")}`;
      const formJson = jsonFormValues(content);
      const values = formJson
        ? { ...csvFormValues(type, row, ""), ...formJson }
        : csvFormValues(type, row, content);
      const payload = buildQrPayload(type, values);
      const options = csvRowOptions(row, baseOptions);
      items.push({ rowNumber, type, filename, payload, options });
    } catch (reason) {
      errors.push({
        rowNumber,
        message:
          reason instanceof Error ? reason.message : "This CSV row is invalid.",
      });
    }
  });
  return { items, errors };
}

export function guessQrCsvMapping(headers: string[]): QrCsvMapping {
  const find = (...aliases: string[]) =>
    headers.find((header) => aliases.includes(normalizedHeader(header))) ?? "";
  return {
    typeColumn: find("type", "qrtype", "contenttype", "kind"),
    contentColumn: find("content", "value", "text", "url", "website", "link"),
    filenameColumn: find("filename", "file", "name"),
  };
}
