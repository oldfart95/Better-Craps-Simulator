export type BetType =
  | 'pass'
  | 'dontPass'
  | 'come'
  | 'dontCome'
  | 'odds'
  | 'field'
  | 'place'
  | 'buy'
  | 'lay'
  | 'big'
  | 'hard'
  | 'prop';

export type PropTarget = 'any7' | 'yo11' | 'snake2' | 'boxcars12';
export type PointNumber = 4 | 5 | 6 | 8 | 9 | 10;
export type NumberTarget = PointNumber | 6 | 8;
export type BetTarget = PointNumber | PropTarget | null;
export type BetPhase = 'active' | 'moved';
export type TablePhase = 'come-out' | 'point';
export type PlayerKind = 'human' | 'ai';
export type ViewKey = 'table' | 'lab' | 'analytics' | 'booklet';
export type ZoneGroup = 'line' | 'center' | 'numbers' | 'hardways' | 'field' | 'props';
export type CoachingTone = 'good' | 'warn' | 'neutral';
export type RollContextKind =
  | 'natural'
  | 'craps'
  | 'point_established'
  | 'point_made'
  | 'seven_out'
  | 'point_cycle_continue'
  | 'invalid_phase'
  | 'invalid_result';
export type BetResolutionOutcome = 'win' | 'lose' | 'push' | 'travel' | 'kept' | 'returned';
export type RoundEndedBy = 'seven_out' | 'session_end' | 'in_progress';
export type AIArchetypeKey =
  | 'conservative_pass'
  | 'moderate_pass_odds'
  | 'place_bettor'
  | 'iron_cross'
  | 'darkside'
  | 'hot_chaser';

export interface TableRules {
  tableMin: number;
  tableMax: number;
  startingBankroll: number;
  placeWorkOnComeout: boolean;
  big68Enabled: boolean;
  propBetsEnabled: boolean;
  beginnerMode: boolean;
  freePractice: boolean;
  maxOddsMultiplier: Record<PointNumber, number>;
}

export interface Bet {
  id: string;
  type: BetType;
  amount: number;
  target: BetTarget;
  baseId: string | null;
  phase: BetPhase;
  worksOnComeout: boolean;
  ownerId: string;
}

export interface PlayerStats {
  net: number;
  wins: number;
  losses: number;
  byBetType: Partial<Record<BetType, number>>;
}

export interface BankrollHistoryEntry {
  rollNumber: number;
  bankroll: number;
  net: number;
}

export interface PlayerState {
  id: string;
  name: string;
  archetype: string;
  kind: PlayerKind;
  startingBankroll: number;
  bankroll: number;
  bets: Bet[];
  stats: PlayerStats;
  bankrollHistory: BankrollHistoryEntry[];
}

export interface RollResult {
  d1: number;
  d2: number;
  total: number;
  hard: boolean;
}

export interface SessionStats {
  totalRolls: number;
  totalShooters: number;
  currentShooterLength: number;
  longestShooter: number;
  sevenOuts: number;
  pointEstablished: Record<PointNumber, number>;
  pointMade: Record<PointNumber, number>;
  winByBet: Partial<Record<BetType, number>>;
}

export interface RollLogEntry {
  id: string;
  rollNumber: number;
  shooter: string;
  total: number;
  dice: string;
  pointBefore: PointNumber | null;
  pointAfter: PointNumber | null;
  summary: string;
  detail: string[];
}

export interface BetSnapshot {
  id: string;
  ownerId: string;
  type: BetType;
  amount: number;
  target: BetTarget;
  phase: BetPhase;
  baseId: string | null;
  worksOnComeout: boolean;
}

export interface BetResolutionRecord {
  playerId: string;
  playerName: string;
  betId: string;
  betType: BetType;
  target: BetTarget;
  outcome: BetResolutionOutcome;
  amount: number;
  payout: number;
  bankrollDelta: number;
  note: string;
}

export interface InvariantFailure {
  sessionId: string;
  rollIndex: number;
  code: string;
  message: string;
}

export interface RollAuditRecord {
  sessionId: string;
  rollIndex: number;
  shooterId: string;
  shooterName: string;
  dice: [number, number];
  total: number;
  phaseBefore: TablePhase;
  pointBefore: PointNumber | null;
  phaseAfter: TablePhase;
  pointAfter: PointNumber | null;
  classification: RollContextKind;
  detectedEvents: string[];
  betsBefore: BetSnapshot[];
  betsResolved: BetResolutionRecord[];
  payouts: BetResolutionRecord[];
  bankrollBefore: number;
  bankrollAfter: number;
  reasoning: string[];
}

export interface RoundSummary {
  roundIndex: number;
  shooterId: string;
  shooterName: string;
  pointEstablished: PointNumber[];
  endedBy: RoundEndedBy;
  rollCount: number;
  totalsSequence: number[];
  netResult: number;
}

export interface RoundTracker {
  roundIndex: number;
  shooterId: string;
  shooterName: string;
  pointEstablished: PointNumber[];
  rollCount: number;
  totalsSequence: number[];
  bankrollBefore: number;
}

export interface AuditState {
  sessionId: string;
  rngSeed: string;
  rolls: RollAuditRecord[];
  rounds: RoundSummary[];
  invariantFailures: InvariantFailure[];
  currentRound: RoundTracker;
  nextRoundIndex: number;
}

export interface SessionRecap {
  title: string;
  detail: string;
  bankrollDelta: number;
  tone: CoachingTone;
}

export interface CompactStat {
  label: string;
  value: string;
  hint: string;
}

export interface LegalActionSet {
  ok: boolean;
  reason: string;
}

export interface BetZone {
  id: string;
  label: string;
  type: BetType;
  group: ZoneGroup;
  target: BetTarget;
  payout: string;
  hint: string;
  layout: string;
}

export interface BatchSummary {
  sessions: number;
  averageRolls: number;
  averageShooterLength: number;
  longestShooter: number;
  sevenOutRate: number;
  pointMadeTotals: Record<PointNumber, number>;
  winByBetAggregate: Partial<Record<BetType, number>>;
}

export interface BatchSessionRow {
  session: number;
  totalRolls: number;
  avgShooterLength: number;
  longestShooter: number;
  sevenOuts: number;
}

export interface BatchResult {
  summary: BatchSummary;
  rows: BatchSessionRow[];
}

export interface StrategyProfile {
  key: AIArchetypeKey;
  name: string;
  summary: string;
  howItPlays: string;
  goal: string;
  strengths: string[];
  weaknesses: string[];
  volatility: 'Low' | 'Medium' | 'High';
  tablePreference: 'Hot' | 'Cold' | 'Either';
  style: 'Right-side' | 'Dark-side' | 'Number-hunting' | 'Broad-coverage';
}

export interface SessionTextureMetrics {
  totalRolls: number;
  totalShooters: number;
  averageRollsPerShooter: number;
  longestHeater: number;
  sevenOuts: number;
  sevenOutRate: number;
  recentSevenRate: number;
  pointEstablishedTotal: number;
  pointMadeTotal: number;
  pointConversionRate: number;
  shooterRhythm: string;
  tablePressure: string;
  varianceNote: string;
}

export interface StrategyComparisonRow {
  playerId: string;
  playerName: string;
  archetype: string;
  startingBankroll: number;
  endingBankroll: number;
  net: number;
  peakBankroll: number;
  maxDrawdown: number;
  rank: number;
  volatilityTag: 'Steady' | 'Balanced' | 'Swingy';
  interpretation: string;
}

export interface CsvDownload {
  filename: string;
  content: string;
}

export interface GameState {
  rules: TableRules;
  seed: string;
  startedAt: string;
  auditMode: boolean;
  players: PlayerState[];
  shooterIndex: number;
  point: PointNumber | null;
  rollHistory: number[];
  dice: RollResult | null;
  stats: SessionStats;
  logs: RollLogEntry[];
  recap: SessionRecap;
  audit: AuditState;
}

export interface BetPlacementInput {
  type: BetType;
  amount: number;
  target?: BetTarget;
  baseId?: string | null;
}

export interface EngineConfig {
  seed?: string;
  rules?: Partial<TableRules>;
  aiCount?: number;
  humanName?: string;
  auditMode?: boolean;
}

export interface SeatPosition {
  x: number;
  y: number;
}

export interface PersistedPreferences {
  chipDenom: number;
  autoRollMs: number;
  trainingHighlights: boolean;
  guidedPrompts: boolean;
  beginnerMode: boolean;
  freePractice: boolean;
  compactStatsExpanded: boolean;
  seatPositions: Record<string, SeatPosition>;
}

export interface AuditExport {
  simVersion: string;
  auditMode: boolean;
  rngSeed: string;
  sessionId: string;
  config: {
    rules: TableRules;
    aiCount: number;
    humanName: string;
  };
  rounds: RoundSummary[];
  rolls: RollAuditRecord[];
  invariantFailures: InvariantFailure[];
}
