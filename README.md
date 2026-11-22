# SILENT VAULT — a heist in three rooms

![bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![rank](https://make.fun/0xtaaaa/silent-vault-heist/rank.svg)
![reward](https://make.fun/0xtaaaa/silent-vault-heist/reward.svg)

Rook the thief has one night in the Halcyon Vault: three rooms, a pocket
full of coins, one EMP — and a getaway door that only opens when every
relic is pocketed. Guards patrol with real vision cones that stop at walls.
Cameras sweep and never blink. The alarm climbs while anyone is on you, and
at 100% the run is over.

## Play

- **WASD / arrows** — move. **Shift** — run (fast, loud). **C** — crouch (slow, quiet, hard to see).
- **Q or mouse click** — throw a coin. Guards go to look where it lands.
- **E** — fire the EMP: cameras blind for 12 seconds, guard vision dimmed.
- **P / Esc** — pause. **Space / Enter** — start, continue.

Steal every relic in a room, then reach the green EXIT. Three strikes per
room. A room finished with the alarm never raised pays a 500-point ghost
bonus; fast rooms pay a time bonus. Best score is saved in your browser.

## The rooms

1. **The Lobby** — two guards, one camera. Learn to read the cones.
2. **The Gallery** — three guards, two cameras, four relics. Plan two routes.
3. **The Vault** — four guards, three cameras, five relics. The big score.

Dark floor zones hide you: a guard's detection fills four times slower
while you crouch in shadow. Running past a guard's earshot turns them.
A thrown coin buys you a whole patrol route of silence.

## Build

Plain ES modules, no library, no network — the game runs from static
files. `node serve.ts` serves it on your machine. `node main.ts`
writes the entry bundle to `/output` (or `$MAKEFUN_OUTPUT_DIR`).

Entry for the [Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559)
bounty on [make.fun](https://make.fun/r/s3k5038j) — referral code `s3k5038j`.
