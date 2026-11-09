import { useLayoutEffect, useRef, useState } from "react";
import Checkmark from "./Checkmark";
import MobileBeamtimeWorkflow from "./MobileBeamtimeWorkflow";
import { beamtimeMilestones } from "./data";

function BranchDot({ complete }) {
  return <span className="milestone-dot">{complete && <Checkmark />}</span>;
}

export function BeamtimeMeta({ beamtime, label }) {
  return (
    <span className="beamtime-meta">
      <span>{label}</span>
      {beamtime?.cycle && <span>Cycle: {beamtime.cycle}</span>}
      {beamtime?.btr && <span>BTR: {beamtime.btr}</span>}
    </span>
  );
}

function BranchConnectors({ branches, stage }) {
  const [geometry, setGeometry] = useState(null);
  const svgRef = useRef(null);

  useLayoutEffect(() => {
    const map = svgRef.current?.closest(".workflow-map");
    if (!map) return;
    function measure() {
      if (!window.matchMedia("(min-width: 1101px)").matches) {
        setGeometry(null);
        return;
      }
      const bounds = map.getBoundingClientRect();
      const center = (element) => {
        const box = element.getBoundingClientRect();
        return {
          x: box.left - bounds.left + box.width / 2,
          y: box.top - bounds.top + box.height / 2,
          radius: box.width / 2,
        };
      };
      const campaign = map.querySelector(
        ".timeline > li:nth-child(3) .milestone-dot",
      );
      const primary = map.querySelector(
        ".timeline > li:nth-child(4) .milestone-dot",
      );
      const deliverable = map.querySelector(
        ".timeline > li:nth-child(9) .milestone-dot",
      );
      const analysisDots = [
        ...map.querySelectorAll(
          ".beamtime-branch .branch-step-3 .milestone-dot",
        ),
      ];
      const dots = [
        ...map.querySelectorAll(
          ".beamtime-branch .branch-step-0 .milestone-dot",
        ),
      ];
      if (
        !campaign ||
        !primary ||
        !deliverable ||
        dots.length !== branches.length ||
        analysisDots.length !== branches.length
      )
        return;
      const start = center(campaign);
      const end = center(primary);
      const final = center(deliverable);
      const startX = start.x + start.radius - 0.5;
      const junctionX = start.x + (end.x - start.x) / 4;
      const radius = Math.min(14, Math.max(2, (junctionX - startX) * 0.7));
      setGeometry({
        width: bounds.width,
        height: bounds.height,
        primary: `M ${startX} ${start.y} H ${end.x - end.radius + 0.5}`,
        paths: dots.map((dot, index) => {
          const target = center(dot);
          const analysis = center(analysisDots[index]);
          const deliveryRadius = Math.min(14, (final.x - analysis.x) / 4);
          return {
            id: branches[index].id,
            scheduled: stage >= 2 && branches[index].stage >= 0,
            delivered: stage === 8 && branches[index].stage === 3,
            deliveryPath: `M ${analysis.x + analysis.radius - 0.5} ${analysis.y} H ${final.x - deliveryRadius} A ${deliveryRadius} ${deliveryRadius} 0 0 0 ${final.x} ${analysis.y - deliveryRadius} V ${final.y + final.radius - 0.5}`,
            path: `M ${startX} ${start.y} H ${junctionX - radius} A ${radius} ${radius} 0 0 1 ${junctionX} ${start.y + radius} V ${target.y - radius} A ${radius} ${radius} 0 0 0 ${junctionX + radius} ${target.y} H ${target.x - target.radius + 0.5}`,
          };
        }),
      });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(map);
    return () => observer.disconnect();
  }, [branches, stage]);

  return (
    <svg
      ref={svgRef}
      className="beamtime-connectors"
      viewBox={
        geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined
      }
      aria-hidden="true"
      focusable="false"
    >
      {geometry && (
        <g
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g stroke="var(--line)">
            <path d={geometry.primary} />
            {geometry.paths.map((path) => (
              <path key={path.id} d={path.path} />
            ))}
            {geometry.paths.map((path) => (
              <path key={`deliverable-${path.id}`} d={path.deliveryPath} />
            ))}
          </g>
          <g stroke="var(--purple)">
            {geometry.paths
              .filter((path) => path.scheduled)
              .map((path) => (
                <path key={path.id} d={path.path} />
              ))}
            {stage >= 3 && <path d={geometry.primary} />}
            {geometry.paths
              .filter((path) => path.delivered)
              .map((path) => (
                <path key={`deliverable-${path.id}`} d={path.deliveryPath} />
              ))}
          </g>
        </g>
      )}
    </svg>
  );
}

export default function BeamtimeBranches({
  project,
  onUpdate,
  onUndo,
  onPrimaryToggle,
  onFeasibilityChange,
  children,
}) {
  const branches = project.beamtimes ?? [];
  const dialogRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [cycle, setCycle] = useState("");
  const [btr, setBtr] = useState("");
  const [deleting, setDeleting] = useState(null);
  const deleteDialogRef = useRef(null);
  const addButtonRef = useRef(null);

  function openEditor(id = null) {
    const beamtime =
      id === "primary"
        ? project.mainBeamtime
        : branches.find((branch) => branch.id === id);
    setEditing(id);
    setCycle(beamtime?.cycle ?? "");
    setBtr(beamtime?.btr ?? "");
    dialogRef.current.showModal();
    dialogRef.current.querySelector("input")?.focus();
  }
  function save(event) {
    event.preventDefault();
    const details = { cycle: cycle.trim(), btr: btr.trim() };
    if (editing === "primary") {
      onUpdate({ mainBeamtime: details });
    } else if (editing) {
      onUpdate({
        beamtimes: branches.map((branch) =>
          branch.id === editing ? { ...branch, ...details } : branch,
        ),
      });
    } else {
      onUpdate({
        beamtimes: [
          ...branches,
          { id: crypto.randomUUID(), ...details, stage: -1 },
        ],
        stage: Math.min(project.stage, 7),
      });
    }
    dialogRef.current.close();
  }
  function updateProgress(id, index) {
    const branch = branches.find((item) => item.id === id);
    if (!branch || project.stage < 2 || index > branch.stage + 1) return;
    const changes = {
      beamtimes: branches.map((item) =>
        item.id === id
          ? { ...item, stage: index <= item.stage ? index - 1 : index }
          : item,
      ),
      stage: Math.min(project.stage, 7),
    };
    if (index <= branch.stage) {
      onUndo(
        changes,
        `Beamtime ${branches.findIndex((item) => item.id === id) + 2}: ${beamtimeMilestones[index]}`,
      );
    } else onUpdate(changes);
  }
  function deleteBranch() {
    onUpdate({
      beamtimes: branches.filter((branch) => branch.id !== deleting.id),
    });
    deleteDialogRef.current.close();
    addButtonRef.current?.focus();
  }
  function requestDelete(id, label) {
    setDeleting({ id, label });
    deleteDialogRef.current.showModal();
  }

  return (
    <>
      <div className={`workflow-map ${branches.length ? "has-branches" : ""}`}>
        {branches.length > 0 && (
          <>
            <BranchConnectors branches={branches} stage={project.stage} />
            <span
              className="workflow-shared-guide collected-guide"
              aria-hidden="true"
            />
            <span
              className="workflow-shared-guide intermediate-guide"
              aria-hidden="true"
            />
          </>
        )}
        {children(() => openEditor("primary"))}
        <MobileBeamtimeWorkflow
          project={project}
          onPrimaryToggle={onPrimaryToggle}
          onFeasibilityChange={onFeasibilityChange}
          onBranchProgress={updateProgress}
          onEdit={openEditor}
          onDelete={requestDelete}
        />
        {branches.length > 0 && (
          <div className="extra-beamtimes" aria-label="Additional beamtimes">
            {branches.map((branch, branchIndex) => {
              const label = `Beamtime ${branchIndex + 2}`;
              return (
                <section
                  key={branch.id}
                  className="beamtime-branch"
                  aria-label={`${label}${branch.cycle ? `, cycle ${branch.cycle}` : ""}`}
                >
                  <ol className="branch-timeline">
                    {beamtimeMilestones.map((milestone, index) => (
                      <li
                        key={milestone}
                        className={`branch-step branch-step-${index} ${index <= branch.stage ? "complete" : ""} ${index === branch.stage ? "current" : ""}`}
                      >
                        <button
                          className="milestone-button"
                          onClick={() => updateProgress(branch.id, index)}
                          disabled={
                            project.stage < 2 || index > branch.stage + 1
                          }
                          aria-pressed={index <= branch.stage}
                          aria-label={`${label}: ${milestone}, ${index <= branch.stage ? "complete" : "incomplete"}`}
                        >
                          <BranchDot complete={index <= branch.stage} />
                          <span className="milestone-label">{milestone}</span>
                        </button>
                        {index === 0 && (
                          <div className="beamtime-caption">
                            <BeamtimeMeta beamtime={branch} label={label} />
                            <div className="branch-actions">
                              <button
                                type="button"
                                onClick={() => openEditor(branch.id)}
                                aria-label={`Edit ${label}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="delete-branch"
                                aria-label={`Delete ${label}`}
                                onClick={() => requestDelete(branch.id, label)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
      </div>
      <div className="beamtime-workflow-actions">
        <button
          ref={addButtonRef}
          type="button"
          className="button primary"
          onClick={() => openEditor()}
        >
          + Add beamtime
        </button>
        <span>
          {branches.length + 1} {branches.length ? "beamtimes" : "beamtime"}
        </span>
      </div>
      <dialog
        ref={dialogRef}
        className="project-dialog beamtime-dialog"
        aria-labelledby="beamtime-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="dialog-content">
          <h2 id="beamtime-dialog-title">
            {editing ? "Edit beamtime" : "Add beamtime"}
          </h2>
          <p>
            {editing
              ? "Update the cycle and BTR for this beamtime."
              : "Add another beamtime branch after X-ray Campaign Planned. Cycle and BTR can be added now or later."}
          </p>
          <form onSubmit={save}>
            <label htmlFor="beamtime-cycle">Cycle (optional)</label>
            <input
              id="beamtime-cycle"
              value={cycle}
              onChange={(event) => setCycle(event.target.value)}
              placeholder="e.g. 2026-1"
            />
            <div className="dialog-field">
              <label htmlFor="beamtime-btr">BTR (optional)</label>
              <input
                id="beamtime-btr"
                value={btr}
                onChange={(event) => setBtr(event.target.value)}
                placeholder="e.g. zang-3452-b"
              />
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => dialogRef.current.close()}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                {editing ? "Save beamtime" : "Add beamtime"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
      <dialog
        ref={deleteDialogRef}
        className="project-dialog"
        aria-labelledby="delete-beamtime-title"
        onClose={() => addButtonRef.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="dialog-content">
          <h2 id="delete-beamtime-title">
            Delete {deleting?.label?.toLowerCase()}?
          </h2>
          <p>
            This removes this beamtime branch and its progress. The other
            beamtimes will be kept.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => deleteDialogRef.current.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button danger"
              onClick={deleteBranch}
            >
              Delete beamtime
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
