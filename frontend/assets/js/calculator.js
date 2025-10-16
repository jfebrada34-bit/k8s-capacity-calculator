let results = [];

const STANDARD_PRICING = {
  "S": { cpu_max: 8, monthly: 413.46 },
  "M": { cpu_max: 16, monthly: 583.84 },
  "L": { cpu_max: 32, monthly: 1102.56 },
  "XL": { cpu_max: 64, monthly: 2205.12 }
};

// Apply 30% buffer to total CPU
function getBufferedCpu(cpuCore) {
  return Math.ceil(cpuCore * 1.3);
}

// Return recommended standard size based on buffered CPU
function getStandardSize(cpuBuffered) {
  for (const [size, info] of Object.entries(STANDARD_PRICING)) {
    if (cpuBuffered <= info.cpu_max) return size;
  }
  return "XL";
}

// Render namespace tables grouped by environment
function renderResults() {
  const container = document.getElementById("results-section");
  container.innerHTML = "";

  if (!results.length) return;

  const envGroups = {};
  results.forEach(ns => {
    if (!envGroups[ns.env]) envGroups[ns.env] = [];
    envGroups[ns.env].push(ns);
  });

  for (const [env, list] of Object.entries(envGroups)) {
    let totalMonthlyCost = 0;

    let html = `<h5 class="env-heading">Environment: ${env.toUpperCase()}</h5>`;
    html += `<div class="table-responsive">
      <table class="table table-bordered table-sm align-middle">
        <thead class="table-light">
          <tr>
            <th>Cluster</th>
            <th>Namespace</th>
            <th>Pods</th>
            <th>Pod Specs</th>
            <th>CPU Req (m)</th>
            <th>Mem Req (MB)</th>
            <th>CPU Lim (m)</th>
            <th>Mem Lim (MB)</th>
            <th>HPA Min</th>
            <th>HPA Max</th>
            <th>CPU Trigger</th>
            <th>Istio</th>
            <th>Istio CPU Req</th>
            <th>Istio CPU Lim</th>
            <th>Istio Mem Req</th>
            <th>Istio Mem Lim</th>
            <th>CPU Cores (total)</th>
            <th>Recommended Size</th>
          </tr>
        </thead>
        <tbody>`;

    list.forEach(ns => {
      if (!ns.cpu_req) ns.cpu_req = ns.env === "prod" ? 120000 : 6000;

      const cpuCoresTotal = (ns.pods * ns.cpu_req) / 1000;
      const podSpecs = `${ns.cpu_req}m / ${ns.mem_req}MB`;
      const bufferedCpu = getBufferedCpu(cpuCoresTotal);
      const recommendedSize = ns.override_size || getStandardSize(bufferedCpu);
      const costPerNs = STANDARD_PRICING[recommendedSize]?.monthly || 0;

      totalMonthlyCost += costPerNs;

      html += `<tr>
        <td>${ns.cluster}</td>
        <td>${ns.namespace}</td>
        <td>${ns.pods}</td>
        <td>${podSpecs}</td>
        <td>${ns.cpu_req}</td>
        <td>${ns.mem_req}</td>
        <td>${ns.cpu_lim}</td>
        <td>${ns.mem_lim}</td>
        <td>${ns.hpa_min}</td>
        <td>${ns.hpa_max}</td>
        <td>${ns.cpu_trigger}</td>
        <td>${ns.istio}</td>
        <td>${ns.istio_cpu_req}</td>
        <td>${ns.istio_cpu_lim}</td>
        <td>${ns.istio_mem_req}</td>
        <td>${ns.istio_mem_lim}</td>
        <td>${cpuCoresTotal.toFixed(0)}</td>
        <td>
          <select class="form-select form-select-sm" data-idx="${results.indexOf(ns)}" onchange="overrideSize(this)">
            ${Object.keys(STANDARD_PRICING).map(size =>
              `<option value="${size}" ${size === recommendedSize ? 'selected' : ''}>${size}</option>`
            ).join('')}
          </select>
        </td>
      </tr>`;
    });

    html += `</tbody></table></div>`;

    const totalMonthlyCostFormatted = totalMonthlyCost.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    const totalAnnualCostFormatted = (totalMonthlyCost * 12).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });

    html += `<div class="summary-card text-end">
      <strong>Total Monthly Cost (USD):</strong> ${totalMonthlyCostFormatted}<br>
      <strong>Total Annual Cost (USD):</strong> ${totalAnnualCostFormatted}
    </div>`;

    container.insertAdjacentHTML("beforeend", html);
  }
}

// Handle T-shirt size override
function overrideSize(selectEl) {
  const idx = parseInt(selectEl.getAttribute('data-idx'));
  results[idx].override_size = selectEl.value;
  renderResults();
}

// Add namespace
function addNamespace() {
  const env = document.getElementById("envMain").value;

  let cpu_req_val = parseInt(document.getElementById("cpu_req").value);
  if (!cpu_req_val || cpu_req_val <= 0) {
    cpu_req_val = env === "prod" ? 120000 : 6000;
  }

  const ns = {
    env: env,
    cluster: document.getElementById("cluster").value,
    namespace: document.getElementById("namespace").value,
    pods: parseInt(document.getElementById("pods").value) || 1,
    cpu_req: cpu_req_val,
    mem_req: parseInt(document.getElementById("mem_req").value) || 0,
    cpu_lim: parseInt(document.getElementById("cpu_lim").value) || 0,
    mem_lim: parseInt(document.getElementById("mem_lim").value) || 0,
    hpa_min: parseInt(document.getElementById("hpa_min").value) || 1,
    hpa_max: parseInt(document.getElementById("hpa_max").value) || 1,
    cpu_trigger: document.getElementById("cpu_trigger").value || "",
    istio: document.getElementById("istio").value,
    istio_cpu_req: parseInt(document.getElementById("istio_cpu_req").value) || 0,
    istio_cpu_lim: parseInt(document.getElementById("istio_cpu_lim").value) || 0,
    istio_mem_req: parseInt(document.getElementById("istio_mem_req").value) || 0,
    istio_mem_lim: parseInt(document.getElementById("istio_mem_lim").value) || 0
  };

  if (!ns.namespace) {
    alert("Namespace is required");
    return;
  }

  results.push(ns);
  renderResults();
}

// Reset table
function resetTable() {
  results = [];
  document.getElementById("results-section").innerHTML = "";
}

// Initialize finalize modal once
const modalEl = document.getElementById("finalizeModal");
const finalizeModal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });

// Clear modal table when closed
modalEl.addEventListener("hidden.bs.modal", () => {
  const tbody = modalEl.querySelector("tbody");
  if (tbody) tbody.innerHTML = "";
});

// Finalize Cost modal
function finalizeCost() {
  const tbody = modalEl.querySelector("tbody");
  tbody.innerHTML = "";

  results.forEach(ns => {
    const totalCpuCores = (ns.pods * ns.cpu_req) / 1000;
    const bufferedCpu = getBufferedCpu(totalCpuCores);
    const recommendedSize = ns.override_size || getStandardSize(bufferedCpu);
    const monthlyCost = STANDARD_PRICING[recommendedSize]?.monthly || 0;
    const annualCost = monthlyCost * 12;

    // Placeholder data for extra columns
    const clusterName = ns.cluster || "N/A";
    const defaultProvisioners = 10000;
    const pdb = "minUnavailable = 1";
    const k8sVersion = "v1.32";
    const totalNodeCount = Math.ceil(bufferedCpu / 4);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${clusterName}</td>
      <td>${defaultProvisioners}</td>
      <td>${pdb}</td>
      <td>${k8sVersion}</td>
      <td>${ns.namespace}</td>
      <td>${totalCpuCores.toFixed(0)}</td>
      <td>${bufferedCpu}</td>
      <td>${totalNodeCount}</td>
      <td>${monthlyCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
      <td>${annualCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
    `;
    tbody.appendChild(tr);
  });

  finalizeModal.show();
}

// Event listeners
document.getElementById("btnAdd").addEventListener("click", addNamespace);
document.getElementById("btnReset").addEventListener("click", resetTable);
document.getElementById("btnFinalize").addEventListener("click", finalizeCost);
