// finalizeModal.js - Handles Finalize Cost modal logic
export class FinalizeModalManager {
  constructor() {
    this.modal = null;
    this.CONFIG = {
      CURRENCY_FORMAT: { style: 'currency', currency: 'USD' },
      EKS_VERSION: 'v1.32',
      PDB_DEFAULT: 'minUnavailable = 1',
      CPU_PER_NODE: 64, // XL instance size capacity
      BUFFER_MULTIPLIER: 1.3 // 30% buffer
    };
  }

  initialize(modalElement) {
    this.modal = new bootstrap.Modal(modalElement, { 
      backdrop: true, 
      keyboard: true 
    });
    
    modalElement.addEventListener("hidden.bs.modal", () => {
      this.cleanup();
    });
    
    console.log('✅ Finalize Modal Manager initialized');
  }

  show(resultsArr) {
    if (!this.modal) {
      throw new Error('Modal not initialized. Call initialize() first.');
    }

    try {
      this.populateSummaryTable(resultsArr);
      this.populateTagsAndMetadata();
      this.updateModalTitle(resultsArr);
      this.modal.show();
    } catch (error) {
      console.error('Error showing finalize modal:', error);
      throw error;
    }
  }

  populateSummaryTable(resultsArr) {
    const tbody = document.querySelector("#finalizeModal tbody");
    if (!tbody) throw new Error('Modal tbody not found');

    tbody.innerHTML = "";

    const clusterGroups = this.groupByCluster(resultsArr);
    
    Object.entries(clusterGroups).forEach(([clusterName, namespaces]) => {
      const clusterMetrics = this.calculateClusterMetrics(namespaces);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${this.escapeHtml(clusterName)}</td>
        <td>${this.createProvisionerDropdown()}</td>
        <td>${this.CONFIG.PDB_DEFAULT}</td>
        <td>${this.CONFIG.EKS_VERSION}</td>
        <td>${namespaces.length}</td>
        <td>${clusterMetrics.cpuWithBuffer.toFixed(1)}</td>
        <td>${clusterMetrics.nodeCount}</td>
        <td>${clusterMetrics.monthlyCost.toLocaleString('en-US', this.CONFIG.CURRENCY_FORMAT)}</td>
        <td>${clusterMetrics.annualCost.toLocaleString('en-US', this.CONFIG.CURRENCY_FORMAT)}</td>
      `;
      tbody.appendChild(tr);
    });

    this.addTotalRow(resultsArr, tbody);
  }

  groupByCluster(resultsArr) {
    const clusterGroups = {};
    resultsArr.forEach(ns => {
      if (!clusterGroups[ns.cluster]) {
        clusterGroups[ns.cluster] = [];
      }
      clusterGroups[ns.cluster].push(ns);
    });
    return clusterGroups;
  }

  calculateClusterMetrics(namespaces) {
    const clusterCpu = namespaces.reduce((sum, ns) => sum + this.calculateNamespaceCpu(ns), 0);
    const clusterCpuWithBuffer = clusterCpu * this.CONFIG.BUFFER_MULTIPLIER;
    const clusterNodeCount = Math.ceil(clusterCpuWithBuffer / this.CONFIG.CPU_PER_NODE);
    const clusterMonthlyCost = namespaces.reduce((sum, ns) => sum + (ns.monthlyCost || 0), 0);
    const clusterAnnualCost = clusterMonthlyCost * 12;

    return {
      cpu: clusterCpu,
      cpuWithBuffer: clusterCpuWithBuffer,
      nodeCount: clusterNodeCount,
      monthlyCost: clusterMonthlyCost,
      annualCost: clusterAnnualCost
    };
  }

  calculateNamespaceCpu(ns) {
    let cpuCoresTotal = ns.cpuCoresTotal;
    if ((!cpuCoresTotal || cpuCoresTotal === 0) && ns.pods && ns.cpu_req) {
      cpuCoresTotal = (ns.pods * ns.cpu_req) / 1000;
    }
    return cpuCoresTotal || 0;
  }

  createProvisionerDropdown(currentValue = '') {
    const provisionerTiers = [
      { value: 'Tier1', label: 'Tier1 - 10,000', cost: 10000 },
      { value: 'Tier2', label: 'Tier2 - 30,000', cost: 30000 },
      { value: 'Tier3', label: 'Tier3 - 60,000', cost: 60000 }
    ];
    
    return `
      <select class="form-select form-select-sm provisioner-select">
        ${provisionerTiers.map(tier => 
          `<option value="${tier.value}" ${currentValue === tier.value ? 'selected' : ''}>
             ${tier.label}
           </option>`
        ).join('')}
      </select>
    `;
  }

  addTotalRow(resultsArr, tbody) {
    const totalMetrics = this.calculateTotalMetrics(resultsArr);
    
    const totalRow = document.createElement("tr");
    totalRow.className = "table-success fw-bold";
    totalRow.innerHTML = `
      <td colspan="5" class="text-end"><strong>Total:</strong></td>
      <td><strong>${totalMetrics.totalCpuWithBuffer.toFixed(1)}</strong></td>
      <td><strong>${totalMetrics.totalNodeCount}</strong></td>
      <td><strong>${totalMetrics.totalMonthly.toLocaleString('en-US', this.CONFIG.CURRENCY_FORMAT)}</strong></td>
      <td><strong>${totalMetrics.totalAnnual.toLocaleString('en-US', this.CONFIG.CURRENCY_FORMAT)}</strong></td>
    `;
    tbody.appendChild(totalRow);
  }

  calculateTotalMetrics(resultsArr) {
    const totalMonthly = resultsArr.reduce((sum, ns) => sum + (ns.monthlyCost || 0), 0);
    const totalAnnual = totalMonthly * 12;
    const totalCpu = resultsArr.reduce((sum, ns) => sum + this.calculateNamespaceCpu(ns), 0);
    const totalCpuWithBuffer = totalCpu * this.CONFIG.BUFFER_MULTIPLIER;
    const totalNodeCount = Math.ceil(totalCpuWithBuffer / this.CONFIG.CPU_PER_NODE);

    return {
      totalMonthly,
      totalAnnual,
      totalCpu,
      totalCpuWithBuffer,
      totalNodeCount
    };
  }

  populateTagsAndMetadata() {
    const tagElements = {
      tagTribe: 'tribe',
      tagSquad: 'squad',
      tagApprover: 'approver',
      tagPlatform: 'platform',
      tagPO: 'productOwner',
      tagSO: 'systemOwner',
      tagSR: 'srTag',
      tagDesc: 'description'
    };

    Object.entries(tagElements).forEach(([tagElementId, formElementId]) => {
      const element = document.getElementById(tagElementId);
      const formValue = this.getFormValue(formElementId);
      if (element) {
        element.textContent = formValue;
      }
    });
  }

  getFormValue(id) {
    const element = document.getElementById(id);
    return element && element.value ? this.escapeHtml(element.value) : 'Not specified';
  }

  updateModalTitle(resultsArr) {
    const totalAnnual = resultsArr.reduce((sum, ns) => sum + (ns.annualCost || 0), 0) * 12;
    const modalTitle = document.querySelector("#finalizeModal .modal-title");
    if (modalTitle) {
      modalTitle.textContent = `Cost Summary - ${totalAnnual.toLocaleString('en-US', this.CONFIG.CURRENCY_FORMAT)}/year`;
    }
  }

  cleanup() {
    const tbody = document.querySelector("#finalizeModal tbody");
    if (tbody) {
      tbody.innerHTML = "";
    }
  }

  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Create and export a singleton instance
export const finalizeModalManager = new FinalizeModalManager();