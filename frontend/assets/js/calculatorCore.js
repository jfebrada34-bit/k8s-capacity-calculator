// calculatorCore.js - Fixed CPU calculation
console.log('✅ calculatorCore.js loaded');

// Configuration constants
const CONFIG = {
  BUFFER_MULTIPLIER: 1.3,
  CPU_SCALING_FACTOR: 1000, // Convert millicores to cores
  FALLBACK_SIZE: 'XL'
};

export const STANDARD_PRICING = {
  "S": { cpu_max: 8, monthly: 413.46 },
  "M": { cpu_max: 16, monthly: 583.84 },
  "L": { cpu_max: 32, monthly: 1102.56 },
  "XL": { cpu_max: 64, monthly: 2205.12 }
};

/**
 * Calculate buffered CPU with safety margin
 */
export function getBufferedCpu(cpuCore) {
  if (typeof cpuCore !== 'number' || cpuCore < 0 || !isFinite(cpuCore)) {
    console.warn('getBufferedCpu: Invalid cpuCore value, using 0:', cpuCore);
    return 0;
  }
  
  return Math.ceil(cpuCore * CONFIG.BUFFER_MULTIPLIER);
}

/**
 * Find the appropriate standard size for given CPU requirements
 */
export function getStandardSize(cpuBuffered) {
  if (typeof cpuBuffered !== 'number' || cpuBuffered < 0 || !isFinite(cpuBuffered)) {
    console.warn('getStandardSize: Invalid cpuBuffered value, using fallback:', cpuBuffered);
    return CONFIG.FALLBACK_SIZE;
  }

  const sizes = Object.keys(STANDARD_PRICING);
  
  // Handle zero CPU case - return smallest size
  if (cpuBuffered === 0) {
    return sizes[0] || CONFIG.FALLBACK_SIZE;
  }

  // Find the smallest size that can handle the CPU requirement
  for (const size of sizes) {
    const info = STANDARD_PRICING[size];
    if (cpuBuffered <= info.cpu_max) {
      return size;
    }
  }

  // If no size fits, return the largest available size
  return sizes[sizes.length - 1] || CONFIG.FALLBACK_SIZE;
}

/**
 * Calculate total CPU cores from millicores - FIXED VERSION
 */
function calculateTotalCpuCores(pods, cpuReqMillicores) {
  console.log(`🔍 calculateTotalCpuCores: ${pods} pods * ${cpuReqMillicores}m`);
  
  // Validate inputs
  if (typeof pods !== 'number' || typeof cpuReqMillicores !== 'number') {
    console.error('Invalid inputs to calculateTotalCpuCores:', { pods, cpuReqMillicores });
    return 0;
  }
  
  if (pods <= 0 || cpuReqMillicores <= 0) {
    console.warn('Zero or negative values in CPU calculation:', { pods, cpuReqMillicores });
    return 0;
  }
  
  const totalMillicores = pods * cpuReqMillicores;
  const totalCores = totalMillicores / CONFIG.CPU_SCALING_FACTOR;
  
  console.log(`🔍 CPU Calculation: ${pods} * ${cpuReqMillicores} = ${totalMillicores}m = ${totalCores} cores`);
  
  return totalCores;
}

/**
 * Calculate namespace cost - FIXED VERSION
 */
export function calculateNamespaceCost(ns) {
  console.log('=== calculateNamespaceCost START ===', ns);
  
  try {
    // Validate required fields
    if (!ns || typeof ns !== 'object') {
      console.error('Invalid namespace object:', ns);
      return createErrorResult(ns, 'Invalid namespace data');
    }

    if (typeof ns.pods === 'undefined' || typeof ns.cpu_req === 'undefined') {
      console.error('Missing required fields:', { pods: ns.pods, cpu_req: ns.cpu_req });
      return createErrorResult(ns, 'Missing required fields');
    }

    // Convert to numbers to ensure they're valid
    const pods = Number(ns.pods);
    const cpuReq = Number(ns.cpu_req);
    
    console.log(`🔍 Raw values - pods: ${ns.pods} (as number: ${pods}), cpu_req: ${ns.cpu_req} (as number: ${cpuReq})`);

    if (isNaN(pods) || isNaN(cpuReq)) {
      console.error('Invalid numeric values:', { pods: ns.pods, cpu_req: ns.cpu_req });
      return createErrorResult(ns, 'Invalid numeric values');
    }

    // Calculate CPU requirements - THIS IS THE KEY FIX
    const cpuCoresTotal = calculateTotalCpuCores(pods, cpuReq);
    
    console.log('🔍 Calculated cpuCoresTotal:', cpuCoresTotal);
    
    if (!isFinite(cpuCoresTotal) || cpuCoresTotal < 0) {
      console.error('Invalid CPU calculation result:', cpuCoresTotal);
      return createErrorResult(ns, 'Invalid CPU calculation');
    }

    // Get buffered CPU and recommended size
    const bufferedCpu = getBufferedCpu(cpuCoresTotal);
    const recommendedSize = ns.override_size || getStandardSize(bufferedCpu);

    console.log('🔍 Buffered CPU:', bufferedCpu, 'Recommended Size:', recommendedSize);

    // Validate the selected size exists
    if (!STANDARD_PRICING[recommendedSize]) {
      console.warn(`Invalid size '${recommendedSize}', using fallback`);
      const fallbackSize = getStandardSize(bufferedCpu);
      return calculateWithSize(ns, cpuCoresTotal, bufferedCpu, fallbackSize);
    }

    const result = calculateWithSize(ns, cpuCoresTotal, bufferedCpu, recommendedSize);
    console.log('=== calculateNamespaceCost RESULT ===', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error in calculateNamespaceCost:', error);
    return createErrorResult(ns, error.message);
  }
}

/**
 * Calculate costs with a specific size
 */
function calculateWithSize(ns, cpuCoresTotal, bufferedCpu, size) {
  const pricing = STANDARD_PRICING[size];
  const monthlyCost = pricing?.monthly || 0;
  const annualCost = monthlyCost * 12;

  const result = {
    ...ns,
    cpuCoresTotal: parseFloat(cpuCoresTotal.toFixed(2)),
    bufferedCpu,
    recommendedSize: size,
    monthlyCost: parseFloat(monthlyCost.toFixed(2)),
    annualCost: parseFloat(annualCost.toFixed(2)),
    calculationError: null
  };
  
  console.log('💰 Cost calculation:', { size, monthlyCost, annualCost });
  return result;
}

/**
 * Create error result for invalid calculations
 */
function createErrorResult(ns, errorMessage) {
  const result = {
    ...ns,
    cpuCoresTotal: 0,
    bufferedCpu: 0,
    recommendedSize: CONFIG.FALLBACK_SIZE,
    monthlyCost: 0,
    annualCost: 0,
    calculationError: errorMessage
  };
  
  console.error('❌ Error result created:', result);
  return result;
}

/**
 * Calculate total costs for multiple namespaces
 */
export function calculateAllNamespaces(namespaces) {
  if (!Array.isArray(namespaces)) {
    throw new Error('calculateAllNamespaces: Expected array of namespaces');
  }

  const results = namespaces.map(calculateNamespaceCost);
  
  const totals = results.reduce((acc, result) => ({
    monthly: acc.monthly + (result.monthlyCost || 0),
    annual: acc.annual + (result.annualCost || 0),
    namespaces: acc.namespaces + 1,
    errors: acc.errors + (result.calculationError ? 1 : 0)
  }), { monthly: 0, annual: 0, namespaces: 0, errors: 0 });

  return {
    results,
    totals,
    averageMonthly: totals.namespaces > 0 ? totals.monthly / totals.namespaces : 0
  };
}

/**
 * Get available sizes for UI components
 */
export function getAvailableSizes() {
  return Object.entries(STANDARD_PRICING).map(([size, info]) => ({
    value: size,
    label: `${size} (up to ${info.cpu_max} CPU cores)`,
    cpu_max: info.cpu_max,
    monthly: info.monthly
  }));
}