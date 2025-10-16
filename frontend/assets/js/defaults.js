// Default values per environment
const defaults = {
  prod: { pods: 3, cpu_req: 100, mem_req: 2000, cpu_lim: 1000, mem_lim: 2000, hpa_min: 3, hpa_max: 64, cpu_trigger: "60%", istio_cpu_req: 250, istio_cpu_lim: 1000, istio_mem_req: 1000, istio_mem_lim: 2000 },
  nonprod: { pods: 1, cpu_req: 100, mem_req: 1000, cpu_lim: 1000, mem_lim: 1000, hpa_min: 1, hpa_max: 3, cpu_trigger: "40%", istio_cpu_req: 250, istio_cpu_lim: 1000, istio_mem_req: 1000, istio_mem_lim: 1000 }
};

// Copy nonprod defaults for other non-prod environments
["uat","sit","test","sandbox","dev"].forEach(e => { defaults[e] = {...defaults["nonprod"]}; });

// LEFT FORM
const envSelect = document.getElementById("envMain");
const formFields = {
  pods: document.getElementById("pods"),
  cpu_req: document.getElementById("cpu_req"),
  mem_req: document.getElementById("mem_req"),
  cpu_lim: document.getElementById("cpu_lim"),
  mem_lim: document.getElementById("mem_lim"),
  hpa_min: document.getElementById("hpa_min"),
  hpa_max: document.getElementById("hpa_max"),
  cpu_trigger: document.getElementById("cpu_trigger"),
  istio_cpu_req: document.getElementById("istio_cpu_req"),
  istio_cpu_lim: document.getElementById("istio_cpu_lim"),
  istio_mem_req: document.getElementById("istio_mem_req"),
  istio_mem_lim: document.getElementById("istio_mem_lim")
};

// Populate function
function populateDefaults(env) {
  if (!defaults[env]) return;
  const def = defaults[env];
  for (const key in formFields) {
    if (formFields[key]) formFields[key].value = def[key];
  }
}

// On page load
populateDefaults(envSelect.value);

// When environment changes
envSelect.addEventListener("change", (e) => {
  populateDefaults(e.target.value);
});

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
  envGroupInput.value = envGroups[env] || "";
}

// On page load
populateMetaEnv(metaEnvSelect.value);

// When metaEnv changes
metaEnvSelect.addEventListener("change", (e) => {
  populateMetaEnv(e.target.value);
});
