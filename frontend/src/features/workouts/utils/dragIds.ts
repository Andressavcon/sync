import type { SourceType } from "@/data/repositories/workoutsRepository";

/** Droppable id of today's workout card */
export const TODAY_DROP_ID = "today";

/** Drag id of a library item: "lib|<sourceType>|<id>" */
export const libraryDragId = (sourceType: SourceType, id: string) => `lib|${sourceType}|${id}`;

export function readLibraryDragId(id: string): { sourceType: SourceType; sourceId: string } | null {
  const [prefix, sourceType, sourceId] = id.split("|");
  if (prefix !== "lib" || !sourceId) return null;
  return { sourceType: sourceType as SourceType, sourceId };
}
