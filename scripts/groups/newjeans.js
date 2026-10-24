// NewJeans photo sources for scripts/fetch-photos.mjs. Codes match lib/cards.js and are save keys.
// NewJeans has only two EPs, so their two single albums count too. Each pools its pre-release single's photos
// (Ditto, Super Shy, Bubble Gum) with the album's. The Japanese single Supernatural and the NJWMX remix album
// are left out. Hanni is HA: HN is a retired MOONFLARE code.

export default {
  // Member code → gallery page on kpop.fandom.com (a list if the gallery is split over several pages).
  members: {
    MJ: 'Minji (NewJeans)/Gallery',
    HA: 'Hanni (NewJeans)/Gallery',
    DN: 'Danielle/Gallery',
    HR: 'Haerin (NewJeans)/Gallery',
    HY: 'Hyein (NewJeans)/Gallery'
  },
  group: 'NewJeans/Gallery',

  // Era code → the album page(s) that gallery captions link to, and the album's cover file.
  eras: {
    NE: { page: 'New Jeans (EP)', cover: 'NewJeans New Jeans cover art.png' },
    OM: { page: ['OMG (NewJeans)', 'Ditto'], cover: 'NewJeans OMG cover art.png' },
    GU: { page: ['Get Up (NewJeans)', 'Super Shy'], cover: 'NewJeans Get Up digital cover.png' },
    HS: { page: ['How Sweet', 'Bubble Gum (NewJeans)'], cover: 'NewJeans How Sweet digital album cover.png' }
  },

  // Hand-picked files that replace automatic picks: era → member code (or GRP) → files, one per slot
  // in [album PC, selfie PC, POB, lucky draw] order, with null to keep the automatic pick.
  overrides: {}
};
