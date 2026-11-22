# SILENT VAULT — a heist in five rooms

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/0xtaaaa/silent-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/0xtaaaa/silent-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Rook the thief has one night in the Halcyon Vault: five rooms, a pocket
full of coins, one EMP — and a getaway door that only opens when every
piece of loot is pocketed. Guards patrol with real vision cones that stop
at walls. Cameras sweep and never blink. The alarm climbs while anyone is
on you, and at 100% the run is over. Elite guards patrol faster, see
further and wider, and investigate a noise instead of going back to their
route.

## Play

- **WASD / arrows** — move. **Shift** — run (fast, loud). **C** — crouch (slow, quiet, hard to see).
- **Q or mouse click** — throw a coin. Guards go to look where it lands.
- **E** — fire the EMP: cameras blind for 12 seconds, guard vision dimmed.
- **F** — hack a terminal or crack a safe (stand close): stop the marker in the green zone, three locks. A terminal hack blinds every camera for 20 seconds; a cracked safe pays $300. Fail once and the alarm jumps 25%.
- **1 / 2 / 3** — difficulty on the title screen: Easy (one fewer guard, slower cameras, slower alarm), Normal, Hard (an extra patrol guard, faster cameras, faster alarm).
- **P / Esc** — pause. **Space / Enter** — start, continue, lock a hack.

Steal every piece of loot in a room, then reach the green EXIT. Three strikes per
room — each strike costs $150. A room finished with the alarm never raised pays a 500-point ghost
bonus; fast rooms pay a time bonus. The end screen breaks the score down: loot, bonuses, penalties. Best score is saved in your browser.

## Loot

| Piece | Worth |
| --- | --- |
| Relic | $100 |
| Data drive | $150 |
| Gold bar | $250 |
| Safe (cracked) | $300 |
| Art piece | $400 |

## The rooms

1. **The Lobby** — two guards, one camera. Learn to read the cones.
2. **The Gallery** — three guards, two cameras, four pieces. Plan two routes.
3. **The Vault** — four guards, three cameras, five pieces. The big score.
4. **The Server Room** — three guards (one elite), two cameras, a security terminal. Hack the cameras dark.
5. **The Safe Deposit** — three guards (one elite), two cameras, three safes. Crack them all.

Dark floor zones hide you: a guard's detection fills four times slower
while you crouch in shadow. Running past a guard's earshot turns them.
A thrown coin buys you a whole patrol route of silence.

## Build

Plain ES modules, no library, no network — the game runs from static
files. `node serve.ts` serves it on your machine. `node main.ts`
writes the entry bundle to `/output` (or `$MAKEFUN_OUTPUT_DIR`).

Entry for the [Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559)
bounty on [make.fun](https://make.fun/r/s3k5038j) — referral code `s3k5038j`.
