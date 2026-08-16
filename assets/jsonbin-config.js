/**
 * Official Keanu Reeves Fans Hub — JSONBin configuration
 * Shared by public pages and the separate Admin dashboard.
 * Do not expose Master Key on pure public CDNs if possible;
 * here it is required for the requested full client-side sync.
 */
window.JSONBIN_CONFIG = {
  binId: "6a81dbbdda38895dfeebbec8",
  // Master key (full read/write) — used by Admin and by hub-api for writes
  masterKey: "$2a$10$FJfxhIbtNhSwgp72BsHATehx71.09IUcow6ee56NzzBi5VP4x5N0S",
  // Access key
  accessKey: "$2a$10$SuOrEA0ZRPDdZ3jzd2pBw.EZg/WnXnrSB/sfIVAMSuw1N2e5cISwe",
  baseUrl: "https://api.jsonbin.io/v3/b"
};

// Default empty record shape
window.JSONBIN_DEFAULT = {
  applications: [],
  payments: [],
  quizScores: [],
  messages: [],
  accessCodes: [],
  gift_photos: [],
  records: []
};
