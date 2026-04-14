import { AIArchetypeKey, BetZone, PointNumber, TableRules } from './types';

export const POINT_NUMBERS: PointNumber[] = [4, 5, 6, 8, 9, 10];

export const DEFAULT_RULES: TableRules = {
  tableMin: 5,
  tableMax: 500,
  startingBankroll: 1000,
  placeWorkOnComeout: false,
  big68Enabled: true,
  propBetsEnabled: true,
  maxOddsMultiplier: { 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3 }
};

export const PAYOUTS = {
  passOdds: { 4: 2, 5: 1.5, 6: 7 / 6, 8: 7 / 6, 9: 1.5, 10: 2 },
  dontOdds: { 4: 0.5, 5: 2 / 3, 6: 5 / 6, 8: 5 / 6, 9: 2 / 3, 10: 0.5 },
  place: { 4: 9 / 5, 5: 7 / 5, 6: 7 / 6, 8: 7 / 6, 9: 7 / 5, 10: 9 / 5 },
  buy: { 4: 2, 10: 2 },
  lay: { 4: 0.5, 5: 2 / 3, 6: 5 / 6, 8: 5 / 6, 9: 2 / 3, 10: 0.5 },
  hard: { 4: 7, 6: 9, 8: 9, 10: 7 },
  field: { 2: 2, 12: 3, default: 1 },
  big: 1,
  props: { any7: 4, yo11: 15, snake2: 30, boxcars12: 30 }
} as const;

export const CHIP_DENOMS = [5, 10, 25, 50, 100];

export const BET_ZONES: BetZone[] = [
  { id: 'dont-pass', label: "Don't Pass", type: 'dontPass', group: 'line', target: null, payout: '1:1', hint: 'Dark-side line bet on the come-out.', layout: 'dont-pass' },
  { id: 'pass-line', label: 'Pass Line', type: 'pass', group: 'line', target: null, payout: '1:1', hint: 'Main line bet for the shooter.', layout: 'pass-line' },
  { id: 'come', label: 'Come', type: 'come', group: 'center', target: null, payout: '1:1', hint: 'Travels to the next point number rolled.', layout: 'come' },
  { id: 'dont-come', label: "Don't Come", type: 'dontCome', group: 'center', target: null, payout: '1:1', hint: 'Dark-side travel bet.', layout: 'dont-come' },
  { id: 'field', label: 'Field', type: 'field', group: 'field', target: null, payout: '1:1 / bonuses', hint: 'One-roll outside number bet.', layout: 'field' },
  { id: 'place-4', label: 'Place 4', type: 'place', group: 'numbers', target: 4, payout: '9:5', hint: 'Wins on 4 before 7.', layout: 'place4' },
  { id: 'place-5', label: 'Place 5', type: 'place', group: 'numbers', target: 5, payout: '7:5', hint: 'Wins on 5 before 7.', layout: 'place5' },
  { id: 'place-6', label: 'Place 6', type: 'place', group: 'numbers', target: 6, payout: '7:6', hint: 'Wins on 6 before 7.', layout: 'place6' },
  { id: 'place-8', label: 'Place 8', type: 'place', group: 'numbers', target: 8, payout: '7:6', hint: 'Wins on 8 before 7.', layout: 'place8' },
  { id: 'place-9', label: 'Place 9', type: 'place', group: 'numbers', target: 9, payout: '7:5', hint: 'Wins on 9 before 7.', layout: 'place9' },
  { id: 'place-10', label: 'Place 10', type: 'place', group: 'numbers', target: 10, payout: '9:5', hint: 'Wins on 10 before 7.', layout: 'place10' },
  { id: 'big-6', label: 'Big 6', type: 'big', group: 'numbers', target: 6, payout: '1:1', hint: 'House-heavy 6 bet.', layout: 'big6' },
  { id: 'big-8', label: 'Big 8', type: 'big', group: 'numbers', target: 8, payout: '1:1', hint: 'House-heavy 8 bet.', layout: 'big8' },
  { id: 'hard-4', label: 'Hard 4', type: 'hard', group: 'hardways', target: 4, payout: '7:1', hint: 'Wins on 2-2 before easy 4 or 7.', layout: 'hard4' },
  { id: 'hard-6', label: 'Hard 6', type: 'hard', group: 'hardways', target: 6, payout: '9:1', hint: 'Wins on 3-3 before easy 6 or 7.', layout: 'hard6' },
  { id: 'hard-8', label: 'Hard 8', type: 'hard', group: 'hardways', target: 8, payout: '9:1', hint: 'Wins on 4-4 before easy 8 or 7.', layout: 'hard8' },
  { id: 'hard-10', label: 'Hard 10', type: 'hard', group: 'hardways', target: 10, payout: '7:1', hint: 'Wins on 5-5 before easy 10 or 7.', layout: 'hard10' },
  { id: 'prop-any7', label: 'Any 7', type: 'prop', group: 'props', target: 'any7', payout: '4:1', hint: 'One-roll prop.', layout: 'any7' },
  { id: 'prop-yo11', label: 'Yo 11', type: 'prop', group: 'props', target: 'yo11', payout: '15:1', hint: 'One-roll prop.', layout: 'yo11' },
  { id: 'prop-snake2', label: 'Snake Eyes', type: 'prop', group: 'props', target: 'snake2', payout: '30:1', hint: 'One-roll prop.', layout: 'snake2' },
  { id: 'prop-boxcars12', label: 'Boxcars', type: 'prop', group: 'props', target: 'boxcars12', payout: '30:1', hint: 'One-roll prop.', layout: 'boxcars12' }
];

export const AI_ARCHETYPES: Record<
  AIArchetypeKey,
  { label: string; base: 'pass' | 'dontPass' | null; oddsRate: number; place: PointNumber[]; dark: boolean; props: number; field: number }
> = {
  conservative_pass: { label: 'Conservative Pass', base: 'pass', oddsRate: 0.35, place: [] as PointNumber[], dark: false, props: 0.02, field: 0.04 },
  moderate_pass_odds: { label: 'Moderate Pass + Odds', base: 'pass', oddsRate: 0.8, place: [6, 8] as PointNumber[], dark: false, props: 0.03, field: 0.08 },
  place_bettor: { label: 'Place Bettor', base: null, oddsRate: 0, place: [5, 6, 8, 9] as PointNumber[], dark: false, props: 0.05, field: 0.02 },
  iron_cross: { label: 'Iron Cross', base: 'pass', oddsRate: 0.25, place: [5, 6, 8] as PointNumber[], dark: false, props: 0.02, field: 0.75 },
  darkside: { label: 'Darkside', base: 'dontPass', oddsRate: 0.8, place: [] as PointNumber[], dark: true, props: 0.01, field: 0 },
  hot_chaser: { label: 'Hot Chaser', base: 'pass', oddsRate: 1, place: [5, 6, 8] as PointNumber[], dark: false, props: 0.1, field: 0.08 }
};
