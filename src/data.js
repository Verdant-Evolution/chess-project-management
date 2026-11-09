export const STORAGE_KEY = "cornell-chess-projects-v2";
const LEGACY_STORAGE_KEY = "cornell-chess-projects-v1";

export const SITE_TITLE = "Materials Solutions Network @ CHESS Dashboard";

export const scientists = [
  { id: "kelly-nygren", name: "Kelly Nygren", role: "Staff Scientist" },
  { id: "sven-gustofsen", name: "Sven Gustofsen", role: "Staff Scientist" },
  { id: "chris-budrow", name: "Chris Budrow", role: "Visiting Scientist" },
];

// The current user is the local demo profile until authentication is connected.
export const currentUser = scientists[0];

export function matchesProjectSearch(project, query) {
  const scientist = scientists.find(
    (person) => person.id === project.primaryScientist,
  );
  const searchableText = [
    project.name,
    `MSN-C #${project.id}`,
    scientist?.name,
    scientist?.role,
    project.externalContact,
    ...(project.teamMembers ?? []).flatMap((member) => [
      member.fullName,
      member.company,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((term) => searchableText.includes(term));
}

export function getNextProjectNumber(projects) {
  const used = new Set(projects.map((project) => project.id));
  const highest = projects.reduce(
    (max, project) => Math.max(max, project.id),
    845,
  );
  let next = highest === Number.MAX_SAFE_INTEGER ? 846 : highest + 1;
  while (used.has(next)) next += 1;
  return next;
}

export function getProjectNumberError(value, projects) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const number = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(number) || number < 1) {
    return "Enter a positive whole number no greater than 9007199254740991.";
  }
  if (projects.some((project) => project.id === number)) {
    return `Project number ${number} is already in use. Choose another number.`;
  }
  return "";
}

export const milestones = [
  "First Meeting",
  "Measurement Feasibility",
  "X-ray Campaign Planned",
  "Beamtime Scheduled",
  "Data Collected",
  "Preliminary Data",
  "Intermediate Data",
  "Data Analysis Complete",
  "Final Deliverable",
];

export const requirements = [
  "Highlight Report",
  "Webpage Highlight (Optional)",
  "Other Requirement Milestones",
];

export const beamtimeMilestones = [
  "Beamtime Scheduled",
  "Data Collected",
  "Preliminary Data",
  "Data Analysis Complete",
];

export function isMilestoneComplete(project, index) {
  return index === 7
    ? (project.primaryAnalysisComplete ?? project.stage >= 7)
    : index <= project.stage;
}

export function canToggleMilestone(project, index) {
  if (index === 1) return false;
  if (index === 7) return project.stage >= 5;
  if (index === 8) {
    return (
      project.stage >= 7 &&
      isMilestoneComplete(project, 7) &&
      (project.beamtimes ?? []).every((beamtime) => beamtime.stage === 3)
    );
  }
  return index <= project.stage + 1;
}

export function getClearedProjectChecks(before, after) {
  const cleared = [];
  milestones.forEach((label, index) => {
    if (
      !isMilestoneComplete(before, index) ||
      isMilestoneComplete(after, index)
    )
      return;
    cleared.push(
      [3, 4, 5, 7].includes(index)
        ? `Beamtime 1: ${label}`
        : index === 1
          ? "Measurement feasibility milestone"
          : label,
    );
  });
  for (const [field, label] of [
    ["feasibility", "Measurement feasibility requirement"],
    ["defense", "Defense justification"],
  ]) {
    if (before[field] && !after[field]) cleared.push(label);
  }
  requirements.forEach((label, index) => {
    if (before.requirements[index] && !after.requirements[index])
      cleared.push(label);
  });
  (before.beamtimes ?? []).forEach((beamtime, index) => {
    const next = (after.beamtimes ?? []).find(
      (item) => item.id === beamtime.id,
    );
    if (!next) return;
    beamtimeMilestones.forEach((label, milestoneIndex) => {
      if (milestoneIndex <= beamtime.stage && milestoneIndex > next.stage) {
        cleared.push(`Beamtime ${index + 2}: ${label}`);
      }
    });
  });
  return cleared;
}

export const initialProjects = [
  {
    id: 845,
    name: "Laue Diffraction of Single Crystal Nickel Super Alloys",
    active: true,
    stage: -1,
    updated: "2026-05-26",
    protected: false,
  },
  {
    id: 756,
    name: "ITAR Residual Stress of Brazing Sample",
    active: false,
    stage: -1,
    updated: "2026-03-26",
    protected: true,
  },
  {
    id: 844,
    name: "Laue Diffraction of Single Crystal Nickel Super Alloys",
    active: true,
    stage: -1,
    updated: "2026-05-26",
    protected: false,
  },
  {
    id: 755,
    name: "ITAR Residual Stress of Brazing Sample",
    active: true,
    stage: -1,
    updated: "2026-03-26",
    protected: true,
  },
  {
    id: 843,
    name: "Laue Diffraction of Single Crystal Nickel Super Alloys",
    active: true,
    stage: -1,
    updated: "2026-05-26",
    protected: false,
  },
  {
    id: 754,
    name: "ITAR Residual Stress of Brazing Sample",
    active: false,
    stage: -1,
    updated: "2026-03-26",
    protected: true,
  },
].map((project) => ({
  ...project,
  requirements: [true, false, false],
  feasibility: false,
  defense: false,
  primaryAnalysisComplete: false,
  sample: project.active ? "At CHESS" : "Returned to client",
  primaryScientist: currentUser.id,
  externalContact: "Ricardo Perez",
  teamMembers: [],
  beamtimes: [],
  mainBeamtime: { cycle: "", btr: "" },
  isNew: false,
}));

export function loadProjects() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const saved = JSON.parse(
      current ?? localStorage.getItem(LEGACY_STORAGE_KEY),
    );
    if (
      Array.isArray(saved) &&
      saved.every(
        (p) =>
          Number.isSafeInteger(p.id) &&
          typeof p.name === "string" &&
          typeof p.active === "boolean" &&
          Number.isInteger(p.stage) &&
          p.stage >= -1 &&
          p.stage < milestones.length &&
          typeof p.updated === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(p.updated) &&
          Array.isArray(p.requirements) &&
          p.requirements.length === 3 &&
          p.requirements.every((v) => typeof v === "boolean"),
      )
    )
      return saved.map((project) => {
        const savedStage =
          current === null
            ? -1
            : project.stage >= 1 &&
                (project.feasibility === false || !project.defense)
              ? 0
              : project.stage;
        const primaryAnalysisComplete =
          savedStage >= 5 &&
          (typeof project.primaryAnalysisComplete === "boolean"
            ? project.primaryAnalysisComplete
            : savedStage >= 7);
        const stage =
          savedStage >= 7 && !primaryAnalysisComplete
            ? 6
            : savedStage === 6 && primaryAnalysisComplete
              ? 7
              : savedStage;
        const ids = new Set();
        const teamIds = new Set();
        const teamMembers = (
          Array.isArray(project.teamMembers) ? project.teamMembers : []
        )
          .filter((member) => {
            if (
              !member ||
              typeof member.id !== "string" ||
              !member.id ||
              teamIds.has(member.id) ||
              typeof member.fullName !== "string" ||
              !member.fullName.trim()
            )
              return false;
            teamIds.add(member.id);
            return true;
          })
          .map((member) => ({
            id: member.id,
            fullName: member.fullName.trim(),
            company:
              typeof member.company === "string" ? member.company.trim() : "",
          }));
        const beamtimes = (
          Array.isArray(project.beamtimes) ? project.beamtimes : []
        )
          .filter((beamtime) => {
            if (
              !beamtime ||
              typeof beamtime.id !== "string" ||
              !beamtime.id ||
              ids.has(beamtime.id)
            )
              return false;
            ids.add(beamtime.id);
            return true;
          })
          .map((beamtime) => ({
            id: beamtime.id,
            cycle: typeof beamtime.cycle === "string" ? beamtime.cycle : "",
            btr: typeof beamtime.btr === "string" ? beamtime.btr : "",
            stage:
              stage < 2 || !Number.isInteger(beamtime.stage)
                ? -1
                : Math.min(Math.max(-1, beamtime.stage), 3),
          }));
        return {
          ...project,
          teamMembers,
          primaryAnalysisComplete,
          stage:
            stage === 8 && beamtimes.some((beamtime) => beamtime.stage < 3)
              ? 7
              : stage,
          beamtimes,
          mainBeamtime: {
            cycle:
              typeof project.mainBeamtime?.cycle === "string"
                ? project.mainBeamtime.cycle
                : "",
            btr:
              typeof project.mainBeamtime?.btr === "string"
                ? project.mainBeamtime.btr
                : "",
          },
          feasibility:
            typeof project.feasibility === "boolean"
              ? project.feasibility
              : current !== null && project.stage >= 1,
          defense: !!project.defense,
          primaryScientist: scientists.some(
            (scientist) => scientist.id === project.primaryScientist,
          )
            ? project.primaryScientist
            : currentUser.id,
          externalContact:
            typeof project.externalContact === "string"
              ? project.externalContact
              : project.isNew
                ? ""
                : "Ricardo Perez",
        };
      });
  } catch {
    /* Start with example projects if browser storage is unavailable. */
  }
  return initialProjects;
}

export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
