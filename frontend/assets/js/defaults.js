// defaults.js - Environment defaults handler
console.log('✅ defaults.js loaded');

// Environment defaults
const defaults = {
  prod: { 
    pods: 3, 
    cpu_req: 100, 
    mem_req: 2000, 
    cpu_lim: 1000, 
    mem_lim: 2000, 
    hpa_min: 3, 
    hpa_max: 64, 
    cpu_trigger: "60%", 
    istio_cpu_req: 250, 
    istio_cpu_lim: 1000, 
    istio_mem_req: 1000, 
    istio_mem_lim: 2000 
  },
  nonprod: { 
    pods: 1, 
    cpu_req: 100, 
    mem_req: 1000, 
    cpu_lim: 1000, 
    mem_lim: 1000, 
    hpa_min: 1, 
    hpa_max: 3, 
    cpu_trigger: "40%", 
    istio_cpu_req: 250, 
    istio_cpu_lim: 1000, 
    istio_mem_req: 1000, 
    istio_mem_lim: 1000 
  }
};

// Copy nonprod defaults for other non-prod environments
["uat","sit","test","sandbox","dev"].forEach(e => { 
  defaults[e] = {...defaults["nonprod"]}; 
});

console.log('Available environments:', Object.keys(defaults));

// Form field mappings
const formFields = {
  pods: "pods",
  cpu_req: "cpu_req",
  mem_req: "mem_req", 
  cpu_lim: "cpu_lim",
  mem_lim: "mem_lim",
  hpa_min: "hpa_min",
  hpa_max: "hpa_max",
  cpu_trigger: "cpu_trigger",
  istio_cpu_req: "istio_cpu_req",
  istio_cpu_lim: "istio_cpu_lim",
  istio_mem_req: "istio_mem_req",
  istio_mem_lim: "istio_mem_lim"
};

/**
 * Populate form with environment defaults
 */
function populateDefaults(env) {
  console.log(`🔄 populateDefaults called for: ${env}`);
  
  if (!defaults[env]) {
    console.error(`❌ No defaults found for environment: ${env}`);
    return;
  }
  
  const envDefaults = defaults[env];
  console.log('📋 Environment defaults:', envDefaults);
  
  let appliedCount = 0;
  
  for (const [key, fieldId] of Object.entries(formFields)) {
    const element = document.getElementById(fieldId);
    if (element && envDefaults[key] !== undefined) {
      element.value = envDefaults[key];
      appliedCount++;
      console.log(`✅ Set ${fieldId} to ${envDefaults[key]}`);
    }
  }
  
  console.log(`🎯 Applied ${appliedCount} default values for ${env}`);
}

/**
 * Initialize environment defaults
 */
function initializeEnvironmentDefaults() {
  console.log('🚀 Initializing environment defaults...');
  
  const envSelect = document.getElementById("envMain");
  if (!envSelect) {
    console.error('❌ envMain element not found!');
    return;
  }
  
  console.log('✅ envMain found, current value:', envSelect.value);
  
  // Populate defaults on page load
  populateDefaults(envSelect.value);
  
  // Add event listener for environment changes
  envSelect.addEventListener("change", (e) => {
    console.log('🔄 Environment changed to:', e.target.value);
    populateDefaults(e.target.value);
  });
  
  console.log('✅ Environment defaults initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEnvironmentDefaults);
} else {
  initializeEnvironmentDefaults();
}

// RIGHT FORM - metaEnv auto-fill Env Group
const metaEnvSelect = document.getElementById("metaEnv");
const envGroupInput = document.getElementById("envGroup");

const envGroups = {
  uat: "Non-Prod",
  sit: "Non-Prod", 
  preprod: "Pre-Prod",
  production: "Prod",
  dev: "Non-Prod",
  sandbox: "Non-Prod"
};

function populateMetaEnv(env) {
  if (envGroupInput) {
    envGroupInput.value = envGroups[env] || "";
    console.log(`✅ Set envGroup to: ${envGroupInput.value}`);
  }
}

// Initialize meta env
if (metaEnvSelect) {
  populateMetaEnv(metaEnvSelect.value);
  metaEnvSelect.addEventListener("change", (e) => {
    populateMetaEnv(e.target.value);
  });
}

// Make functions available globally for testing
window.populateDefaults = populateDefaults;
window.testDefaults = function(env = 'prod') {
  console.log('🧪 TEST: Manually setting defaults for', env);
  populateDefaults(env);
};