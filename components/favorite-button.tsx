"use client";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/use-favorites";

export default function FavoriteButton({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(slug);
  return (
    <button
      type="button"
      className={saved ? "favorite-button is-saved" : "favorite-button"}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved tools` : `Save ${name}`}
      title={saved ? "Remove from saved tools" : "Save this tool"}
      onClick={() => toggle(slug)}
    >
      <Heart
        size={17}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
