// assets/js/configLoader.js

export let CALC_DEFAULTS = {};
export let STANDARD_PRICING = {};

const CONFIG_PATHS = {
  defaults: "assets/config/calculatorDefaults.json",
  pricing: "assets/config/pricing.json"
};

let configCache = null;

export async function loadConfig(forceReload = false) {
  // ✅ Return from cache if already loaded
  if (configCache && !forceReload) {
    console.log("⚡ Using cached configs");
    return configCache;
  }

  try {
    console.log("🔄 Loading config files...");

    const [defaultsRes, pricingRes] = await Promise.all([
      fetch(CONFIG_PATHS.defaults).then(checkStatus),
      fetch(CONFIG_PATHS.pricing).then(checkStatus)
    ]);

    const [defaultsData, pricingData] = await Promise.all([
      defaultsRes.json(),
      pricingRes.json()
    ]);

    CALC_DEFAULTS = defaultsData.defaults || defaultsData;
    STANDARD_PRICING = pricingData.pricing || pricingData;

    // ✅ Store in cache
    configCache = { CALC_DEFAULTS, STANDARD_PRICING };

    console.log("✅ Configs successfully loaded", configCache);
    return configCache;
  } catch (err) {
    console.error("❌ Failed to load config files:", err);
    showConfigError("Error loading configuration files. Please check console.");
    return null;
  }
}

/**
 * Utility: checks fetch status
 */
function checkStatus(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.url}`);
  return res;
}

/**
 * Optional: show user-friendly message on UI
 */
function showConfigError(message) {
  const container = document.getElementById("configError") || document.body;
  const msg = document.createElement("div");
  msg.style.cssText = `
    background: #ffe0e0; color: #900; padding: 8px; margin: 8px 0;
    border: 1px solid #f88; border-radius: 6px; text-align: center;
  `;
  msg.textContent = message;
  container.prepend(msg);
}
