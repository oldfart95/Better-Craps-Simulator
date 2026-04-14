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
export type PlayerKind = 'human' | 'ai';
export type ViewKey = 'table' | 'lab' | 'analytics';
export type ZoneGroup = 'line' | 'center' | 'numbers' | 'hardways' | 'field' | 'props';
export type CoachingTone = 'good' | 'warn' | 'neutral';

export interface TableRules {
  tableMin: number;
  tableMax: number;
  startingBankroll: number;
  placeWorkOnComeout: boolean;
  big68Enabled: boolean;
  propBetsEnabled: boolean;
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

export interface PlayerState {
  id: string;
  name: string;
  archetype: string;
  kind: PlayerKind;
  bankroll: number;
  bets: Bet[];
  stats: PlayerStats;
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
  total: number;
  dice: string;
  summary: string;
  detail: string[];
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

export interface GameState {
  rules: TableRules;
  seed: string;
  players: PlayerState[];
  shooterIndex: number;
  point: PointNumber | null;
  rollHistory: number[];
  dice: RollResult | null;
  stats: SessionStats;
  logs: RollLogEntry[];
  recap: SessionRecap;
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
  compactStatsExpanded: boolean;
  seatPositions: Record<string, SeatPosition>;
}
