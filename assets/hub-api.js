/**
 * hub-api.js — Shared JSONBin helpers for Official Keanu Reeves Fans Hub
 * Everything is stored in the single bin. No localStorage.
 */
(function (global) {
  "use strict";

  const CFG = global.JSONBIN_CONFIG || {};
  const BIN_ID = CFG.binId || "6a81dbbdda38895dfeebbec8";
  const MASTER = CFG.masterKey || "";
  const ACCESS = CFG.accessKey || "";
  const BASE = (CFG.baseUrl || "https://api.jsonbin.io/v3/b") + "/" + BIN_ID;

  function headers(write) {
    const h = {
      "Content-Type": "application/json",
      "X-Bin-Meta": "false"
    };
    // Prefer master key for reliable read/write of private bins
    if (MASTER) h["X-Master-Key"] = MASTER;
    else if (ACCESS) h["X-Access-Key"] = ACCESS;
    return h;
  }

  function fetchWithTimeout(url, opts, ms) {
    ms = ms || 18000; // 18s – tolerant for slower mobile / international networks
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(function () {
      if (controller) controller.abort();
    }, ms);
    const finalOpts = Object.assign({}, opts || {});
    if (controller) finalOpts.signal = controller.signal;
    return fetch(url, finalOpts).finally(function () { clearTimeout(timer); });
  }

  async function rawFetch(method, url, body) {
    const opts = {
      method: method,
      headers: headers(method !== "GET"),
      cache: "no-store"
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    let res;
    try {
      res = await fetchWithTimeout(url, opts, 18000);
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("Network timeout – please check your connection and try again.");
      }
      throw new Error("Network error – the server could not be reached. Try again on a better connection.");
    }
    if (!res.ok) {
      const text = await res.text().catch(function () { return ""; });
      throw new Error("JSONBin " + method + " failed: " + res.status + " " + text.slice(0, 120));
    }
    return res.json();
  }

  /** Read the full bin record */
  async function loadFromJsonBin() {
    const data = await rawFetch("GET", BASE + "/latest");
    const record = (data && data.record) ? data.record : data;
    if (!record || typeof record !== "object") {
      return Object.assign({}, global.JSONBIN_DEFAULT || {});
    }
    // Ensure arrays exist
    ["applications", "payments", "quizScores", "messages", "accessCodes", "gift_photos"].forEach(function (k) {
      if (!Array.isArray(record[k])) record[k] = [];
    });
    return record;
  }

  /** Overwrite the entire bin (atomic for this use-case) */
  async function saveFullRecord(record) {
    // Keep shape clean
    const payload = {
      applications: record.applications || [],
      payments: record.payments || [],
      quizScores: record.quizScores || [],
      messages: record.messages || [],
      accessCodes: record.accessCodes || [],
      gift_photos: record.gift_photos || [],
      records: record.records || [],
      updatedAt: new Date().toISOString()
    };
    await rawFetch("PUT", BASE, payload);
    return payload;
  }

  /** Push an item into a named array key */
  async function pushToBucket(bucket, item) {
    const data = await loadFromJsonBin();
    if (!Array.isArray(data[bucket])) data[bucket] = [];
    data[bucket].unshift(item); // newest first
    // soft limit to keep bin size reasonable
    if (data[bucket].length > 500) data[bucket] = data[bucket].slice(0, 500);
    await saveFullRecord(data);
    return item;
  }

  // ── Public helpers used by pages ──────────────────────────────────────

  global.loadFromJsonBin = loadFromJsonBin;
  global.saveFullRecord = saveFullRecord;

  /** Generic save into a bucket */
  global.saveToJsonBin = async function (bucket, item) {
    return pushToBucket(bucket, item);
  };

  /** Application form submission (all pathway pages) */
  global.saveApplication = async function (payload) {
    const entry = Object.assign({
      id: "app_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      type: "application",
      status: "received",
      createdAt: new Date().toISOString(),
      referenceId: "KR-" + Date.now().toString(36).toUpperCase()
    }, payload);
    return pushToBucket("applications", entry);
  };

  // Alias used by older pathway pages
  global.saveSubmission = global.saveApplication;

  /** Payment request (bank / paypal / zelle / cashapp / gift / crypto) */
  global.savePaymentRequest = async function (payload) {
    const entry = Object.assign({
      id: "pay_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      type: "payment_request",
      status: "pending",
      createdAt: new Date().toISOString()
    }, payload);
    return pushToBucket("payments", entry);
  };

  /** Quiz / Fans Appreciation score */
  global.saveQuizScore = async function (payload) {
    const entry = Object.assign({
      id: "quiz_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      type: "quiz_score",
      createdAt: new Date().toISOString()
    }, payload);
    return pushToBucket("quizScores", entry);
  };

  /** Admin → user message log */
  global.saveMessage = async function (payload) {
    const entry = Object.assign({
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      type: "message",
      createdAt: new Date().toISOString()
    }, payload);
    return pushToBucket("messages", entry);
  };

  // ── Access codes (one-time, with expiry) ──────────────────────────────

  function randomCode(len) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < (len || 8); i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  /** Admin: generate a fresh one-time code (default 48 h expiry) */
  global.generateAccessCode = async function (opts) {
    opts = opts || {};
    const hours = opts.expiresInHours != null ? opts.expiresInHours : 48;
    const code = (opts.code || randomCode(8)).toUpperCase();
    const now = Date.now();
    const entry = {
      code: code,
      used: false,
      usedBy: null,
      usedAt: null,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + hours * 3600 * 1000).toISOString(),
      note: opts.note || ""
    };
    const data = await loadFromJsonBin();
    // prevent duplicates
    if ((data.accessCodes || []).some(function (c) { return c.code === code && !c.used; })) {
      return global.generateAccessCode(opts); // rare collision
    }
    data.accessCodes = data.accessCodes || [];
    data.accessCodes.unshift(entry);
    if (data.accessCodes.length > 300) data.accessCodes = data.accessCodes.slice(0, 300);
    await saveFullRecord(data);
    return entry;
  };

  /**
   * Validate a code for the Fans Appreciation gate.
   * Returns { ok: true } or { ok: false, reason: "used"|"expired"|"invalid"|"missing" }
   * Does NOT mark as used yet — that happens after the quiz finishes.
   */
  global.validateAccessCode = async function (rawCode) {
    const code = (rawCode || "").trim().toUpperCase();
    if (!code) return { ok: false, reason: "missing" };
    const data = await loadFromJsonBin();
    const list = data.accessCodes || [];
    const found = list.find(function (c) { return c.code === code; });
    if (!found) return { ok: false, reason: "invalid" };
    if (found.used) return { ok: false, reason: "used" };
    if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, entry: found };
  };

  /**
   * Mark a code as used (call after successful entry / quiz start or finish).
   * Returns true if successfully marked, false if already used / missing.
   */
  global.markCodeUsedBy = async function (rawCode, usedBy) {
    const code = (rawCode || "").trim().toUpperCase();
    if (!code) return false;
    const data = await loadFromJsonBin();
    const list = data.accessCodes || [];
    const idx = list.findIndex(function (c) { return c.code === code; });
    if (idx < 0) return false;
    if (list[idx].used) return false;
    list[idx].used = true;
    list[idx].usedBy = usedBy || "anonymous";
    list[idx].usedAt = new Date().toISOString();
    data.accessCodes = list;
    await saveFullRecord(data);
    return true;
  };

  /** Gift photo upload helper (base64 stored in bin — keep images small) */
  global.submitFansGiftPhoto = async function (file, meta) {
    meta = meta || {};
    if (!file) throw new Error("No file");
    if (file.size > 2.2 * 1024 * 1024) throw new Error("Image must be under 2.2 MB");
    const dataUrl = await new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    return pushToBucket("gift_photos", {
      type: "gift_photo",
      status: "new",
      createdAt: new Date().toISOString(),
      filename: file.name,
      mimeType: file.type,
      imageData: dataUrl,
      giftCode: meta.giftCode || "",
      page: meta.page || ""
    });
  };

  // Convenience for status page lookups
  global.findByReference = async function (ref) {
    const data = await loadFromJsonBin();
    const all = []
      .concat(data.applications || [])
      .concat(data.payments || [])
      .concat(data.quizScores || []);
    const needle = String(ref || "").toLowerCase();
    return all.find(function (x) {
      return String(x.referenceId || x.reference || x.id || x.tokenId || "").toLowerCase() === needle;
    }) || null;
  };

})(typeof window !== "undefined" ? window : globalThis);
