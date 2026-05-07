import type { Tag } from "@/types/preferences";
import { normalizeTag } from "@/constants/tags";
import { createClient } from "./supabase/server";

export async function getUserTags(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_tags")
    .select("tags(id, name)")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data
    .map((row) => row.tags)
    .filter(Boolean)
    .flat() as Tag[];
}

export async function replaceUserTags(userId: string, tagNames: string[]) {
  const supabase = await createClient();

  const cleanTags = Array.from(
    new Set(tagNames.map((tag) => normalizeTag(tag)).filter(Boolean)),
  );

  const { error: deleteError } = await supabase
    .from("user_tags")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (cleanTags.length === 0) {
    return [];
  }

  const insertedTags: Tag[] = [];

  for (const tagName of cleanTags) {
    const { data: existingTag } = await supabase
      .from("tags")
      .select("*")
      .eq("name", tagName)
      .maybeSingle<Tag>();

    let tag = existingTag;

    if (!tag) {
      const { data: newTag, error: tagError } = await supabase
        .from("tags")
        .insert({
          name: tagName,
        })
        .select("*")
        .single<Tag>();

      if (tagError) {
        throw new Error(tagError.message);
      }

      tag = newTag;
    }

    insertedTags.push(tag);

    const { error: userTagError } = await supabase.from("user_tags").insert({
      user_id: userId,
      tag_id: tag.id,
    });

    if (userTagError) {
      throw new Error(userTagError.message);
    }
  }

  return insertedTags;
}