/**
 * Backyard types — mirror the SQL:
 *   team_profiles (XP/level/streak additions)  (20260602, 20260605)
 *   backyard_perks                              (20260602)
 *   backyard_learning                           (20260602)
 *   backyard_food_orders                        (20260602)
 *   backyard_wellbeing                          (20260602)
 *   backyard_events                             (20260603)
 *   backyard_milestones                         (20260604)
 *
 * Plus the agent-output shapes from:
 *   BACKYARD_EVENT_DECISION_PROMPT
 *   MILESTONE_ORCHESTRATOR_PROMPT
 */

// ─── team_profiles (gamification fields) ───────────────────────────────────

export type TeamProfile = {
  id: string;
  user_id: string;
  org_id: string;
  skills: string[];
  languages: string[];
  performance_score: number;     // 0-1
  availability_status: 'active' | 'away' | 'offline';
  communication_style: 'professional' | 'casual' | 'direct';
  // Gamification (20260602)
  experience_points: number;
  level: number;
  current_streak: number;
  total_points_earned: number;
  // Collaboration (20260605)
  help_given_count: number;
  help_received_count: number;
  collaboration_score: number;   // 0-1
  created_at: string;
};

// ─── backyard_perks ────────────────────────────────────────────────────────

export type PerkType = 'coupon' | 'gift_card' | 'bonus';

export type BackyardPerk = {
  id: string;
  org_id: string;
  user_id: string;
  type: PerkType;
  title: string;
  code: string | null;
  is_redeemed: boolean;
  value_aed: number;
  reason: string | null;
  created_at: string;
};

// ─── backyard_learning ─────────────────────────────────────────────────────

export type LearningStatus = 'assigned' | 'in_progress' | 'completed';

export type BackyardLearning = {
  id: string;
  org_id: string;
  user_id: string;
  module_name: string;
  status: LearningStatus;
  is_required: boolean;
  xp_reward: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

// ─── backyard_food_orders ──────────────────────────────────────────────────

export type FoodOrderStatus = 'pending' | 'ordered' | 'arrived';

export type BackyardFoodOrder = {
  id: string;
  org_id: string;
  user_id: string;
  order_details: string;
  status: FoodOrderStatus;
  created_at: string;
};

// ─── backyard_wellbeing ────────────────────────────────────────────────────

export type BackyardWellbeing = {
  id: string;
  user_id: string;
  date: string;
  overtime_minutes: number;
  mood_check: 1 | 2 | 3 | 4 | 5 | null;
  created_at: string;
};

// ─── backyard_events ───────────────────────────────────────────────────────

export type BackyardEventType =
  | 'marriage'
  | 'birthday'
  | 'birth'
  | 'graduation'
  | 'work_anniversary'
  | 'engagement'
  | 'promotion'
  | 'life_milestone'
  | 'other';

export type BackyardEventStatus = 'pending' | 'public' | 'private';

export type BackyardEvent = {
  id: string;
  org_id: string;
  user_id: string;
  event_type: BackyardEventType;
  event_date: string;
  description: string | null;
  status: BackyardEventStatus;
  ai_reasoning: string | null;
  created_at: string;
};

// ─── backyard_milestones ───────────────────────────────────────────────────

export type MilestoneStatus = 'active' | 'achieved' | 'expired';

export type BackyardMilestone = {
  id: string;
  org_id: string;
  creator_id: string | null;     // Omnia AI or operator
  owner_id: string | null;       // individual target
  target_role_id: string | null; // team target
  title: string;
  description: string | null;
  reward_aed: number;
  is_private: boolean;
  status: MilestoneStatus;
  // Computed fields (joined from related tables)
  target_value?: number;
  current_value?: number;
  progress_pct?: number;
  created_at: string;
};

// ─── BACKYARD_EVENT_DECISION_PROMPT output ─────────────────────────────────

export type EventDecisionResult = {
  should_be_public: boolean;
  ai_reasoning: string;
  celebratory_message: string | null;
};

// ─── MILESTONE_ORCHESTRATOR_PROMPT output ──────────────────────────────────

export type MilestoneOrchestratorResult = {
  milestone_updates: {
    id: string;
    progress_pct: number;
    is_achieved: boolean;
  }[];
  orch_commentary: string;
};
