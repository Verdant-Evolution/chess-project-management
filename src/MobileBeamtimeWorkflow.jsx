import { useState } from "react";
import Checkmark from "./Checkmark";
import {
  beamtimeMilestones,
  isMilestoneComplete,
  canToggleMilestone,
} from "./data";

const primaryMilestoneIndexes = [3, 4, 5, 6, 7];

function MilestoneButton({ label, checked, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`mobile-milestone ${checked ? "is-complete" : ""}`}
      aria-pressed={checked}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="mobile-stage-dot">{checked && <Checkmark />}</span>
      <span>{label}</span>
    </button>
  );
}

export default function MobileBeamtimeWorkflow({
  project,
  onPrimaryToggle,
  onFeasibilityChange,
  onBranchProgress,
  onEdit,
  onDelete,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const additional = project.beamtimes ?? [];
  const beamtimes = [
    { ...project.mainBeamtime, id: "primary", primary: true },
    ...additional,
  ];

  return (
    <div className="mobile-beamtime-workflow">
      <section className="mobile-shared-checkpoints" aria-label="Project setup">
        <MilestoneButton
          label="First Meeting"
          checked={project.stage >= 0}
          onClick={() => onPrimaryToggle(0)}
        />
        <div className="mobile-feasibility">
          <div
            className={`mobile-feasibility-heading ${project.stage >= 1 ? "is-complete" : ""}`}
          >
            <span
              className="mobile-stage-dot"
              role="img"
              aria-label={`Measurement Feasibility: ${project.stage >= 1 ? "complete" : "incomplete"}. Automatically completed when both requirements are checked.`}
            >
              {project.stage >= 1 && <Checkmark />}
            </span>
            <span>Feasibility requirements</span>
          </div>
          {[
            ["feasibility", "Measurement feasibility"],
            ["defense", "Defense justification"],
          ].map(([field, label]) => (
            <label key={field} className="checkbox-row">
              <input
                type="checkbox"
                checked={!!project[field]}
                disabled={project.stage < 0}
                onChange={(event) =>
                  onFeasibilityChange(field, event.target.checked)
                }
              />
              <span className="custom-checkbox">
                <Checkmark />
              </span>
              <span>{label}</span>
            </label>
          ))}
        </div>
        <MilestoneButton
          label="X-ray Campaign Planned"
          checked={project.stage >= 2}
          disabled={project.stage < 1}
          onClick={() => onPrimaryToggle(2)}
        />
      </section>
      <section className="mobile-beamtimes" aria-label="Beamtimes">
        <h3>
          Beamtimes <span>{beamtimes.length}</span>
        </h3>
        {beamtimes.map((beamtime, index) => {
          const label = `Beamtime ${index + 1}`;
          const completed = beamtime.primary
            ? primaryMilestoneIndexes.filter((milestone) =>
                isMilestoneComplete(project, milestone),
              ).length
            : beamtime.stage + 1;
          const expanded = expandedId === beamtime.id;
          const panelId = `mobile-beamtime-${beamtime.id}`;
          return (
            <section
              key={beamtime.id}
              className="mobile-beamtime-card"
              aria-label={label}
            >
              <button
                type="button"
                className="beamtime-summary"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpandedId(expanded ? null : beamtime.id)}
              >
                <span className="beamtime-summary-heading">
                  <strong>{label}</strong>
                  <span
                    className={
                      completed === beamtimeMilestones.length
                        ? "beamtime-count-complete"
                        : ""
                    }
                  >
                    {completed}/{beamtimeMilestones.length} complete
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </span>
                <span className="beamtime-summary-identifiers">
                  <span>Cycle: {beamtime.cycle || "Not set"}</span>
                  <span>BTR: {beamtime.btr || "Not set"}</span>
                </span>
              </button>
              <div className="mobile-beamtime-footer">
                <span>
                  {completed
                    ? beamtimeMilestones[completed - 1]
                    : "Not started"}
                </span>
                <div className="branch-actions">
                  <button
                    type="button"
                    aria-label={`Edit ${label}`}
                    onClick={() => onEdit(beamtime.id)}
                  >
                    Edit
                  </button>
                  {!beamtime.primary && (
                    <button
                      type="button"
                      className="delete-branch"
                      aria-label={`Delete ${label}`}
                      onClick={() => onDelete(beamtime.id, label)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div
                id={panelId}
                className="mobile-beamtime-controls"
                hidden={!expanded}
              >
                {beamtimeMilestones.map((milestone, milestoneIndex) => {
                  const primaryIndex = primaryMilestoneIndexes[milestoneIndex];
                  const checked = beamtime.primary
                    ? isMilestoneComplete(project, primaryIndex)
                    : beamtime.stage >= milestoneIndex;
                  const disabled = beamtime.primary
                    ? !canToggleMilestone(project, primaryIndex)
                    : project.stage < 2 || milestoneIndex > beamtime.stage + 1;
                  return (
                    <MilestoneButton
                      key={milestone}
                      label={milestone}
                      checked={checked}
                      disabled={disabled}
                      onClick={() =>
                        beamtime.primary
                          ? onPrimaryToggle(primaryIndex)
                          : onBranchProgress(beamtime.id, milestoneIndex)
                      }
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>
      <section
        className="mobile-shared-checkpoints mobile-shared-deliverables"
        aria-label="Project delivery"
      >
        <MilestoneButton
          label="Final Deliverable"
          checked={project.stage >= 8}
          disabled={!canToggleMilestone(project, 8)}
          onClick={() => onPrimaryToggle(8)}
        />
      </section>
    </div>
  );
}
