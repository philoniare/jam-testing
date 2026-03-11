const GENESIS_IMPORT = "00000000.bin";

export class Stats {
  static new(peer: string) {
    return new Stats(peer);
  }

  public readonly stats: Map<string, bigint[]> = new Map();

  private constructor(public readonly peer: string) {}

  async measure(name: string, what: () => Promise<void>) {
    const start = process.hrtime.bigint();
    let end = start;
    try {
      await what();
    } finally {
      end = process.hrtime.bigint();
    }

    const tookNs = end - start;
    const data = this.stats.get(name) ?? [];
    data.push(tookNs);
    this.stats.set(name, data);
    return tookNs;
  }

  toString(withDetails = false) {
    const aggregated: bigint[] = [];

    const s = [`=== Stats for ${this.peer} ===`];
    for (const [key, values] of this.stats) {
      if (!key.endsWith(GENESIS_IMPORT)) {
        aggregated.push(...values);
      }
      if (withDetails) {
        const stats = calculateBigIntStats(values);
        s.push(...renderStats(key, stats));
      }
    }

    const stats = calculateBigIntStats(aggregated);
    s.push(...renderStats("aggregated", stats));

    return s.join("\n");
  }

  aggregateToCsvRow() {
    const aggregated: bigint[] = [];
    for (const [key, values] of this.stats) {
      if (!key.endsWith(GENESIS_IMPORT)) {
        aggregated.push(...values);
      }
    }
    const stats = calculateBigIntStats(aggregated);
    const cols = statsToColumns(stats);
    cols.unshift(new Date().toISOString());
    cols.unshift(this.peer);

    return cols.join(",");
  }
}

function statsToColumns(stats: BigIntStats) {
  return [
    stats.count,
    stats.sum,
    stats.mean,
    stats.median,
    stats.min,
    stats.max,
    stats.range,
    stats.standardDeviation,
    stats.variance,
    stats.percentiles.p1,
    stats.percentiles.p5,
    stats.percentiles.p10,
    stats.percentiles.p25,
    stats.percentiles.p50,
    stats.percentiles.p75,
    stats.percentiles.p90,
    stats.percentiles.p95,
    stats.percentiles.p99,
  ].map((x) => `${x}`);
}

function renderStats(key: string, stats: BigIntStats) {
  if (stats.count === 1) {
    return [];
  }

  const FILL = 16;
  const UNIT = "μs";
  const round = (v: bigint | number) => (Number(v) / 1_000).toFixed(1);

  const s: string[] = [];
  const fill = `== ${"".padStart(FILL, " ")}`;
  s.push(`== ${key.padEnd(FILL, "")}`);
  s.push(`${fill}min: ${round(stats.min)} [${UNIT}]`);
  s.push(`${fill}max: ${round(stats.max)} [${UNIT}]`);
  s.push(`${fill}mean: ${round(stats.mean)} [${UNIT}]`);
  s.push(`${fill}median: ${round(stats.median)} [${UNIT}]`);

  s.push(`${fill}stdDev: ${round(stats.standardDeviation)} [${UNIT}]`);

  s.push(`${fill}p90: ${round(stats.percentiles.p90)} [${UNIT}]`);
  s.push(`${fill}p99: ${round(stats.percentiles.p99)} [${UNIT}]`);
  s.push("");
  return s;
}

interface BigIntStats {
  count: number;
  sum: bigint;
  mean: bigint;
  median: bigint;
  min: bigint;
  max: bigint;
  range: bigint;
  standardDeviation: number;
  variance: number;
  percentiles: {
    p1: bigint;
    p5: bigint;
    p10: bigint;
    p25: bigint;
    p50: bigint;
    p75: bigint;
    p90: bigint;
    p95: bigint;
    p99: bigint;
  };
}

function calculateBigIntStats(bigintArray: bigint[]): BigIntStats {
  if (!Array.isArray(bigintArray) || bigintArray.length === 0) {
    throw new Error("Input must be a non-empty array");
  }

  // Validate all elements are BigInt
  for (const val of bigintArray) {
    if (typeof val !== "bigint") {
      throw new Error("All array elements must be BigInt values");
    }
  }

  const n = BigInt(bigintArray.length);
  const sorted = [...bigintArray].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // Helper function to convert BigInt to Number safely for calculations
  function bigintToNumber(val: bigint): number {
    const num = Number(val);
    if (!Number.isFinite(num)) {
      console.warn("BigInt value may be too large for precise Number conversion:", val);
    }
    return num;
  }

  // Calculate sum and mean
  const sum = bigintArray.reduce((acc, val) => acc + val, 0n);
  const mean = sum / n;

  // Calculate standard deviation
  const variance =
    bigintArray.reduce((acc, val) => {
      const diff = bigintToNumber(val - mean);
      return acc + diff * diff;
    }, 0) / Number(n);
  const stdDev = Math.sqrt(variance);

  // Percentile calculation helper
  function getPercentile(sortedArray: bigint[], percentile: number): bigint {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    // Linear interpolation for in-between values
    const weight = index - lower;
    const lowerVal = bigintToNumber(sortedArray[lower]);
    const upperVal = bigintToNumber(sortedArray[upper]);
    return BigInt(Math.round(lowerVal + weight * (upperVal - lowerVal)));
  }

  return {
    count: bigintArray.length,
    sum: sum,
    mean: mean,
    median: getPercentile(sorted, 50),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
    standardDeviation: stdDev,
    variance: variance,
    percentiles: {
      p1: getPercentile(sorted, 1),
      p5: getPercentile(sorted, 5),
      p10: getPercentile(sorted, 10),
      p25: getPercentile(sorted, 25),
      p50: getPercentile(sorted, 50),
      p75: getPercentile(sorted, 75),
      p90: getPercentile(sorted, 90),
      p95: getPercentile(sorted, 95),
      p99: getPercentile(sorted, 99),
    },
  };
}
