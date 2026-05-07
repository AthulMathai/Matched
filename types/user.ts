export type UserGender =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

export type Profile = {
  id: string;
  display_name: string | null;
  gender: UserGender | null;
  country: string | null;
  language: string | null;
  date_of_birth: string | null;
  age_verified: boolean;
  is_banned: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};