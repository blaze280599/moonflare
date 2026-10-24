// Builds lib/photos/<group>.js: the photo URL for every card of one real group, plus album covers.
//
//   npm run photos -- <group>     rebuild lib/photos/<group>.js from scripts/groups/<group>.js
//   npm run photos:check          check every listed photo still exists on the wiki
//
// Photos come from the member gallery pages on the K-pop fandom wiki (kpop.fandom.com), read
// through its MediaWiki API. No images are downloaded or committed: the app hotlinks the wiki's
// CDN, which crops each photo to card shape server-side. The CDN blocks non-browser clients, so
// this script only reads the API, never the images.

import { readdir, writeFile } from 'node:fs/promises';

const API = 'https://kpop.fandom.com/api.php';
const GROUPS_DIR = new URL('./groups/', import.meta.url);
const PHOTOS_DIR = new URL('../lib/photos/', import.meta.url);

// Member cards per era, in this order: album PC, selfie PC, POB, lucky draw.
const PER_MEMBER = 4;

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'MoonflarePhotocardClub/1.0 (personal fan project)' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

// Wiki titles ignore underscores and the first letter's case.
const title = s => {
  const t = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// Gallery lines look like `File name.png|''[[Album page|Label]]'' (3)`. Editors also write singles in
// quotes (`"[[Page|Label]]"`) or leave the link bare, so accept all three. Returns { albumPage: [file, ...] }.
const CAPTION = /^\s*([^|]+?\.(?:png|jpe?g|webp|gif))\s*\|\s*(?:''|["“])?\s*\[\[([^\]|#]+)/i;

async function galleryByAlbum(page) {
  const { parse, error } = await api({ action: 'parse', page, prop: 'wikitext' });
  if (error) throw new Error(`${page}: ${error.info}`);
  const byAlbum = {};
  for (const line of parse.wikitext['*'].split('\n')) {
    const m = line.match(CAPTION);
    if (m) (byAlbum[title(m[2])] ??= []).push(m[1].trim());
  }
  return byAlbum;
}

// Merges several gallery pages (a member's gallery can be split by year).
async function galleries(pages) {
  const merged = {};
  for (const page of [pages].flat()) {
    for (const [album, files] of Object.entries(await galleryByAlbum(page))) (merged[album] ??= []).push(...files);
  }
  return merged;
}

// Spreads picks across the shoot, so one card isn't a near-copy of the next.
const spread = (files, n) => Array.from({ length: Math.min(n, files.length) }, (_, i) => files[Math.floor((i * files.length) / n)]);

// File name → { url, missing, moved } for each file, asking the API 50 at a time.
async function imageInfo(files) {
  const out = {};
  for (let i = 0; i < files.length; i += 50) {
    const titles = files.slice(i, i + 50).map(f => `File:${f}`).join('|');
    const { query } = await api({ action: 'query', titles, prop: 'imageinfo', iiprop: 'url', redirects: 1 });
    const back = {};
    for (const n of query.normalized ?? []) back[n.to] = n.from;
    for (const r of query.redirects ?? []) back[r.to] = back[r.from] ?? r.from;
    for (const p of Object.values(query.pages)) {
      const file = (back[p.title] ?? p.title).replace(/^File:/, '');
      if (!p.imageinfo) out[file] = { missing: true };
      else out[file] = { url: p.imageinfo[0].url, moved: (query.redirects ?? []).some(r => r.to === p.title) };
    }
  }
  return out;
}

// CDN URL cropped to w×h. "smart" crops around the subject.
const cropped = (url, w, h) => {
  const [base, cb] = url.split('?');
  return `${base}/smart/width/${w}/height/${h}?${cb}`;
};

const exportName = id => `${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PHOTOS`;

async function build(id) {
  const { default: cfg } = await import(new URL(`${id}.js`, GROUPS_DIR));
  const sources = { ...cfg.members, GRP: cfg.group };
  const byCode = {};
  for (const [code, pages] of Object.entries(sources)) byCode[code] = await galleries(pages);

  const problems = [];
  const picks = {}; // era → member code → files
  const report = [];
  for (const [era, { page }] of Object.entries(cfg.eras)) {
    picks[era] = {};
    const counts = [];
    for (const code of Object.keys(sources)) {
      const want = code === 'GRP' ? 1 : PER_MEMBER;
      const forced = cfg.overrides?.[era]?.[code] ?? [];
      const files = (byCode[code][title(page)] ?? []).filter(f => !forced.includes(f));
      const auto = code === 'GRP' ? files.slice(0, 1) : spread(files, want);
      const chosen = Array.from({ length: want }, (_, i) => forced[i] ?? auto[i]).filter(Boolean);
      counts.push(`${code} ${String(files.length).padStart(3)}${chosen.length < want ? '!' : ' '}`);
      if (chosen.length < want) problems.push(`${era} ${code}: ${chosen.length} of ${want} photos from "${page}"`);
      picks[era][code] = chosen;
    }
    report.push(`  ${era}  ${counts.join('  ')}`);
  }
  console.log(`Photos found per era (! = not enough):\n${report.join('\n')}`);

  // Album pages the galleries link to that no era uses: handy when setting up a group or a comeback.
  const used = new Set(Object.values(cfg.eras).map(e => title(e.page)));
  const other = {};
  for (const g of Object.values(byCode)) for (const [album, files] of Object.entries(g)) if (!used.has(album)) other[album] = (other[album] ?? 0) + files.length;
  const top = Object.entries(other).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (top.length) console.log(`Other pages the galleries link to:\n${top.map(([p, n]) => `  ${String(n).padStart(4)}  ${p}`).join('\n')}`);

  const cardFiles = Object.values(picks).flatMap(e => Object.values(e).flat());
  const covers = Object.values(cfg.eras).map(e => e.cover);
  const info = await imageInfo([...new Set([...cardFiles, ...covers])]);
  for (const f of [...cardFiles, ...covers]) if (!info[f]?.url) problems.push(`no image on the wiki for "${f}"`);
  if (problems.length) throw new Error(`Not written:\n  ${problems.join('\n  ')}`);

  const photos = {};
  for (const [era, members] of Object.entries(picks)) {
    photos[era] = { cover: cropped(info[cfg.eras[era].cover].url, 600, 600), cards: {} };
    for (const [code, files] of Object.entries(members)) photos[era].cards[code] = files.map(f => cropped(info[f].url, 630, 880));
  }

  await writeFile(
    new URL(`${id}.js`, PHOTOS_DIR),
    `// Generated by scripts/fetch-photos.mjs on ${new Date().toISOString().slice(0, 10)}. Don't edit by hand.\n` +
      `// Photo URLs on the K-pop fandom wiki's CDN, cropped to card shape. Member lists are\n` +
      `// [album PC, selfie PC, POB, lucky draw]; GRP is the group special.\n\n` +
      `export const ${exportName(id)} = ${JSON.stringify(photos, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")};\n`
  );
  console.log(`Wrote ${cardFiles.length} card photos and ${covers.length} covers to lib/photos/${id}.js`);
}

// `https://static.wikia.nocookie.net/kpop/images/4/44/File_name.png/revision/latest/...` → "File name.png"
const fileOf = url => decodeURIComponent(url.match(/\/images\/\w\/\w\w\/([^/]+)\/revision\//)[1]).replace(/_/g, ' ');

async function check(ids) {
  let broken = 0;
  for (const id of ids) {
    const photos = (await import(new URL(`${id}.js`, PHOTOS_DIR)))[exportName(id)];
    const where = {}; // file → where it's used
    for (const [era, { cover, cards }] of Object.entries(photos)) {
      (where[fileOf(cover)] ??= []).push(`${era} cover`);
      for (const [code, urls] of Object.entries(cards)) urls.forEach((u, i) => (where[fileOf(u)] ??= []).push(`${era} ${code}[${i}]`));
    }
    const info = await imageInfo(Object.keys(where));
    const bad = Object.entries(where).filter(([f]) => !info[f] || info[f].missing || info[f].moved);
    for (const [f, uses] of bad) console.log(`  ${id}: ${info[f]?.moved ? 'renamed' : 'missing'} "${f}" (${uses.join(', ')})`);
    console.log(`${id}: ${Object.keys(where).length - bad.length} of ${Object.keys(where).length} photos still on the wiki`);
    broken += bad.length;
  }
  if (broken) {
    console.log('Re-run `npm run photos -- <group>` to pick replacements.');
    process.exitCode = 1;
  }
}

const groupIds = async dir => (await readdir(dir)).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
const [arg, ...rest] = process.argv.slice(2);
const known = await groupIds(GROUPS_DIR);

if (arg === '--check') {
  await check(rest.length ? rest : await groupIds(PHOTOS_DIR));
} else if (known.includes(arg)) {
  await build(arg).catch(e => {
    console.error(e.message);
    process.exitCode = 1;
  });
} else {
  console.error(`Usage: npm run photos -- <group>  |  npm run photos:check\nGroups: ${known.join(', ')}`);
  process.exitCode = 1;
}
