// IVE photo sources for scripts/fetch-photos.mjs. Codes match lib/cards.js and are save keys.
// Korean EPs and studio albums only. The single albums (Eleven, Love Dive, After Like) are left out, along with
// Japanese releases. Looks Can Kill (EP) is out on 2026-10-26: add it once its concept photos are up.
// Yujin is YU because YJ is LE SSERAFIM's Yunjin.

export default {
  // Member code → gallery page on kpop.fandom.com (a list if the gallery is split over several pages).
  members: {
    YU: 'An Yujin/Gallery',
    GA: 'Gaeul (IVE)/Gallery',
    RE: 'Rei (IVE)/Gallery',
    WY: 'Jang Wonyoung/Gallery',
    LZ: 'Liz (IVE)/Gallery',
    LO: 'Leeseo/Gallery'
  },
  group: 'IVE/Gallery',

  // Era code → the album page(s) that gallery captions link to, and the album's cover file.
  eras: {
    II: { page: "I've IVE", cover: "IVE I've IVE digital album cover.png" },
    IM: { page: ["I've Mine", 'Either Way', 'Off The Record (IVE)'], cover: 'IVE Ive Mine online cover.png' },
    SW: { page: 'IVE Switch', cover: 'IVE IVE Switch digital album cover.png' },
    EM: { page: 'IVE Empathy', cover: 'IVE IVE Empathy digital album cover.png' },
    SC: { page: 'IVE Secret', cover: 'IVE IVE Secret digital cover.webp' },
    RV: { page: 'Revive+', cover: 'IVE Revive+ digital album cover.png' }
  },

  // Hand-picked files that replace automatic picks: era → member code (or GRP) → files, one per slot
  // in [album PC, selfie PC, POB, lucky draw] order, with null to keep the automatic pick.
  overrides: {}
};
