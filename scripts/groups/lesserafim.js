// LE SSERAFIM photo sources for scripts/fetch-photos.mjs. Codes match lib/cards.js and are save keys.

export default {
  // Member code → gallery page on kpop.fandom.com (a list if the gallery is split over several pages).
  members: {
    CW: 'Kim Chaewon (LE SSERAFIM)/Gallery',
    SK: 'Sakura (LE SSERAFIM)/Gallery',
    YJ: 'Huh Yunjin/Gallery',
    KZ: 'Kazuha/Gallery',
    EC: 'Hong Eunchae/Gallery'
  },
  group: 'LE SSERAFIM/Gallery',

  // Era code → the album page that gallery captions link to (a list to pool a pre-release's photos with
  // its album's), and the album's cover file.
  eras: {
    FL: { page: 'Fearless (LE SSERAFIM)', cover: 'LE SSERAFIM Fearless digital album cover.png' },
    AF: { page: 'Antifragile', cover: 'LE SSERAFIM Antifragile digital album cover.png' },
    UF: { page: 'Unforgiven', cover: 'LE SSERAFIM Unforgiven digital album cover.png' },
    EZ: { page: 'Easy (LE SSERAFIM)', cover: 'LE SSERAFIM Easy digital album cover.png' },
    CZ: { page: 'Crazy (LE SSERAFIM)', cover: 'LE SSERAFIM Crazy digital cover.png' },
    HT: { page: 'Hot (LE SSERAFIM)', cover: 'LE SSERAFIM Hot digital album cover.png' },
    PF: { page: 'Pureflow Pt.1', cover: 'LE SSERAFIM Pureflow Pt 1 digital album cover.png' }
  },

  // Hand-picked files that replace automatic picks: era → member code (or GRP) → files, one per slot
  // in [album PC, selfie PC, POB, lucky draw] order, with null to keep the automatic pick. For example:
  //   FL: { KZ: [null, 'LE SSERAFIM Kazuha FEARLESS concept photo (2).png', null, null] }
  overrides: {}
};
