import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("public authentication removal", () => {
  it("redirects legacy visitor account routes and retains only the admin login", () => {
    for (const route of [
      "signup",
      "login",
      "account",
      "forgot-password",
      "reset-password",
    ]) {
      expect(source(`../app/(public)/${route}/page.tsx`)).toMatch(/redirect\(/);
    }
    expect(source("../app/admin/login/page.tsx")).toMatch(/AdminLoginForm/);
  });

  it("keeps favorites in browser storage without visitor-auth or cloud sync coupling", () => {
    const favorites = source("../lib/use-favorites.ts");
    expect(favorites).toMatch(/localStorage/);
    expect(favorites).not.toMatch(/supabase|signIn|signUp/i);
    expect(source("../components/saved-list.tsx")).not.toMatch(
      /account-settings|sign.?in|cloud sync/i,
    );
  });
});
