import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type LoyaltyProgramType = "milhas" | "pontos";
export type TravelLoyaltyProgramRow = {
  id: string;
  user_id: string;
  program_name: string;
  program_type: LoyaltyProgramType;
  balance: number;
  expiration_date: string | null;
  value_per_point: number;
  notes: string;
  created_at: string;
  updated_at: string;
};
export type TravelLoyaltyProgramInsert = {
  id?: string;
  user_id: string;
  program_name: string;
  program_type: LoyaltyProgramType;
  balance: number;
  expiration_date: string | null;
  value_per_point: number;
  notes: string;
};

type TravelLoyaltyDatabase = {
  public: {
    Tables: {
      travel_loyalty_programs: {
        Row: TravelLoyaltyProgramRow;
        Insert: TravelLoyaltyProgramInsert;
        Update: Partial<TravelLoyaltyProgramInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Keep the generated app-wide database file untouched; this feature-local
// contract can be replaced by generated Supabase types when they are refreshed.
const loyaltyClient = supabase as unknown as SupabaseClient<TravelLoyaltyDatabase>;

export function listTravelLoyaltyPrograms(userId: string) {
  return loyaltyClient.from("travel_loyalty_programs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
}

// Upsert by client-generated UUID makes retrying a partially completed local
// migration safe; it will update the same record rather than duplicate it.
export function insertTravelLoyaltyProgram(row: TravelLoyaltyProgramInsert) {
  return loyaltyClient.from("travel_loyalty_programs").upsert(row, { onConflict: "id" }).select("*").single();
}

export function deleteTravelLoyaltyProgram(id: string, userId: string) {
  return loyaltyClient.from("travel_loyalty_programs").delete().eq("id", id).eq("user_id", userId);
}
