// Difficulty: three ways to run the vault. Easy drops the last guard of
// every room and slows the cameras; Hard adds a fifth patrol guard and
// makes the cameras sweep faster and the alarm climb faster. Normal is the
// game as designed. One table, so a retune is one number, not a hunt.
export const DIFFICULTIES = {
  easy: {
    key: 'easy',
    label: 'Easy',
    guardSkip: 1,
    extraGuard: false,
    cameraMul: 0.75,
    alarmMul: 0.7,
  },
  normal: {
    key: 'normal',
    label: 'Normal',
    guardSkip: 0,
    extraGuard: false,
    cameraMul: 1,
    alarmMul: 1,
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    guardSkip: 0,
    extraGuard: true,
    cameraMul: 1.35,
    alarmMul: 1.4,
  },
};

export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

/** The difficulty definition for a key, Normal when the key is unknown. */
export function difficultyOf(key) {
  return DIFFICULTIES[key] ?? DIFFICULTIES.normal;
}
