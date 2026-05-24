/**
 * Central type registry — re-exports every domain type module so any
 * component or route can import from `@/lib/types` instead of hunting
 * for the right per-room path.
 *
 * Each domain type module lives next to its room (or under lib/types
 * for cross-cutting primitives like RBAC). The shapes mirror the SQL
 * migrations in db/migrations/ — when a migration changes, only the
 * matching type file changes.
 *
 * Naming rule: every table maps to a type with the same camelCase or
 * SingularCase. Joins / agent outputs get a `Result` suffix.
 */

// ─── RBAC primitives ───────────────────────────────────────────────────────
export type {
  Organization,
  RoleName,
  Role,
  Permission,
  UserRole,
  RoomRecord,
  RoomAccessLevel,
  RoomPermission,
  ActivityLog,
} from './rbac';

// ─── WhatsApp Desk ─────────────────────────────────────────────────────────
export type {
  Language,
  Store,
  Country,
  ConvStatus,
  Message,
  Conversation,
  CustomerHistory,
  GhostBrowse,
  CustomerCard,
  WalletState,
  Vibes,
  ExtractedItem,
  Extraction,
  RiskFlag,
  RoleInsights,
  GoogleSuiteAction,
  ReplyOptimization,
  WritingCheck,
  PaymentVerification,
  Shortcut,
  Magazine,
  StoreRouting,
} from '@/lib/whatsapp/types';

// ─── Inventory ─────────────────────────────────────────────────────────────
export type {
  ParityStatus,
  SEOStatus,
  ShoppingStatus,
  Product,
  AuditNotes,
  ProductMetrics,
  StrategyAction,
  StrategySuggestion,
  ShoppingAttributes,
  SEOResult,
  VeoResult,
  ParitySummary,
} from '@/lib/inventory/types';

// ─── Agents (Omnia AI) ─────────────────────────────────────────────────────
export type {
  AgentKind,
  Agent,
  AgentMessage,
  AgentTask,
  AgentMemory,
  AgentNote,
  AgentFile,
} from '@/lib/agents/types';

// ─── Brand Intelligence ────────────────────────────────────────────────────
export type {
  BrandIntelligenceType,
  BrandIntelligence,
  GAEventName,
  GAEvent,
  IntelligenceDecisionType,
  UserIntelligence,
  BehavioralResult,
  MetaPlatform,
  MetaPostType,
  MetaPostStatus,
  MetaPost,
  MetaAd,
  MetaAlertType,
  MetaAlertSeverity,
  MetaAlert,
  MetaSentinelResult,
  MetaSentimentResult,
} from '@/lib/brand/types';

// ─── Drive Room ────────────────────────────────────────────────────────────
export type {
  DriveVisibility,
  DriveFile,
  CorridorRoomSlug,
  CorridorTriggerAction,
  CorridorStatus,
  RoomWorkflow,
  DriveIntelligenceResult,
  InvoiceComparisonResult,
} from '@/lib/drive/types';

// ─── Backyard ──────────────────────────────────────────────────────────────
export type {
  TeamProfile,
  PerkType,
  BackyardPerk,
  LearningStatus,
  BackyardLearning,
  FoodOrderStatus,
  BackyardFoodOrder,
  BackyardWellbeing,
  BackyardEventType,
  BackyardEventStatus,
  BackyardEvent,
  MilestoneStatus,
  BackyardMilestone,
  EventDecisionResult,
  MilestoneOrchestratorResult,
} from '@/lib/backyard/types';

// ─── Co-Tasking ────────────────────────────────────────────────────────────
export type { CoTaskStatus, CoTask } from '@/lib/co-tasking/types';

// ─── Notes ─────────────────────────────────────────────────────────────────
export type { NoteContent, Note, NoteShare } from '@/lib/notes/types';

// ─── Access Control ────────────────────────────────────────────────────────
export type { AccessRequestStatus, AccessRequest } from '@/lib/access/types';

// ─── Meeting Room ──────────────────────────────────────────────────────────
export type {
  Meeting,
  MeetingAnalysisTask,
  MeetingAnalysisResult,
} from '@/lib/meeting/types';

// ─── Cashback wallet ───────────────────────────────────────────────────────
export type {
  WalletMetadata,
  CustomerWallet,
  WalletTransactionType,
  CustomerWalletTransaction,
} from '@/lib/cashback/types';

// ─── Integrations ──────────────────────────────────────────────────────────
export type {
  IntegrationProvider,
  IntegrationStatus,
  IntegrationMetadata,
  OrgIntegration,
  OrgIntegrationPublic,
} from '@/lib/integrations/types';
export { toPublicIntegration } from '@/lib/integrations/types';

// ─── CRM ───────────────────────────────────────────────────────────────────
export type {
  CRMIdentityLink,
  CRMShortcutCategory,
  CRMShortcut,
} from '@/lib/crm/types';
