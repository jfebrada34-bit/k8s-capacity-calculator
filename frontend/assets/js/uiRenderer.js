import { STANDARD_PRICING, getBufferedCpu, getStandardSize } from "./calculatorCore.js";

let results = [];
let finalizeModal;

// Expose overrideSize for inline select
window.overrideSize = function(selectEl) {
  const idx = parseInt(selectEl.dataset.idx);
  if (!results[idx]) return;
  results[idx].override_size = selectEl.value;
  renderResults();
};

// Allow external module to update results array
export function setResultsArray(arr) {
  results = arr;
}

// Initialize finalize modal
export function initializeModal() {
  const modalEl = document.getElementById("finalizeModal");
  finalizeModal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
  modalEl.addEventListener("hidden.bs.modal", () => {
    modalEl.querySelector("tbody").innerHTML = "";
  });
}

// Render table results grouped by environment
export function renderResults() {
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

    let html = `<h5>Environment: ${env.toUpperCase()}</h5>
      <div class="table-responsive">
      <table class="table table-bordered table-sm align-middle">
      <thead>
        <tr>
          <th>ENV</th>
          <th>Cluster Name</th>
          <th>Namespace</th>
          <th>Number of Pods</th>
          <th>Pod Specs</th>
          <th>CPU Request</th>
          <th>Mem Request</th>
          <th>CPU Lim</th>
          <th>Mem Lim</th>
          <th>HPA Min</th>
          <th>HPA Max</th>
          <th>CPU Trigger</th>
          <th>Istio Y/N</th>
          <th># CPU Request</th>
          <th>CPU Lim</th>
          <th>Mem Req</th>
          <th>Mem Lim</th>
          <th>Total CPU</th>
          <th>Recommended Size</th>
        </tr>
      </thead>
      <tbody>`;

    list.forEach((ns, idx) => {
      totalMonthlyCost += ns.monthlyCost;

      html += `<tr>
        <td>${ns.env}</td>
        <td>${ns.cluster}</td>
        <td>${ns.namespace}</td>
        <td>${ns.pods}</td>
        <td>${ns.cpu_req}m / ${ns.mem_req}MB</td>
        <td>${ns.cpu_req}</td>
        <td>${ns.mem_req}</td>
        <td>${ns.cpu_lim}</td>
        <td>${ns.mem_lim}</td>
        <td>${ns.hpa_min}</td>
        <td>${ns.hpa_max}</td>
        <td>${ns.cpu_trigger}</td>
        <td>${ns.istio}</td>
        <td>${ns.cpu_req}</td>
        <td>${ns.cpu_lim}</td>
        <td>${ns.mem_req}</td>
        <td>${ns.mem_lim}</td>
        <td>${ns.cpuCoresTotal.toFixed(0)}</td>
        <td>
          <select class="form-select form-select-sm" data-idx="${idx}" onchange="window.overrideSize(this)">
            ${Object.keys(STANDARD_PRICING).map(size =>
              `<option value="${size}" ${size === ns.recommendedSize ? 'selected' : ''}>${size}</option>`
            ).join('')}
          </select>
        </td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    container.insertAdjacentHTML("beforeend", html);
  }
}

// Show finalize modal with cost summary
export function showFinalizeModal(resultsArr) {
  const tbody = document.querySelector("#finalizeModal tbody");
  tbody.innerHTML = "";
  resultsArr.forEach(ns => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${ns.env}</td><td>${ns.cluster}</td><td>${ns.namespace}</td>
      <td>${ns.pods}</td>
      <td>${ns.cpu_req}m / ${ns.mem_req}MB</td>
      <td>${ns.cpuCoresTotal.toFixed(0)}</td>
      <td>${ns.recommendedSize}</td>
      <td>${ns.monthlyCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
      <td>${ns.annualCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>`;
    tbody.appendChild(tr);
  });
  finalizeModal.show();
}
