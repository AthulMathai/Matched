"use client";

import { useMemo, useState } from "react";
import { DEFAULT_TAGS, formatTagLabel, isValidTag, normalizeTag, TAG_SETTINGS } from "@/constants/tags";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type TagSelectorProps = {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
};

export default function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");

  const normalizedSelected = useMemo(
    () => selectedTags.map((tag) => normalizeTag(tag)),
    [selectedTags],
  );

  function addTag(value: string) {
    setError("");

    const tag = normalizeTag(value);

    if (!isValidTag(tag)) {
      setError(`Tag must be ${TAG_SETTINGS.minLength}-${TAG_SETTINGS.maxLength} characters.`);
      return;
    }

    if (normalizedSelected.includes(tag)) {
      setError("This tag is already selected.");
      return;
    }

    if (selectedTags.length >= TAG_SETTINGS.maxTagsPerUser) {
      setError(`You can select up to ${TAG_SETTINGS.maxTagsPerUser} tags.`);
      return;
    }

    onChange([...selectedTags, tag]);
    setCustomTag("");
  }

  function removeTag(value: string) {
    const tag = normalizeTag(value);
    onChange(selectedTags.filter((item) => normalizeTag(item) !== tag));
  }

  function toggleDefaultTag(value: string) {
    const tag = normalizeTag(value);

    if (normalizedSelected.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-bold text-slate-300">
          Choose interests
        </p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TAGS.map((tag) => {
            const normalized = normalizeTag(tag);
            const active = normalizedSelected.includes(normalized);

            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleDefaultTag(tag)}
                className="rounded-full"
              >
                <Badge active={active}>{tag}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            label="Add custom tag"
            value={customTag}
            onChange={(event) => setCustomTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag(customTag);
              }
            }}
            placeholder="Example: hiking, startups, chess"
          />
        </div>

        <div className="sm:pt-7">
          <Button type="button" variant="secondary" onClick={() => addTag(customTag)}>
            Add Tag
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div>
        <p className="mb-2 text-sm font-bold text-slate-300">
          Selected tags ({selectedTags.length}/{TAG_SETTINGS.maxTagsPerUser})
        </p>

        {selectedTags.length === 0 ? (
          <p className="text-sm text-slate-400">
            Select at least one tag to improve matching.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full"
                title="Remove tag"
              >
                <Badge active>{formatTagLabel(tag)} ×</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}