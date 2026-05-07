export const DEFAULT_TAGS = [
  "Gaming",
  "Music",
  "Movies",
  "Travel",
  "Fitness",
  "Food",
  "Sports",
  "Anime",
  "Books",
  "Coding",
  "Business",
  "Study",
  "Career",
  "Technology",
  "Photography",
  "Art",
  "Fashion",
  "Cars",
  "Language Exchange",
  "Friendship",
  "Dating",
  "Comedy",
  "News",
  "Finance",
  "Entrepreneurship",
  "Startups",
  "AI",
  "Culture",
  "Cooking",
  "Education",
];

export const TAG_SETTINGS = {
  minLength: 2,
  maxLength: 24,
  maxTagsPerUser: 10,
};

export function normalizeTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/\s+/g, " ");
}

export function formatTagLabel(value: string) {
  return normalizeTag(value)
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isValidTag(value: string) {
  const tag = normalizeTag(value);

  if (tag.length < TAG_SETTINGS.minLength) return false;
  if (tag.length > TAG_SETTINGS.maxLength) return false;

  return /^[a-z0-9][a-z0-9 +\-_.&]*$/i.test(tag);
}