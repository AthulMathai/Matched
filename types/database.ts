import type { Profile } from "./user";
import type { UserPreferences, Tag, UserTag } from "./preferences";
import type { ChatSession, MatchQueueItem } from "./session";
import type { ChatHistoryItem } from "./history";
import type { Ping, Message } from "./message";
import type { Report, BlockedUser, AdImpression } from "./moderation";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & {
          id: string;
        };
        Update: Partial<Profile>;
      };

      user_preferences: {
        Row: UserPreferences;
        Insert: Partial<UserPreferences> & {
          user_id: string;
        };
        Update: Partial<UserPreferences>;
      };

      tags: {
        Row: Tag;
        Insert: {
          name: string;
        };
        Update: Partial<Tag>;
      };

      user_tags: {
        Row: UserTag;
        Insert: UserTag;
        Update: Partial<UserTag>;
      };

      match_queue: {
        Row: MatchQueueItem;
        Insert: Partial<MatchQueueItem> & {
          user_id: string;
        };
        Update: Partial<MatchQueueItem>;
      };

      chat_sessions: {
        Row: ChatSession;
        Insert: Partial<ChatSession> & {
          user_1_id: string;
          user_2_id: string;
        };
        Update: Partial<ChatSession>;
      };

      chat_history: {
        Row: ChatHistoryItem;
        Insert: Partial<ChatHistoryItem> & {
          user_id: string;
          other_user_id: string;
          session_id: string;
          duration_seconds: number;
        };
        Update: Partial<ChatHistoryItem>;
      };

      pings: {
        Row: Ping;
        Insert: Partial<Ping> & {
          sender_id: string;
          receiver_id: string;
        };
        Update: Partial<Ping>;
      };

      messages: {
        Row: Message;
        Insert: Partial<Message> & {
          ping_id: string;
          sender_id: string;
          receiver_id: string;
          body: string;
        };
        Update: Partial<Message>;
      };

      reports: {
        Row: Report;
        Insert: Partial<Report> & {
          reporter_id: string;
          reported_user_id: string;
          reason: string;
        };
        Update: Partial<Report>;
      };

      blocked_users: {
        Row: BlockedUser;
        Insert: Partial<BlockedUser> & {
          blocker_id: string;
          blocked_user_id: string;
        };
        Update: Partial<BlockedUser>;
      };

      ad_impressions: {
        Row: AdImpression;
        Insert: Partial<AdImpression> & {
          user_id: string;
          placement: string;
        };
        Update: Partial<AdImpression>;
      };
    };
  };
};