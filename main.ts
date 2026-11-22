// SILENT VAULT — the entry program for the best-heist-game bounty.
// The game lives in game/ beside this file: plain static files (one HTML
// page and its ES modules, no library, no network request) that a desktop
// browser plays offline. This program hands the entry in: it copies game/
// and screenshots/ to the output directory and writes dossier.json there,
// the summary the judge reads, using the vendored make.fun library.
//
// Run it with `node main.ts` (Node 22, standard library only). Outside the
// grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with `node serve.ts`, then open the local server
// address it prints.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps, mirrored here so a bad entry is refused before it is
// sent: at most 4 screenshots, each 256 KiB or less; game/ at most 993
// files and 48 MiB in all, no path under it over 1000 bytes; the dossier's
// source text is capped at 163,840 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
