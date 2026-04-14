export interface StrategyBookPage {
  id: string;
  title: string;
  category: 'basics' | 'common' | 'uncommon' | 'discipline';
  summary: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export const strategyBook: StrategyBookPage[] = [
  {
    id: 'craps-basics',
    title: 'Craps Basics',
    category: 'basics',
    summary: 'The shortest possible guide to what the shooter, point, and line bets are doing.',
    sections: [
      {
        heading: 'Table flow',
        body: [
          'The game begins on the come-out roll. A 7 or 11 is instantly good for the pass line. A 2, 3, or 12 is instantly bad for the pass line.',
          'If the shooter rolls 4, 5, 6, 8, 9, or 10, that number becomes the point. After that, the shooter keeps rolling until the point repeats or a 7 appears.'
        ]
      },
      {
        heading: 'Two anchor ideas',
        body: [
          'Pass line means you are riding with the shooter. Don’t pass means you are fading the shooter.',
          'Most study plans begin by learning the line bets, then learning odds, then deciding whether to add place bets or stay simple.'
        ]
      },
      {
        heading: 'What strategy really means here',
        body: [
          'Craps strategy is mostly about choosing efficient bets and avoiding expensive ones. The dice are random either way.',
          'That makes discipline and layout control more important than “predicting” the next roll.'
        ]
      }
    ]
  },
  {
    id: 'pass-line-odds',
    title: 'Pass Line with Odds',
    category: 'common',
    summary: 'The classic low-complexity approach many players treat as the default right-side strategy.',
    sections: [
      {
        heading: 'How to run it',
        body: [
          'Start with a pass line bet on the come-out. Once a point is established, add odds behind it.',
          'Odds are valuable because they pay at true odds instead of carrying the same built-in edge as many other bets.'
        ]
      },
      {
        heading: 'Why players like it',
        body: [
          'It is easy to track, easy to size, and mathematically cleaner than spraying chips around the prop area.',
          'It also gives you a good foundation for later layering in a place 6 or place 8 if you want more action.'
        ]
      },
      {
        heading: 'Main caution',
        body: [
          'Maximum odds may be efficient, but they also increase variance. If you are still learning, smaller odds multiples can make the table easier to survive and understand.'
        ]
      }
    ]
  },
  {
    id: 'place-6-8',
    title: 'Place the 6 and 8',
    category: 'common',
    summary: 'A practical action-focused approach built around the most popular place numbers.',
    sections: [
      {
        heading: 'Why these numbers',
        body: [
          'The 6 and 8 are popular because they are rolled more often than the other box numbers except 7.',
          'They also pay better than Big 6 or Big 8, so if you want action on those totals, place bets are generally the cleaner version.'
        ]
      },
      {
        heading: 'How people use it',
        body: [
          'Some players combine pass line plus odds with place 6 and 8. Others wait for a point, then simply place the 6 and 8 without bothering with the line.',
          'This is often the first “extra action” system beginners study after learning the basic line game.'
        ]
      },
      {
        heading: 'Study habit',
        body: [
          'Practice collecting once or twice before pressing. That makes it easier to understand table rhythm before you start escalating exposure.'
        ]
      }
    ]
  },
  {
    id: 'iron-cross',
    title: 'Iron Cross',
    category: 'common',
    summary: 'A busy, recreational system built around the field plus place bets on 5, 6, and 8.',
    sections: [
      {
        heading: 'What it tries to do',
        body: [
          'The Iron Cross tries to cover almost every non-7 roll with some kind of hit by combining place bets with a fresh field bet.',
          'It feels lively because something seems to happen often.'
        ]
      },
      {
        heading: 'Why it is popular',
        body: [
          'It is visual, easy to remember, and satisfying for players who want a more active-looking layout than pass plus odds.'
        ]
      },
      {
        heading: 'Why it is not a pure value play',
        body: [
          'The field is a weaker bet than the core low-edge wagers, so the system pays for that “always something happening” feeling.',
          'It is a useful system to study because it teaches the difference between table excitement and mathematical efficiency.'
        ]
      }
    ]
  },
  {
    id: 'dark-side',
    title: 'Dark-Side Play',
    category: 'uncommon',
    summary: 'A structured way to bet against the shooter using don’t pass, don’t come, and dark-side odds.',
    sections: [
      {
        heading: 'Core idea',
        body: [
          'Instead of riding with the shooter, you start with don’t pass, then may add odds after a point is established. Later, you can add don’t come bets to create multiple seven-favorable positions.'
        ]
      },
      {
        heading: 'Why study it anyway',
        body: [
          'Even if you never become a dark-side player, learning it helps you understand the full structure of the game and the relationship between points, odds, and seven-outs.'
        ]
      },
      {
        heading: 'Common beginner mistake',
        body: [
          'Mixing right-side and wrong-side bets emotionally instead of intentionally. If you are studying a dark-side plan, keep the layout coherent instead of hedging every feeling.'
        ]
      }
    ]
  },
  {
    id: 'specialty-bets',
    title: 'Buy, Lay, Hardways, and Props',
    category: 'uncommon',
    summary: 'The side menu of craps: useful to understand, but not usually where disciplined play begins.',
    sections: [
      {
        heading: 'Buy and lay bets',
        body: [
          'Buy bets are usually discussed on 4 and 10. Lay bets are the dark-side version of betting against a number. Vig changes their real cost, so they are more specialized than simple place bets.'
        ]
      },
      {
        heading: 'Hardways',
        body: [
          'Hardways only win if the number arrives as a pair before it arrives the easy way or before 7. They are colorful and memorable, but not the foundation of disciplined play.'
        ]
      },
      {
        heading: 'Props',
        body: [
          'One-roll proposition bets are usually the fastest way to pay for entertainment. They are worth understanding because they are part of the table language, but they are not where strong strategy starts.'
        ]
      }
    ]
  },
  {
    id: 'bankroll-discipline',
    title: 'Bankroll and Discipline',
    category: 'discipline',
    summary: 'The part of strategy that keeps all the other pages from becoming chaos.',
    sections: [
      {
        heading: 'Unit sizing',
        body: [
          'Start with a chip size that lets you survive normal swings. A mathematically respectable layout can still feel brutal if you oversize every decision.'
        ]
      },
      {
        heading: 'Avoid layout creep',
        body: [
          'Many players start with a simple system and then add field bets, hardways, props, and extra place numbers because the shooter looks hot. That usually makes the board harder to manage and less efficient.'
        ]
      },
      {
        heading: 'How to use this app to study',
        body: [
          'Pick one page from this booklet, then practice only that structure on the live table for a while. Study gets clearer when you isolate one plan instead of improvising five at once.'
        ]
      }
    ]
  }
];
