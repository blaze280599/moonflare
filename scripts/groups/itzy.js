// ITZY photo sources for scripts/fetch-photos.mjs. Codes match lib/cards.js and are save keys.
// Korean minis and the studio album only, and only those the wiki has enough photos for. Its member galleries
// hold just 1–4 photos each for IT'z Icy, IT'z Me, Not Shy, Guess Who, Checkmate and Cheshire, and Lia sat out
// Born To Be, so those are left out; the File namespace has no more. If the wiki fills them in, add them back
// with new codes. The debut single album IT'z Different and Japanese releases (Collector, Ringo…) are out too.

export default {
  // Member code → gallery page on kpop.fandom.com (a list if the gallery is split over several pages).
  members: {
    YE: 'Yeji (ITZY)/Gallery',
    LI: 'Lia (ITZY)/Gallery',
    RJ: 'Ryujin/Gallery',
    CR: 'Chaeryeong/Gallery',
    YN: 'Yuna (ITZY)/Gallery'
  },
  group: 'ITZY/Gallery',

  // Era code → the album page(s) that gallery captions link to, and the album's cover file.
  eras: {
    CL: { page: 'Crazy In Love', cover: 'ITZY Crazy In Love digital album cover.png' },
    KD: { page: 'Kill My Doubt', cover: 'ITZY Kill My Doubt digital album cover.png' },
    GD: { page: 'Gold (ITZY mini album)', cover: 'ITZY Gold digital album cover.png' },
    GB: { page: 'Girls Will Be Girls', cover: 'ITZY Girls Will Be Girls digital album cover.png' },
    TV: { page: 'Tunnel Vision', cover: 'ITZY Tunnel Vision digital album cover.png' },
    MO: { page: 'Motto', cover: 'ITZY Motto digital album cover.png' }
  },

  // Hand-picked files that replace automatic picks: era → member code (or GRP) → files, one per slot
  // in [album PC, selfie PC, POB, lucky draw] order, with null to keep the automatic pick.
  overrides: {}
};
