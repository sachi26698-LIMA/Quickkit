import "server-only";
import { cache } from "react";
import { getPublicCatalog } from "@/lib/supabase/public-catalog";
import { toClientTools } from "@/lib/client-tool";

/**
 * One browser-bound catalogue projection per request.
 *
 * The public layout (command palette) and the homepage (hero search, recent
 * row) each need the display subset of the catalogue. Called through React's
 * `cache`, both read the *same* array instance in a single render pass, so
 * the React Server Components encoder writes it into the payload once and
 * references it the second time — instead of shipping ~24 kB of duplicate
 * tool records to every visitor.
 */
export const getClientCatalog = cache(async function getClientCatalog() {
  const { tools } = await getPublicCatalog();
  return toClientTools(tools);
});
