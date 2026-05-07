export type PreferredGender = "male" | "female" | "any";

export type UserPreferences = {
  user_id: string;
  preferred_gender: PreferredGender;
  preferred_country: string | null;
  preferred_language: string | null;
  allow_global: boolean;
  updated_at: string;
};

export type UserTag = {
  user_id: string;
  tag_id: number;
};

export type Tag = {
  id: number;
  name: string;
};