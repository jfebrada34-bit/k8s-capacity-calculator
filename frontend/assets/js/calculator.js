import { calculateNamespaceCost, calculateAllNamespaces } from "./calculatorCore.js";
import { renderResults, initializeModal, showFinalizeModal, setResultsArray, setLoadingState } from "./uiRenderer.js";

// Application state
let results = [];
let currentId = 1;

// Configuration
const CONFIG = {
  DEFAULT_VALUES: {
    pods: 1,
    cpu_req: 100,
    mem_req: 128,
    cpu_lim: 200,
    mem_lim: 256,
    hpa_min: 1,
    hpa_max: 3,
    istio_cpu_req: 10,
    istio_cpu_lim: 20,
    istio_mem_req: 64,
    istio_mem_lim: 128
  },
  REQUIRED_FIELDS: ['env', 'cluster', 'namespace']
};

/**
 * Generate unique ID for namespace tracking
 */
function generateId() {
  return currentId++;
}

/**
 * Validate namespace form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result { isValid: boolean, errors: array }
 */
function validateFormData(formData) {
  const errors = [];

  // Check required fields
  CONFIG.REQUIRED_FIELDS.forEach(field => {
    if (!formData[field] || formData[field].trim() === '') {
      errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
    }
  });

  // Validate numeric fields
  const numericFields = [
    'pods', 'cpu_req', 'mem_req', 'cpu_lim', 'mem_lim',
    'hpa_min', 'hpa_max', 'istio_cpu_req', 'istio_cpu_lim',
    'istio_mem_req', 'istio_mem_lim'
  ];

  numericFields.forEach(field => {
    const value = formData[field];
    if (value < 0) {
      errors.push(`${field.replace('_', ' ')} cannot be negative`);
    }
    if (field === 'hpa_min' && field === 'hpa_max' && formData.hpa_min > formData.hpa_max) {
      errors.push('HPA min cannot be greater than HPA max');
    }
    if (field === 'cpu_req' && field === 'cpu_lim' && formData.cpu_req > formData.cpu_lim) {
      errors.push('CPU request cannot be greater than CPU limit');
    }
    if (field === 'mem_req' && field === 'mem_lim' && formData.mem_req > formData.mem_lim) {
      errors.push('Memory request cannot be greater than memory limit');
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get form data with validation and defaults
 * @returns {Object} Form data object
 */
function getFormData() {
  const getValue = (id, isNumber = true) => {
    const element = document.getElementById(id);
    if (!element) return isNumber ? 0 : '';
    
    const value = element.value.trim();
    if (isNumber) {
      return value === '' ? CONFIG.DEFAULT_VALUES[id] || 0 : parseInt(value) || 0;
    }
    return value;
  };

  const getSelectValue = (id) => {
    const element = document.getElementById(id);
    return element ? element.value : '';
  };

  return {
    id: generateId(),
    env: getSelectValue('envMain'),
    cluster: getValue('cluster', false),
    namespace: getValue('namespace', false),
    pods: getValue('pods'),
    cpu_req: getValue('cpu_req'),
    mem_req: getValue('mem_req'),
    cpu_lim: getValue('cpu_lim'),
    mem_lim: getValue('mem_lim'),
    hpa_min: getValue('hpa_min'),
    hpa_max: getValue('hpa_max'),
    cpu_trigger: getValue('cpu_trigger', false),
    istio: getSelectValue('istio'),
    istio_cpu_req: getValue('istio_cpu_req'),
    istio_cpu_lim: getValue('istio_cpu_lim'),
    istio_mem_req: getValue('istio_mem_req'),
    istio_mem_lim: getValue('istio_mem_lim'),
    timestamp: new Date().toISOString()
  };
}

/**
 * Show validation errors to user
 * @param {Array} errors - Array of error messages
 */
function showValidationErrors(errors) {
  const errorHtml = errors.map(error => 
    `<div class="alert alert-warning alert-dismissible fade show" role="alert">
      ${error}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
     </div>`
  ).join('');

  // Create or update error container
  let errorContainer = document.getElementById('errorContainer');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'errorContainer';
    document.querySelector('main').prepend(errorContainer);
  }
  
  errorContainer.innerHTML = errorHtml;
}

/**
 * Clear validation errors
 */
function clearValidationErrors() {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.innerHTML = '';
  }
}

/**
 * Reset form to default values
 */
function resetForm() {
  const form = document.querySelector('form');
  if (form) {
    form.reset();
  }
  clearValidationErrors();
}

/**
 * Update summary statistics
 */
function updateSummary() {
  const summaryElement = document.getElementById('summaryStats');
  if (!summaryElement) return;

  if (results.length === 0) {
    summaryElement.innerHTML = '<div class="alert alert-info">No namespaces added yet</div>';
    return;
  }

  const totalMonthly = results.reduce((sum, ns) => sum + (ns.monthlyCost || 0), 0);
  const totalAnnual = results.reduce((sum, ns) => sum + (ns.annualCost || 0), 0);
  const avgMonthly = totalMonthly / results.length;

  summaryElement.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Summary</h5>
        <div class="row">
          <div class="col-md-3">
            <strong>Namespaces:</strong> ${results.length}
          </div>
          <div class="col-md-3">
            <strong>Monthly Total:</strong> $${totalMonthly.toFixed(2)}
          </div>
          <div class="col-md-3">
            <strong>Annual Total:</strong> $${totalAnnual.toFixed(2)}
          </div>
          <div class="col-md-3">
            <strong>Average Monthly:</strong> $${avgMonthly.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Fixed overrideSize function using unique IDs
window.overrideSize = function(selectEl) {
  const namespaceId = parseInt(selectEl.getAttribute("data-id"));
  const newSize = selectEl.value;

  const namespace = results.find(ns => ns.id === namespaceId);
  if (namespace) {
    namespace.override_size = newSize;
    
    // Recalculate cost with new size
    const updatedNs = calculateNamespaceCost(namespace);
    Object.assign(namespace, updatedNs);
    
    setResultsArray(results);
    renderResults();
    updateSummary();
  }
};

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  try {
    // Initialize UI components
    initializeModal();
    updateSummary();

    // Add namespace button
    document.getElementById("btnAdd").addEventListener("click", () => {
      clearValidationErrors();
      
      const formData = getFormData();
      const validation = validateFormData(formData);

      if (!validation.isValid) {
        showValidationErrors(validation.errors);
        return;
      }

      setLoadingState(true);
      
      try {
        const calculatedNs = calculateNamespaceCost(formData);
        results.push(calculatedNs);
        setResultsArray(results);
        renderResults();
        updateSummary();
        resetForm();
      } catch (error) {
        console.error('Error calculating namespace cost:', error);
        showValidationErrors(['Error calculating costs. Please check your inputs.']);
      } finally {
        setLoadingState(false);
      }
    });

    // Reset button
    document.getElementById("btnReset").addEventListener("click", () => {
      if (results.length > 0 && !confirm('Are you sure you want to clear all namespaces?')) {
        return;
      }
      
      results = [];
      currentId = 1;
      setResultsArray(results);
      renderResults();
      updateSummary();
      resetForm();
    });

    // Finalize button
    document.getElementById("btnFinalize").addEventListener("click", () => {
      if (!results.length) {
        showValidationErrors(['Please add at least one namespace before finalizing.']);
        return;
      }
      
      try {
        showFinalizeModal(results);
      } catch (error) {
        console.error('Error showing finalize modal:', error);
        showValidationErrors(['Error displaying summary. Please try again.']);
      }
    });

    // Export functionality
    document.getElementById("btnExport")?.addEventListener("click", () => {
      if (!results.length) {
        showValidationErrors(['No data to export.']);
        return;
      }

      try {
        const dataStr = JSON.stringify(results, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `namespace-costs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting data:', error);
        showValidationErrors(['Error exporting data.']);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btnAdd').click();
      }
      
      if (e.key === 'Escape') {
        resetForm();
      }
    });

    console.log('Application initialized successfully');

  } catch (error) {
    console.error('Failed to initialize application:', error);
    alert('Error initializing application. Please refresh the page.');
  }
});

// Utility function to check if results have errors
window.hasCalculationErrors = function() {
  return results.some(ns => ns.calculationError);
};

// Export results for external use
window.getCurrentResults = function() {
  return [...results]; // Return copy to prevent mutation
};

// Import results from external source
window.importResults = function(newResults) {
  if (!Array.isArray(newResults)) {
    throw new Error('Expected array of namespace results');
  }
  
  results = newResults.map(ns => ({
    ...ns,
    id: generateId() // Ensure unique IDs
  }));
  
  setResultsArray(results);
  renderResults();
  updateSummary();
};