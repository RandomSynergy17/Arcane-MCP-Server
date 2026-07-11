/**
 * Resolve image references (name:tag) to image IDs.
 *
 * The Arcane v2 API only accepts image IDs in path parameters — a name like
 * "amir20/dozzle:latest" 404s (the slash breaks the route). Clients often
 * pass names anyway, so tools resolve them via the image list first.
 */

import type { ArcaneClient } from "../client/arcane-client.js";

const IMAGE_ID_PATTERN = /^(sha256:)?[0-9a-fA-F]{12,64}$/;

interface ImageListEntry {
  id: string;
  repoTags?: string[] | null;
}

/**
 * Return the image ID for an ID or name reference.
 * IDs pass through untouched; names are looked up in the environment's
 * image list ("name" without a tag matches "name:latest" first, then any tag).
 */
export async function resolveImageId(
  client: ArcaneClient,
  environmentId: string,
  imageIdOrName: string
): Promise<string> {
  if (IMAGE_ID_PATTERN.test(imageIdOrName)) {
    return imageIdOrName;
  }

  const searchTerm = imageIdOrName.split(":")[0];
  const response = await client.get<{ data: ImageListEntry[] }>(
    `/environments/${environmentId}/images`,
    { search: searchTerm, limit: 100 }
  );

  const images = response.data || [];
  const hasTag = imageIdOrName.includes(":");
  const exactRef = hasTag ? imageIdOrName : `${imageIdOrName}:latest`;

  const match =
    images.find((img) => img.repoTags?.includes(exactRef)) ??
    (hasTag ? undefined : images.find((img) => img.repoTags?.some((t) => t.startsWith(`${imageIdOrName}:`))));

  if (!match) {
    throw new Error(
      `No image found matching "${imageIdOrName}". Use arcane_image_list to look up the image ID.`
    );
  }

  return match.id;
}
