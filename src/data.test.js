import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  initialProjects,
  beamtimeMilestones,
  isMilestoneComplete,
  canToggleMilestone,
  getClearedProjectChecks,
  loadProjects,
} from "./data.js";

function project(changes = {}) {
  return {
    ...structuredClone(initialProjects[0]),
    stage: 5,
    feasibility: true,
    defense: true,
    ...changes,
  };
}

function withSavedProject(saved, check) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map([[STORAGE_KEY, JSON.stringify([saved])]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });
  try {
    check(loadProjects()[0], values);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
}

test("each beamtime includes Intermediate Data before analysis", () => {
  assert.deepEqual(beamtimeMilestones, [
    "Beamtime Scheduled",
    "Data Collected",
    "Preliminary Data",
    "Intermediate Data",
    "Data Analysis Complete",
  ]);
  assert.equal(canToggleMilestone(project(), 7), false);
  assert.equal(canToggleMilestone(project({ stage: 6 }), 7), true);
});

test("final delivery requires analysis for every beamtime", () => {
  const ready = project({
    stage: 7,
    primaryAnalysisComplete: true,
    beamtimes: [{ id: "second", stage: 3 }],
  });
  assert.equal(canToggleMilestone(ready, 8), false);
  assert.equal(
    canToggleMilestone(
      { ...ready, beamtimes: [{ id: "second", stage: 4 }] },
      8,
    ),
    true,
  );
});

test("undoing Intermediate Data lists only its dependent analysis and delivery", () => {
  const before = project({
    stage: 8,
    primaryAnalysisComplete: true,
    beamtimes: [{ id: "second", stage: 4 }],
  });
  assert.deepEqual(
    getClearedProjectChecks(before, {
      ...before,
      stage: 5,
      primaryAnalysisComplete: false,
    }),
    [
      "Beamtime 1: Intermediate Data",
      "Beamtime 1: Data Analysis Complete",
      "Final Deliverable",
    ],
  );
  assert.deepEqual(
    getClearedProjectChecks(before, {
      ...before,
      stage: 7,
      beamtimes: [{ id: "second", stage: 2 }],
    }),
    [
      "Final Deliverable",
      "Beamtime 2: Intermediate Data",
      "Beamtime 2: Data Analysis Complete",
    ],
  );
});

test("legacy completed analysis infers its prerequisite without changing other beamtimes", () => {
  const saved = project({
    workflowVersion: undefined,
    primaryAnalysisComplete: true,
    beamtimes: [
      { id: "complete", cycle: "2026-1", btr: "chen-1", stage: 3 },
      { id: "unfinished", cycle: "2026-2", btr: "chen-2", stage: 2 },
    ],
  });
  withSavedProject(saved, (loaded, values) => {
    assert.equal(loaded.workflowVersion, 3);
    assert.equal(loaded.stage, 7);
    assert.equal(isMilestoneComplete(loaded, 6), true);
    assert.equal(isMilestoneComplete(loaded, 7), true);
    assert.deepEqual(
      loaded.beamtimes.map((b) => b.stage),
      [4, 2],
    );
    assert.equal(loaded.beamtimes[0].btr, "chen-1");
    assert.equal(loaded.externalContact, saved.externalContact);
    values.set(STORAGE_KEY, JSON.stringify([loaded]));
    assert.deepEqual(loadProjects()[0], loaded);
  });
});

test("legacy shared Intermediate Data applies only to beamtimes with preliminary data", () => {
  withSavedProject(
    project({
      workflowVersion: undefined,
      stage: 6,
      beamtimes: [
        { id: "preliminary", stage: 2 },
        { id: "collecting", stage: 1 },
      ],
    }),
    (loaded) => {
      assert.deepEqual(
        loaded.beamtimes.map((b) => b.stage),
        [3, 1],
      );
      assert.equal(loaded.primaryAnalysisComplete, false);
    },
  );
});

test("current saved progress cannot bypass Intermediate Data or final delivery prerequisites", () => {
  withSavedProject(project({ primaryAnalysisComplete: true }), (loaded) => {
    assert.equal(loaded.stage, 5);
    assert.equal(isMilestoneComplete(loaded, 7), false);
  });
  withSavedProject(
    project({
      stage: 8,
      primaryAnalysisComplete: true,
      beamtimes: [{ id: "intermediate-only", stage: 3 }],
    }),
    (loaded) => {
      assert.equal(loaded.stage, 7);
      assert.equal(loaded.beamtimes[0].stage, 3);
      assert.equal(canToggleMilestone(loaded, 8), false);
    },
  );
});
