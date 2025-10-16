async function loadDefaults(env) {
  try {
    const response = await fetch("/assets/config/defaults.json");
    if (!response.ok) throw new Error("Failed to fetch defaults.json");

    const defaults = await response.json();

    // If env maps to another env string, resolve it (e.g., "dev": "nonprod")
    const resolvedEnv = typeof defaults[env] === "string" ? defaults[defaults[env]] : defaults[env];

    if (!resolvedEnv) {
      console.warn(`No defaults found for env: ${env}, using empty defaults.`);
      return {};
    }

    return resolvedEnv;
  } catch (error) {
    console.error("Error loading defaults:", error);
    return {};
  }
}

// Usage example:
const currentEnv = new URLSearchParams(window.location.search).get("env") || "prod";

loadDefaults(currentEnv).then(config => {
  console.log("Loaded defaults for env:", currentEnv, config);
  // Now you can use config.cpu, config.memory, etc.
});
