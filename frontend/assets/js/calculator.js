import { calculateNamespaceCost } from "./calculatorCore.js";
import { renderResults, initializeModal, showFinalizeModal, setResultsArray } from "./uiRenderer.js";

let results = [];

window.overrideSize = function(selectEl) {
  const idx = parseInt(selectEl.getAttribute("data-idx"));
  results[idx].override_size = selectEl.value;
  setResultsArray(results);
  renderResults();
};

document.addEventListener("DOMContentLoaded", () => {
  initializeModal();

  document.getElementById("btnAdd").addEventListener("click", () => {
    const ns = {
      env: document.getElementById("envMain").value,
      cluster: document.getElementById("cluster").value,
      namespace: document.getElementById("namespace").value,
      pods: parseInt(document.getElementById("pods").value) || 1,
      cpu_req: parseInt(document.getElementById("cpu_req").value) || 6000,
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
    if (!ns.namespace) return alert("Namespace is required");

    results.push(calculateNamespaceCost(ns));
    setResultsArray(results);
    renderResults();
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    results = [];
    setResultsArray(results);
    renderResults();
  });

  document.getElementById("btnFinalize").addEventListener("click", () => {
    if (!results.length) return alert("No namespaces added yet!");
    showFinalizeModal(results);
  });
});
