// aespa photo sources for scripts/fetch-photos.mjs. Codes match lib/cards.js and are save keys.
// Korean minis and studio albums only, like LE SSERAFIM's set; Japanese releases (Hot Mess, Kiss N Tell) are left out.

export default {
  // Member code → gallery page on kpop.fandom.com (a list if the gallery is split over several pages).
  members: {
    KR: 'Karina (aespa)/Gallery',
    GS: 'Giselle (aespa)/Gallery',
    WT: 'Winter (aespa)/Gallery',
    NN: 'Ningning/Gallery'
  },
  group: 'Aespa/Gallery',

  // Era code → the album page that gallery captions link to, and the album's cover file.
  eras: {
    SV: { page: 'Savage (aespa)', cover: 'Aespa Savage digital album cover.png' },
    GR: { page: 'Girls (aespa)', cover: 'Aespa Girls digital album cover.png' },
    MW: { page: 'My World', cover: 'Aespa My World digital album cover.png' },
    DR: { page: 'Drama (aespa)', cover: 'aespa Drama digital album cover.png' },
    AG: { page: 'Armageddon', cover: 'Aespa Armageddon digital album cover.png' },
    WL: { page: 'Whiplash', cover: 'Aespa Whiplash digital cover.png' },
    RM: { page: 'Rich Man', cover: 'aespa Rich Man digital album cover.png' },
    LM: { page: 'Lemonade (aespa)', cover: 'aespa Lemonade digital album cover.png' }
  },

  // Hand-picked files that replace automatic picks: era → member code (or GRP) → files, one per slot
  // in [album PC, selfie PC, POB, lucky draw] order, with null to keep the automatic pick.
  overrides: {}
};
