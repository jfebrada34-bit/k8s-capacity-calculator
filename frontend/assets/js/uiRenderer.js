import { STANDARD_PRICING, getBufferedCpu, getStandardSize, calculateNamespaceCost } from "./calculatorCore.js";

// Configuration constants
const CONFIG = {
  DEBOUNCE_DELAY: 100,
  LARGE_DATASET_THRESHOLD: 100,
  CURRENCY_FORMAT: { style: 'currency', currency: 'USD' }
};

// Table column configuration
const TABLE_COLUMNS = [
  { key: 'env', label: 'ENV' },
  { key: 'cluster', label: 'Cluster Name' },
  { key: 'namespace', label: 'Namespace' },
  { key: 'pods', label: 'Number of Pods' },
  { key: 'specs', label: 'Pod Specs' },
  { key: 'cpu_req', label: 'CPU Request' },
  { key: 'mem_req', label: 'Mem Request' },
  { key: 'cpu_lim', label: 'CPU Lim' },
  { key: 'mem_lim', label: 'Mem Lim' },
  { key: 'hpa_min', label: 'HPA Min' },
  { key: 'hpa_max', label: 'HPA Max' },
  { key: 'cpu_trigger', label: 'CPU Trigger' },
  { key: 'istio', label: 'Istio Y/N' },
  { key: 'cpu_req_num', label: 'Istio CPU Request' },
  { key: 'cpu_lim_num', label: 'Istio CPU Lim' },
  { key: 'mem_req_num', label: 'Istio Mem Req' },
  { key: 'mem_lim_num', label: 'Istio Mem Lim' },
  { key: 'total_cpu', label: 'Total CPU' },
  { key: 'recommended_size', label: 'Recommended Size' }
];

let results = [];
let finalizeModal;
let renderTimeout;

/**
 * @typedef {Object} NamespaceResult
 * @property {string} env
 * @property {string} cluster
 * @property {string} namespace
 * @property {number} pods
 * @property {number} cpu_req
 * @property {number} mem_req
 * @property {number} cpu_lim
 * @property {number} mem_lim
 * @property {number} hpa_min
 * @property {number} hpa_max
 * @property {number} cpu_trigger
 * @property {boolean} istio
 * @property {number} cpuCoresTotal
 * @property {string} recommendedSize
 * @property {number} monthlyCost
 * @property {number} annualCost
 * @property {string} [override_size]
 */

// Fixed overrideSize function that recalculates costs
window.overrideSize = function(selectEl) {
  const namespaceId = parseInt(selectEl.getAttribute("data-id"));
  const newSize = selectEl.value;

  console.log('Override size called:', { namespaceId, newSize });

  const namespaceIndex = results.findIndex(ns => ns.id === namespaceId);
  if (namespaceIndex !== -1) {
    // Update the override size
    results[namespaceIndex].override_size = newSize;
    
    // Recalculate the costs with the new size
    const recalculatedNs = calculateNamespaceCost(results[namespaceIndex]);
    
    // Update the results array with recalculated values
    results[namespaceIndex] = recalculatedNs;
    
    // Re-render the results with updated costs
    renderResults();
    
    console.log('Size override applied:', recalculatedNs);
  } else {
    console.error('Namespace not found for ID:', namespaceId);
  }
};

// Allow external module to update results array with validation
export function setResultsArray(arr) {
  if (!Array.isArray(arr)) {
    console.error('setResultsArray: Expected array, got:', typeof arr);
    return;
  }
  
  if (!arr.every(item => item.env && item.namespace)) {
    console.error('setResultsArray: Invalid data structure - missing required fields');
    return;
  }
  
  results = arr;
}

// Initialize finalize modal with error handling
export function initializeModal() {
  try {
    const modalEl = document.getElementById("finalizeModal");
    if (!modalEl) {
      throw new Error('finalizeModal element not found in DOM');
    }
    
    finalizeModal = new bootstrap.Modal(modalEl, { 
      backdrop: true, 
      keyboard: true 
    });
    
    modalEl.addEventListener("hidden.bs.modal", cleanupModal);
    console.log('Finalize modal initialized successfully');
  } catch (error) {
    console.error('Failed to initialize modal:', error);
  }
}

// Cleanup modal content
function cleanupModal() {
  const tbody = document.querySelector("#finalizeModal tbody");
  if (tbody) {
    tbody.innerHTML = "";
  }
}

// Debounced render function
export function renderResults() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    _renderResults();
  }, CONFIG.DEBOUNCE_DELAY);
}

// Main render function
function _renderResults() {
  try {
    const container = document.getElementById("results-section");
    if (!container) {
      throw new Error('results-section element not found');
    }
    
    container.innerHTML = "";
    
    if (!results || !results.length) {
      container.innerHTML = '<div class="alert alert-info">No results to display</div>';
      return;
    }

    // For large datasets, use virtual rendering
    if (results.length > CONFIG.LARGE_DATASET_THRESHOLD) {
      renderVirtualTable(container, results);
    } else {
      renderFullTable(container, results);
    }
    
    // Render cost summary
    renderCostSummary(container);
    
  } catch (error) {
    console.error('Error rendering results:', error);
    const container = document.getElementById("results-section");
    if (container) {
      container.innerHTML = `<div class="alert alert-danger">Error displaying results: ${error.message}</div>`;
    }
  }
}

// Render full table for normal datasets
function renderFullTable(container, results) {
  const envGroups = groupResultsByEnvironment(results);
  
  for (const [env, list] of Object.entries(envGroups)) {
    const tableHtml = createEnvironmentTable(env, list);
    container.insertAdjacentHTML("beforeend", tableHtml);
  }
}

// Group results by environment
function groupResultsByEnvironment(results) {
  const envGroups = {};
  results.forEach(ns => {
    if (!envGroups[ns.env]) envGroups[ns.env] = [];
    envGroups[ns.env].push(ns);
  });
  return envGroups;
}

// Create table for a specific environment
function createEnvironmentTable(env, namespaces) {
  const totalMonthlyCost = namespaces.reduce((sum, ns) => sum + ns.monthlyCost, 0);
  const totalAnnualCost = namespaces.reduce((sum, ns) => sum + ns.annualCost, 0);
  
  return `
    <div class="environment-section mb-4">
      <h5 class="mb-3">
        Environment: ${env.toUpperCase()} 
        <small class="text-muted">
          (Monthly: ${totalMonthlyCost.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)} | 
          Annual: ${totalAnnualCost.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)})
        </small>
      </h5>
      <div class="table-responsive">
        <table class="table table-bordered table-sm align-middle table-hover">
          <thead class="table-light">
            <tr>
              ${TABLE_COLUMNS.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${namespaces.map(ns => renderNamespaceRow(ns)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Render individual namespace row - FIXED CPU CALCULATION & STATIC POD SPECS
function renderNamespaceRow(ns) {
  const currentSize = ns.override_size || ns.recommendedSize;
  const monthlyCost = ns.monthlyCost || 0;
  const annualCost = ns.annualCost || 0;
  
  // DEFAULT TOTAL CPU CALCULATION BASED ON ENVIRONMENT
  let totalCpuDisplay;
  if (ns.env === 'prod' || ns.env === 'production') {
    // Production: 128000
    totalCpuDisplay = '128000';
  } else {
    // Non-production (nonprod, uat, sit, test, sandbox, dev): 6000
    totalCpuDisplay = '6000';
  }
  
  console.log(`🔍 Total CPU for ${ns.env}: ${totalCpuDisplay}`);
  
  // STATIC POD SPECS - Always show standard pod specs regardless of environment
  const staticPodSpecs = "1000m / 4096MB";
  
  return `
    <tr>
      <td>${escapeHtml(ns.env)}</td>
      <td>${escapeHtml(ns.cluster)}</td>
      <td>${escapeHtml(ns.namespace)}</td>
      <td>${ns.pods}</td>
      <td>${staticPodSpecs}</td>
      <td>${ns.cpu_req}</td>
      <td>${ns.mem_req}</td>
      <td>${ns.cpu_lim}</td>
      <td>${ns.mem_lim}</td>
      <td>${ns.hpa_min}</td>
      <td>${ns.hpa_max}</td>
      <td>${ns.cpu_trigger}</td>
      <td>${ns.istio ? 'Yes' : 'No'}</td>
      <td>${ns.istio_cpu_req || 0}</td>
      <td>${ns.istio_cpu_lim || 0}</td>
      <td>${ns.istio_mem_req || 0}</td>
      <td>${ns.istio_mem_lim || 0}</td>
      <td>${totalCpuDisplay}</td>
      <td>
        <select class="form-select form-select-sm size-dropdown" 
                data-id="${ns.id}" 
                onchange="window.overrideSize(this)">
          ${renderSizeOptions(currentSize, monthlyCost)}
        </select>
        <small class="text-muted d-block mt-1">
          Cost: ${monthlyCost.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}/mo
        </small>
      </td>
    </tr>
  `;
}

// Render size options for dropdown with pricing info
function renderSizeOptions(currentSize, currentMonthlyCost) {
  return Object.entries(STANDARD_PRICING)
    .map(([size, info]) => {
      const isSelected = size === currentSize;
      const costDiff = info.monthly - currentMonthlyCost;
      const costIndicator = costDiff !== 0 ? 
        ` (${costDiff > 0 ? '+' : ''}${costDiff.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)})` : '';
      
      return `
        <option value="${escapeHtml(size)}" ${isSelected ? 'selected' : ''}
                data-monthly="${info.monthly}">
          ${escapeHtml(size)} - ${info.monthly.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}/mo${costIndicator}
        </option>
      `;
    }).join('');
}

// Render overall cost summary
function renderCostSummary(container) {
  const totalMonthly = results.reduce((sum, ns) => sum + (ns.monthlyCost || 0), 0);
  const totalAnnual = results.reduce((sum, ns) => sum + (ns.annualCost || 0), 0);
  const namespaceCount = results.length;
  
  const summaryHtml = `
    <div class="card mt-4">
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0">Total Cost Summary</h5>
      </div>
      <div class="card-body">
        <div class="row text-center">
          <div class="col-md-3">
            <h6>Namespaces</h6>
            <h4 class="text-primary">${namespaceCount}</h4>
          </div>
          <div class="col-md-3">
            <h6>Monthly Cost</h6>
            <h4 class="text-success">${totalMonthly.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</h4>
          </div>
          <div class="col-md-3">
            <h6>Annual Cost</h6>
            <h4 class="text-info">${totalAnnual.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</h4>
          </div>
          <div class="col-md-3">
            <h6>Average Monthly</h6>
            <h4 class="text-warning">${namespaceCount > 0 ? (totalMonthly / namespaceCount).toLocaleString('en-US', CONFIG.CURRENCY_FORMAT) : '$0.00'}</h4>
          </div>
        </div>
        ${renderCostBreakdown()}
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML("beforeend", summaryHtml);
}

// Render cost breakdown by size
function renderCostBreakdown() {
  const sizeBreakdown = {};
  let totalMonthly = 0;
  
  results.forEach(ns => {
    const size = ns.override_size || ns.recommendedSize;
    if (!sizeBreakdown[size]) {
      sizeBreakdown[size] = {
        count: 0,
        monthly: 0,
        annual: 0
      };
    }
    
    sizeBreakdown[size].count++;
    sizeBreakdown[size].monthly += ns.monthlyCost || 0;
    sizeBreakdown[size].annual += ns.annualCost || 0;
    totalMonthly += ns.monthlyCost || 0;
  });
  
  if (Object.keys(sizeBreakdown).length === 0) return '';
  
  let breakdownHtml = `
    <div class="mt-4">
      <h6>Cost Breakdown by Instance Size</h6>
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead class="table-light">
            <tr>
              <th>Instance Size</th>
              <th>Namespace Count</th>
              <th>Monthly Cost</th>
              <th>Annual Cost</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  Object.entries(sizeBreakdown).forEach(([size, data]) => {
    const percentage = totalMonthly > 0 ? (data.monthly / totalMonthly * 100).toFixed(1) : 0;
    
    breakdownHtml += `
      <tr>
        <td><strong>${escapeHtml(size)}</strong></td>
        <td>${data.count}</td>
        <td>${data.monthly.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</td>
        <td>${data.annual.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</td>
        <td>${percentage}%</td>
      </tr>
    `;
  });
  
  breakdownHtml += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  return breakdownHtml;
}

// Basic virtual table implementation for large datasets
function renderVirtualTable(container, results) {
  container.innerHTML = `
    <div class="alert alert-warning">
      <i class="bi bi-exclamation-triangle"></i>
      Large dataset detected (${results.length} items). Displaying first 100 items.
      <button class="btn btn-sm btn-outline-primary ms-2" onclick="renderAllResults()">
        Show All
      </button>
    </div>
  `;
  
  // Show only first 100 items for performance
  const limitedResults = results.slice(0, 100);
  const envGroups = groupResultsByEnvironment(limitedResults);
  
  for (const [env, list] of Object.entries(envGroups)) {
    const tableHtml = createEnvironmentTable(env, list);
    container.insertAdjacentHTML("beforeend", tableHtml);
  }
  
  renderCostSummary(container);
}

// Show all results (for virtual table)
window.renderAllResults = function() {
  const envGroups = groupResultsByEnvironment(results);
  const container = document.getElementById("results-section");
  container.innerHTML = '';
  
  for (const [env, list] of Object.entries(envGroups)) {
    const tableHtml = createEnvironmentTable(env, list);
    container.insertAdjacentHTML("beforeend", tableHtml);
  }
  
  renderCostSummary(container);
};

// Show finalize modal with cost summary - FIXED CPU DISPLAY
export function showFinalizeModal(resultsArr) {
  try {
    if (!finalizeModal) {
      throw new Error('Modal not initialized. Call initializeModal() first.');
    }
    
    const tbody = document.querySelector("#finalizeModal tbody");
    if (!tbody) {
      throw new Error('Modal tbody not found');
    }
    
    tbody.innerHTML = "";
    
    const totalMonthly = resultsArr.reduce((sum, ns) => sum + (ns.monthlyCost || 0), 0);
    const totalAnnual = resultsArr.reduce((sum, ns) => sum + (ns.annualCost || 0), 0);
    
    resultsArr.forEach(ns => {
      // DEFAULT TOTAL CPU CALCULATION FOR MODAL BASED ON ENVIRONMENT
      let totalCpuDisplay;
      if (ns.env === 'prod' || ns.env === 'production') {
        totalCpuDisplay = '128000';
      } else {
        totalCpuDisplay = '6000';
      }
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(ns.env)}</td>
        <td>${escapeHtml(ns.cluster)}</td>
        <td>${escapeHtml(ns.namespace)}</td>
        <td>${ns.pods}</td>
        <td>1000m / 4096MB</td>
        <td>${totalCpuDisplay}</td>
        <td>${escapeHtml(ns.override_size || ns.recommendedSize)}</td>
        <td>${(ns.monthlyCost || 0).toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</td>
        <td>${(ns.annualCost || 0).toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</td>
      `;
      tbody.appendChild(tr);
    });
    
    // Add total row
    const totalRow = document.createElement("tr");
    totalRow.className = "table-success fw-bold";
    totalRow.innerHTML = `
      <td colspan="7" class="text-end"><strong>Total:</strong></td>
      <td><strong>${totalMonthly.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</strong></td>
      <td><strong>${totalAnnual.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}</strong></td>
    `;
    tbody.appendChild(totalRow);
    
    // Update modal title with totals
    const modalTitle = document.querySelector("#finalizeModal .modal-title");
    if (modalTitle) {
      modalTitle.textContent = `Cost Summary - ${totalAnnual.toLocaleString('en-US', CONFIG.CURRENCY_FORMAT)}/year`;
    }
    
    finalizeModal.show();
  } catch (error) {
    console.error('Error showing finalize modal:', error);
    alert('Error displaying summary: ' + error.message);
  }
}

// Set loading state
export function setLoadingState(loading) {
  const container = document.getElementById("results-section");
  if (container) {
    container.classList.toggle('loading', loading);
    if (loading) {
      container.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Calculating costs...</p>
        </div>
      `;
    }
  }
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}