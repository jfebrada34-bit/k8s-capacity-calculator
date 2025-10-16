export const STANDARD_PRICING = {
  "S": { cpu_max: 8, monthly: 413.46 },
  "M": { cpu_max: 16, monthly: 583.84 },
  "L": { cpu_max: 32, monthly: 1102.56 },
  "XL": { cpu_max: 64, monthly: 2205.12 }
};

export function getBufferedCpu(cpuCore) {
  return Math.ceil(cpuCore * 1.3);
}

export function getStandardSize(cpuBuffered) {
  for (const [size, info] of Object.entries(STANDARD_PRICING)) {
    if (cpuBuffered <= info.cpu_max) return size;
  }
  return "XL";
}

export function calculateNamespaceCost(ns) {
  const cpuCoresTotal = (ns.pods * ns.cpu_req) / 1000;
  const bufferedCpu = getBufferedCpu(cpuCoresTotal);
  const recommendedSize = ns.override_size || getStandardSize(bufferedCpu);
  const monthlyCost = STANDARD_PRICING[recommendedSize]?.monthly || 0;
  return { ...ns, cpuCoresTotal, bufferedCpu, recommendedSize, monthlyCost };
}
