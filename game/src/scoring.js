// Scoring: loot is worth what it is, and the run's score says so.
// A relic is the baseline; a gold bar is heavy money, a data drive is
// quiet money, a piece of art is the prize of the night. Getting caught
// costs a flat penalty, so a loud run can still pay — just less.
export const LOOT_VALUES = {
  relic: 100,
  gold: 250,
  data: 150,
  art: 400,
};

export const LOOT_LABELS = {
  relic: 'Relic',
  gold: 'Gold bar',
  data: 'Data drive',
  art: 'Art piece',
};

/** What one piece of loot of this kind is worth. */
export function lootValue(kind) {
  return LOOT_VALUES[kind] ?? LOOT_VALUES.relic;
}

/** The flat score penalty for losing a strike. */
export const ALARM_PENALTY = 150;

/**
 * The run's score as its parts: loot pocketed, room bonuses earned
 * (time + ghost), alarm penalties paid, and the total the HUD shows.
 */
export function scoreBreakdown(world) {
  return {
    loot: world.lootValue,
    bonuses: world.bonusTotal,
    penalties: world.alarmPenalties,
    total: world.score,
  };
}
