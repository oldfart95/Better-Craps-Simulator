import { AI_ARCHETYPES } from '../engine/constants';
import { AIArchetypeKey, StrategyProfile } from '../engine/types';

export const strategyProfiles: Record<AIArchetypeKey, StrategyProfile> = {
  conservative_pass: {
    key: 'conservative_pass',
    name: AI_ARCHETYPES.conservative_pass.label,
    summary: 'This strategy bets with the shooter and stays relatively simple.',
    howItPlays:
      'It opens with a pass line bet, adds only light odds when the point is on, and rarely wanders into side action. The layout usually stays compact and easy to read.',
    goal: 'Stay on the efficient right-side core while keeping swings manageable.',
    strengths: ['Easy to follow at the table', 'Lower clutter means fewer expensive impulse bets', 'Good for learning line structure and timing'],
    weaknesses: ['Can feel quiet during long stretches', 'Does not press hard when the table gets hot', 'Needs patience because wins arrive more steadily than explosively'],
    volatility: 'Low',
    tablePreference: 'Either',
    style: 'Right-side'
  },
  moderate_pass_odds: {
    key: 'moderate_pass_odds',
    name: AI_ARCHETYPES.moderate_pass_odds.label,
    summary: 'This strategy rides with the shooter, then leans harder with odds and a little number support.',
    howItPlays:
      'It starts on the pass line, adds odds once a point is established, and often keeps the 6 and 8 working to stay involved between line decisions.',
    goal: 'Capture the cleaner math of pass-plus-odds while still getting a bit more action on common box numbers.',
    strengths: ['Balanced mix of structure and activity', 'Uses odds to improve payout efficiency', '6 and 8 support can keep the session moving'],
    weaknesses: ['More exposure than a pure pass plan', 'Can still take sharp hits on a seven-out', 'Requires more bankroll discipline than it first appears'],
    volatility: 'Medium',
    tablePreference: 'Hot',
    style: 'Right-side'
  },
  place_bettor: {
    key: 'place_bettor',
    name: AI_ARCHETYPES.place_bettor.label,
    summary: 'This strategy focuses on repeating box numbers rather than line structure.',
    howItPlays:
      'Instead of building around the pass line, it spreads attention across place bets like 5, 6, 8, and 9. It is looking for those numbers to repeat before a 7 shuts the layout down.',
    goal: 'Collect from number repeats and stay active without depending on the line bet cycle.',
    strengths: ['Clear number-focused identity', 'Feels intuitive if you like tracking box numbers', 'Can produce frequent small hits when numbers repeat'],
    weaknesses: ['A single 7 can wipe multiple bets at once', 'Less connected to the core line structure', 'Can drift into overexposure if too many numbers go up'],
    volatility: 'Medium',
    tablePreference: 'Hot',
    style: 'Number-hunting'
  },
  iron_cross: {
    key: 'iron_cross',
    name: AI_ARCHETYPES.iron_cross.label,
    summary: 'This strategy often feels active because it tries to get paid on many non-7 outcomes.',
    howItPlays:
      'It mixes a pass line foundation with place bets on 5, 6, and 8, then keeps firing a fresh field bet so many non-7 rolls appear to produce action.',
    goal: 'Cover a broad range of non-7 results and create a lively, frequently-paying layout.',
    strengths: ['Feels busy and engaging', 'Many non-7 rolls produce some kind of return', 'Helpful for studying the difference between coverage and efficiency'],
    weaknesses: ['The field adds cost to the system', 'Can look better than it really is during short streaks', 'A seven-out still punishes the whole structure'],
    volatility: 'Medium',
    tablePreference: 'Hot',
    style: 'Broad-coverage'
  },
  darkside: {
    key: 'darkside',
    name: AI_ARCHETYPES.darkside.label,
    summary: 'This strategy bets against the shooter and wants the hand to break down.',
    howItPlays:
      "It opens with don't pass, often adds dark-side odds after a point is set, and may layer don't come bets so multiple positions benefit when a 7 arrives first.",
    goal: 'Profit from short hands, stalled shooters, and point failures.',
    strengths: ['Strong fit for choppy or cold sessions', 'Teaches the full opposite side of craps structure', 'Can stay very coherent when played with discipline'],
    weaknesses: ['Feels uncomfortable to some players', 'Looks wrong during hot stretches', 'Can be punished if shooters keep making points'],
    volatility: 'Medium',
    tablePreference: 'Cold',
    style: 'Dark-side'
  },
  hot_chaser: {
    key: 'hot_chaser',
    name: AI_ARCHETYPES.hot_chaser.label,
    summary: 'This strategy can look strong in a hot stretch, but it is more swingy.',
    howItPlays:
      'It starts with the shooter, adds full odds aggressively, keeps key place bets working, and is more willing than the others to reach for extra action through field and prop exposure.',
    goal: 'Press into momentum and squeeze more out of long, lively hands.',
    strengths: ['Can surge quickly when numbers keep landing', 'Takes fuller advantage of hot shooters', 'Shows how aggressive exposure changes results'],
    weaknesses: ['Downswings arrive fast', 'Props and extra action raise the cost of being wrong', 'A cold table can punish it quickly'],
    volatility: 'High',
    tablePreference: 'Hot',
    style: 'Right-side'
  }
};

export const strategyProfileList = (Object.keys(strategyProfiles) as AIArchetypeKey[]).map((key) => strategyProfiles[key]);
