import type { Visibility } from "@agents-space/core";

/** Short labels, in the order owners pick them. */
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: "Public",
  listed: "Listed (info only)",
  restricted: "Specific people",
  private: "Private",
};

export const VISIBILITY_HINTS: Record<Visibility, string> = {
  public: "In the directory. Anyone can use it.",
  listed: "In the directory and readable by anyone. Only people you approve can use it.",
  restricted: "Not in the directory. Only people you approve can see or use it.",
  private: "Only you. It does not exist for anyone else.",
};

export const VISIBILITY_ORDER = ["public", "listed", "restricted", "private"] as const satisfies readonly Visibility[];

/** Badge text for a published agent; nothing for the default (public). */
export const VISIBILITY_BADGE: Record<Visibility, string | undefined> = {
  public: undefined,
  listed: "Listed",
  restricted: "Specific people",
  private: "Private",
};
