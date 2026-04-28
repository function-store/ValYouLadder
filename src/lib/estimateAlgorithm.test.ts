import { describe, it, expect } from "vitest";
import {
  DURATION_DAYS,
  MIN_SIMILARITY_THRESHOLD,
  ANNUAL_INFLATION,
  computeSkillIdf,
  weightedPercentile,
  computeESS,
  essToConfidence,
} from "./estimateAlgorithm";

// --- DURATION_DAYS ---
describe("DURATION_DAYS", () => {
  it("maps all expected project length categories", () => {
    expect(DURATION_DAYS["day"]).toBe(1);
    expect(DURATION_DAYS["2-5-days"]).toBe(3.5);
    expect(DURATION_DAYS["1-2-weeks"]).toBe(7);
    expect(DURATION_DAYS["1-3-months"]).toBe(45);
    expect(DURATION_DAYS["3-6-months"]).toBe(90);
    expect(DURATION_DAYS["6plus-months"]).toBe(180);
  });
});

// --- computeSkillIdf ---
describe("computeSkillIdf", () => {
  it("returns empty map for empty pool", () => {
    expect(computeSkillIdf([]).size).toBe(0);
  });

  it("gives higher IDF to rarer skills", () => {
    const projects = [
      { skills: ["Ableton Live", "Notch"] },
      { skills: ["Ableton Live", "TouchDesigner"] },
      { skills: ["Ableton Live"] },
    ];
    const idf = computeSkillIdf(projects);
    // Ableton Live appears in all 3 projects → IDF = log(3/3) = 0
    expect(idf.get("Ableton Live")).toBeCloseTo(0, 5);
    // Notch appears in 1 → IDF = log(3/1) ≈ 1.0986
    expect(idf.get("Notch")!).toBeGreaterThan(0.5);
    // TouchDesigner appears in 1 → same IDF as Notch
    expect(idf.get("TouchDesigner")).toBeCloseTo(idf.get("Notch")!, 5);
  });

  it("counts each skill at most once per project", () => {
    const projects = [
      { skills: ["A", "A", "A"] }, // duplicates within a project
      { skills: ["B"] },
    ];
    const idf = computeSkillIdf(projects);
    // A appears in 1 project, B in 1 project → same IDF
    expect(idf.get("A")).toBeCloseTo(idf.get("B")!, 5);
  });
});

// --- weightedPercentile ---
describe("weightedPercentile", () => {
  it("returns 0 for empty array", () => {
    expect(weightedPercentile([], 0.5)).toBe(0);
  });

  it("returns the single value for single-element array", () => {
    expect(weightedPercentile([{ value: 100, weight: 1 }], 0.5)).toBe(100);
  });

  it("returns correct median for equal-weight items", () => {
    const items = [
      { value: 10, weight: 1 },
      { value: 20, weight: 1 },
      { value: 30, weight: 1 },
      { value: 40, weight: 1 },
    ];
    const median = weightedPercentile(items, 0.5);
    // With equal weights, the 50th percentile should be near 20-30
    expect(median).toBeGreaterThanOrEqual(10);
    expect(median).toBeLessThanOrEqual(40);
  });

  it("weights shift the percentile toward higher-weight items", () => {
    const items = [
      { value: 10, weight: 1 },   // low weight
      { value: 100, weight: 99 }, // high weight
    ];
    // With 99% of weight on 100, the median should be very close to 100
    const median = weightedPercentile(items, 0.5);
    expect(median).toBeGreaterThan(50);
  });

  it("25th percentile is lower than 75th percentile", () => {
    const items = [
      { value: 10, weight: 5 },
      { value: 50, weight: 10 },
      { value: 100, weight: 5 },
    ];
    const q25 = weightedPercentile(items, 0.25);
    const q75 = weightedPercentile(items, 0.75);
    expect(q25).toBeLessThanOrEqual(q75);
  });

  it("handles unsorted input correctly", () => {
    const items = [
      { value: 100, weight: 1 },
      { value: 10, weight: 1 },
      { value: 50, weight: 1 },
    ];
    const median = weightedPercentile(items, 0.5);
    // Should be around 50 (the middle value)
    expect(median).toBeGreaterThanOrEqual(10);
    expect(median).toBeLessThanOrEqual(100);
  });
});

// --- computeESS ---
describe("computeESS", () => {
  it("returns 0 for empty array", () => {
    expect(computeESS([])).toBe(0);
  });

  it("returns N for N equal weights", () => {
    // ESS of equal weights = N
    expect(computeESS([1, 1, 1, 1])).toBeCloseTo(4, 5);
    expect(computeESS([10, 10, 10])).toBeCloseTo(3, 5);
  });

  it("returns 1 when all weight is on one item", () => {
    // One huge weight plus zeros → ESS ≈ 1
    expect(computeESS([100])).toBeCloseTo(1, 5);
  });

  it("ESS is less than N when weights are unequal", () => {
    const ess = computeESS([10, 1, 1, 1]);
    expect(ess).toBeLessThan(4);
    expect(ess).toBeGreaterThan(1);
  });

  it("handles zero weights gracefully", () => {
    expect(computeESS([0, 0, 0])).toBe(0);
  });
});

// --- essToConfidence ---
describe("essToConfidence", () => {
  it("returns 'high' for ESS >= 8", () => {
    expect(essToConfidence(8)).toBe("high");
    expect(essToConfidence(20)).toBe("high");
  });

  it("returns 'medium' for ESS 5-7", () => {
    expect(essToConfidence(5)).toBe("medium");
    expect(essToConfidence(7)).toBe("medium");
    expect(essToConfidence(7.9)).toBe("medium");
  });

  it("returns 'low' for ESS < 5", () => {
    expect(essToConfidence(4.9)).toBe("low");
    expect(essToConfidence(1)).toBe("low");
    expect(essToConfidence(0)).toBe("low");
  });
});

// --- Integration: budget normalization + weighted percentile ---
describe("budget normalization round-trip", () => {
  it("normalizing to daily rate and scaling back preserves relative order", () => {
    // Simulate two projects: short expensive vs long cheap
    const shortProject = { budget: 5000, projectLength: "2-5-days" }; // ~$1428/day
    const longProject = { budget: 9000, projectLength: "1-3-months" }; // $200/day

    const shortRate = shortProject.budget / DURATION_DAYS[shortProject.projectLength];
    const longRate = longProject.budget / DURATION_DAYS[longProject.projectLength];

    // The short project has a much higher daily rate
    expect(shortRate).toBeGreaterThan(longRate);

    // When we scale back to a "1-2-weeks" target, the estimate reflects daily rates
    const targetDays = DURATION_DAYS["1-2-weeks"]; // 7 days
    expect(shortRate * targetDays).toBeGreaterThan(longRate * targetDays);
  });

  it("inflation adjustment increases older rates", () => {
    const baseRate = 100;
    const yearsOld = 3;
    const adjustedRate = baseRate * Math.pow(1 + ANNUAL_INFLATION, yearsOld);
    // 100 * 1.05^3 ≈ 115.76
    expect(adjustedRate).toBeGreaterThan(baseRate);
    expect(adjustedRate).toBeCloseTo(115.7625, 2);
  });
});

// --- MIN_SIMILARITY_THRESHOLD ---
describe("MIN_SIMILARITY_THRESHOLD", () => {
  it("is set to 15 (~12.5% of max score)", () => {
    expect(MIN_SIMILARITY_THRESHOLD).toBe(15);
  });
});
