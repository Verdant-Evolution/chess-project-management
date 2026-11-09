import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  STORAGE_KEY,
  SITE_TITLE,
  scientists,
  currentUser,
  getNextProjectNumber,
  getProjectNumberError,
  matchesProjectSearch,
  isMilestoneComplete,
  canToggleMilestone,
  getClearedProjectChecks,
  milestones,
  requirements,
  loadProjects,
  today,
  formatDate,
} from "./data";
import "./styles.css";
import BeamtimeBranches, { BeamtimeMeta } from "./BeamtimeBranches";
import Checkmark from "./Checkmark";
import ProjectTeam from "./ProjectTeam";

function Icon({ name, size = 20, ...props }) {
  if (name === "check") return <Checkmark size={size} {...props} />;
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    back: <path d="m15 5-7 7 7 7" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z" />,
    user: (
      <>
        <circle cx="12" cy="7.5" r="3.5" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M2 20v-2a7 7 0 0 1 14 0v2M16 4a3 3 0 0 1 0 6M19 14a6 6 0 0 1 3 5" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v10l9 5 9-5V8M12 13v10M7.5 5.5l9 5" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

function Status({ active }) {
  return (
    <span className={`status ${active ? "active" : "inactive"}`}>
      <span />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function NewProjectDialog({ dialogRef, projects, onCreate, onClose }) {
  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [containsProtectedData, setContainsProtectedData] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const numberError =
    getProjectNumberError(projectNumber, projects) || submitError;
  const nextNumber = getNextProjectNumber(projects);
  return (
    <dialog
      ref={dialogRef}
      className="project-dialog"
      onClose={() => {
        setName("");
        setProjectNumber("");
        setContainsProtectedData(false);
        setSubmitError("");
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div className="dialog-content">
        <div className="dialog-top">
          <span className="icon-tile">
            <Icon name="folder" size={24} />
          </span>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => dialogRef.current.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="dialog-title">Start a new project</h2>
        <p id="dialog-description">
          Give your project a name. You can manage its milestones and
          requirements on the next page.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim() && !numberError) {
              const error = onCreate(
                name.trim(),
                projectNumber,
                containsProtectedData,
              );
              if (error) {
                setSubmitError(error);
                return;
              }
              dialogRef.current.close();
            }
          }}
        >
          <label htmlFor="project-name">
            Project name <span className="required">*</span>
          </label>
          <input
            autoFocus
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Residual Stress Analysis"
            maxLength={160}
            required
          />
          <span className="field-hint">
            A clear, descriptive name helps your team find this project.
          </span>
          <div className="dialog-field">
            <label htmlFor="project-number">Project number (optional)</label>
            <input
              id="project-number"
              type="text"
              inputMode="numeric"
              value={projectNumber}
              onChange={(event) => {
                setProjectNumber(event.target.value);
                setSubmitError("");
              }}
              placeholder={`Automatic (${nextNumber})`}
              aria-invalid={Boolean(numberError)}
              aria-describedby={`project-number-hint${numberError ? " project-number-error" : ""}`}
            />
            <span className="field-hint" id="project-number-hint">
              Leave blank to automatically assign MSN-C #{nextNumber}.
            </span>
            {numberError && (
              <p className="field-error" id="project-number-error" role="alert">
                {numberError}
              </p>
            )}
          </div>
          <label className="checkbox-row protected-data-choice">
            <input
              type="checkbox"
              checked={containsProtectedData}
              onChange={(event) =>
                setContainsProtectedData(event.target.checked)
              }
            />
            <span className="custom-checkbox">
              <Icon name="check" size={13} />
            </span>
            <span>Contains protected data</span>
          </label>
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => dialogRef.current.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={!name.trim() || Boolean(numberError)}
            >
              Create project
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function getLastMilestone(project) {
  if (project.stage === -1) return "Project created";
  if (project.stage < 7 && isMilestoneComplete(project, 7))
    return milestones[7];
  return project.stage === milestones.length - 1
    ? "Data Delivered"
    : milestones[project.stage];
}

function getPrimaryScientistName(project) {
  return (
    scientists.find((person) => person.id === project.primaryScientist)?.name ??
    "Not assigned"
  );
}

function Dashboard({ projects, onNew, onDelete }) {
  const [hideInactive, setHideInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingProject, setDeletingProject] = useState(null);
  const deleteDialogRef = useRef(null);
  const deleteTriggerRef = useRef(null);
  const projectsTitleRef = useRef(null);
  function requestDelete(project, event) {
    deleteTriggerRef.current = event.currentTarget;
    setDeletingProject(project);
    deleteDialogRef.current.showModal();
  }
  function confirmDelete() {
    if (!deletingProject) return;
    onDelete(deletingProject.id);
    deleteDialogRef.current.close();
  }
  const visible = projects.filter(
    (p) => (!hideInactive || p.active) && matchesProjectSearch(p, search),
  );
  const activeCount = projects.filter((p) => p.active).length;
  return (
    <>
      <section className="profile-strip" aria-label="Your profile">
        <div className="profile-person">
          <div className="avatar">KN</div>
          <div>
            <strong>{currentUser.name}</strong>
            <span>MSN-C {currentUser.role}</span>
          </div>
        </div>
        <div className="profile-meta">
          <span>ACTIVE SINCE</span>
          <strong>2019 - Present</strong>
        </div>
        <div className="profile-meta">
          <span>CLASSE ID</span>
          <strong>ken38</strong>
        </div>
        <div className="profile-summary">
          <span className="tiny-dot" />
          <strong>{activeCount} active projects</strong>
          <span>of {projects.length} total</span>
        </div>
      </section>
      <section className="projects-section" aria-labelledby="projects-title">
        <div className="section-toolbar">
          <div className="section-title">
            <h2 id="projects-title" ref={projectsTitleRef} tabIndex={-1}>
              Your projects
            </h2>
            <span className="count">{projects.length}</span>
          </div>
          <div className="table-controls">
            <label className="search-field">
              <Icon name="search" size={17} />
              <input
                aria-label="Search projects"
                title="Search by project title, number, scientist, or external contact"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button className="button primary new-project" onClick={onNew}>
              <Icon name="plus" size={17} />
              New Project
            </button>
            <label className="toggle-label">
              <input
                type="checkbox"
                role="switch"
                checked={hideInactive}
                onChange={(e) => setHideInactive(e.target.checked)}
              />
              <span className="toggle" />
              <span>Hide inactive</span>
            </label>
          </div>
        </div>
        <div className="table-scroll project-table">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Project #</th>
                <th className="project-title-column">Project title</th>
                <th>Primary scientist</th>
                <th>Last milestone</th>
                <th>Last updated</th>
                <th>
                  <span className="sr-only">Project actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Status active={p.active} />
                  </td>
                  <td>
                    <a className="project-id" href={`#/projects/${p.id}`}>
                      MSN-C #{p.id}
                    </a>
                  </td>
                  <td>
                    <a className="project-name" href={`#/projects/${p.id}`}>
                      {p.name}
                    </a>
                  </td>
                  <td>
                    <span className="scientist-cell">
                      {getPrimaryScientistName(p)}
                    </span>
                  </td>
                  <td>
                    <span className="milestone-cell">
                      {getLastMilestone(p)}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(p.updated)}</td>
                  <td>
                    <div className="project-row-actions">
                      <button
                        type="button"
                        className="delete-project"
                        aria-label={`Delete project MSN-C #${p.id}`}
                        onClick={(event) => requestDelete(p, event)}
                      >
                        Delete
                      </button>
                      <a
                        className="row-arrow"
                        href={`#/projects/${p.id}`}
                        aria-label={`Open ${p.name}`}
                      >
                        <Icon name="arrow" size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="project-cards" aria-label="Projects">
          {visible.map((p) => (
            <li key={p.id}>
              <a className="project-card" href={`#/projects/${p.id}`}>
                <div className="project-card-header">
                  <span className="card-project-number">MSN-C #{p.id}</span>
                  <Status active={p.active} />
                  <Icon name="arrow" size={16} />
                </div>
                <h3>{p.name}</h3>
                <dl className="project-card-details">
                  <div className="card-scientist">
                    <dt>Primary scientist</dt>
                    <dd>{getPrimaryScientistName(p)}</dd>
                  </div>
                  <div>
                    <dt>Last milestone</dt>
                    <dd>{getLastMilestone(p)}</dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{formatDate(p.updated)}</dd>
                  </div>
                </dl>
              </a>
              <button
                type="button"
                className="delete-project mobile-delete-project"
                aria-label={`Delete project MSN-C #${p.id}`}
                onClick={(event) => requestDelete(p, event)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        {visible.length === 0 && (
          <div className="empty-state">
            <Icon name={projects.length ? "search" : "folder"} size={28} />
            <h3>{projects.length ? "No projects found" : "No projects yet"}</h3>
            <p>
              {projects.length
                ? "Try a different search or show inactive projects."
                : "Create your first project to get started."}
            </p>
            {projects.length > 0 && (
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setHideInactive(false);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        <div className="table-footer">
          <span>
            Showing {visible.length} of {projects.length} projects
          </span>
        </div>
      </section>
      <dialog
        ref={deleteDialogRef}
        className="project-dialog"
        aria-labelledby="delete-project-title"
        aria-describedby="delete-project-description"
        onClose={() => {
          if (deleteTriggerRef.current?.isConnected)
            deleteTriggerRef.current.focus();
          else projectsTitleRef.current?.focus();
          setDeletingProject(null);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="dialog-content">
          <h2 id="delete-project-title">Delete project?</h2>
          <p id="delete-project-description">
            <strong>
              MSN-C #{deletingProject?.id}: {deletingProject?.name}
            </strong>
            <br />
            This will remove the entire project, including all beamtimes and
            progress. This cannot be undone.
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
              onClick={confirmDelete}
            >
              Delete project
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function ProjectDetail({ project, onUpdate }) {
  const p = project;
  const beamtimes = p.beamtimes ?? [];
  const unfinishedBeamtimes = beamtimes.some((beamtime) => beamtime.stage < 3);
  const undoDialogRef = useRef(null);
  const statusDialogRef = useRef(null);
  const [pendingUndo, setPendingUndo] = useState(null);
  function requestUndo(changes, label) {
    const cleared = getClearedProjectChecks(p, { ...p, ...changes });
    if (!cleared.length) {
      onUpdate(changes);
      return;
    }
    setPendingUndo({ changes, label, cleared });
    undoDialogRef.current.showModal();
  }
  function updateChecks(changes, undoLabel) {
    if (undoLabel) requestUndo(changes, undoLabel);
    else onUpdate(changes);
  }
  function toggleMilestone(index) {
    if (!canToggleMilestone(p, index)) return;
    const undoLabel = isMilestoneComplete(p, index) ? milestones[index] : null;
    if (index === 7) {
      const primaryAnalysisComplete = !isMilestoneComplete(p, 7);
      updateChecks(
        {
          primaryAnalysisComplete,
          stage: p.stage >= 6 ? (primaryAnalysisComplete ? 7 : 6) : p.stage,
        },
        undoLabel,
      );
      return;
    }
    if (index === 6) {
      updateChecks(
        { stage: p.stage >= 6 ? 5 : isMilestoneComplete(p, 7) ? 7 : 6 },
        undoLabel,
      );
      return;
    }
    const stage = index <= p.stage ? index - 1 : index;
    updateChecks(
      {
        stage,
        ...(stage < 1 ? { feasibility: false, defense: false } : {}),
        ...(stage < 5 ? { primaryAnalysisComplete: false } : {}),
        ...(stage < 2
          ? {
              beamtimes: beamtimes.map((beamtime) => ({
                ...beamtime,
                stage: -1,
              })),
            }
          : {}),
      },
      undoLabel,
    );
  }
  function updateFeasibility(field, checked) {
    if (p.stage < 0) return;
    const feasibility = field === "feasibility" ? checked : p.feasibility;
    const defense = field === "defense" ? checked : p.defense;
    updateChecks(
      {
        feasibility,
        defense,
        stage: feasibility && defense ? Math.max(1, p.stage) : 0,
        ...(!(feasibility && defense)
          ? {
              primaryAnalysisComplete: false,
              beamtimes: beamtimes.map((beamtime) => ({
                ...beamtime,
                stage: -1,
              })),
            }
          : {}),
      },
      !checked
        ? field === "feasibility"
          ? "Measurement feasibility"
          : "Defense justification"
        : null,
    );
  }
  return (
    <>
      <a className="back-link" href="#/">
        <Icon name="back" size={15} />
        Back to projects
      </a>
      <div className="detail-heading">
        <div className="detail-topline">
          <div className="eyebrow">MSN-C #{p.id}</div>
          <button
            type="button"
            className="project-status-control"
            aria-label={`Change project status (currently ${p.active ? "active" : "inactive"})`}
            aria-haspopup="dialog"
            aria-controls="project-status-dialog"
            title="Change project status"
            onClick={() => statusDialogRef.current.showModal()}
          >
            <Status active={p.active} />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <span className="detail-updated">
            Updated {formatDate(p.updated)}
          </span>
        </div>
        <h1>{p.name}</h1>
      </div>
      <div className="data-statement">
        <Icon name="shield" size={22} />
        <div>
          <strong>Data statement</strong>
          <p>
            {p.protected
              ? "This project has ITAR, EAR, CUI, or other protected data status. No sensitive information is included on this webportal."
              : "This project requires data to be reviewed and released before made publicly available. No sensitive information is included on this webportal."}
          </p>
        </div>
      </div>
      <section className="progress-section" aria-labelledby="progress-title">
        <div className="section-toolbar">
          <div>
            <h2 id="progress-title">Project milestones</h2>
          </div>
          <span className="progress-count">
            <strong>
              {milestones.filter((_, index) => isMilestoneComplete(p, index))
                .length +
                beamtimes.reduce(
                  (count, beamtime) => count + beamtime.stage + 1,
                  0,
                )}
            </strong>{" "}
            / {milestones.length + beamtimes.length * 4} complete
          </span>
        </div>
        <BeamtimeBranches
          project={p}
          onUpdate={onUpdate}
          onUndo={requestUndo}
          onPrimaryToggle={toggleMilestone}
          onFeasibilityChange={updateFeasibility}
        >
          {(editPrimaryBeamtime) => (
            <div className="timeline-scroll">
              <ol className="timeline">
                {milestones.map((milestone, index) => (
                  <li
                    key={milestone}
                    className={`${isMilestoneComplete(p, index) ? "complete" : ""} ${index === p.stage ? "current" : ""}`}
                  >
                    {index === 1 ? (
                      <>
                        <div className="milestone-button automatic-milestone">
                          <span
                            className="milestone-dot"
                            role="img"
                            aria-label={`Measurement Feasibility: ${p.stage >= 1 ? "complete" : "incomplete"}. Automatically completed when both requirements are checked.`}
                          >
                            {p.stage >= 1 && <Icon name="check" size={13} />}
                          </span>
                        </div>
                        <div className="feasibility-checks">
                          {[
                            ["feasibility", "Measurement feasibility"],
                            ["defense", "Defense justification"],
                          ].map(([field, label]) => (
                            <label key={field} className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={!!p[field]}
                                disabled={p.stage < 0}
                                onChange={(event) =>
                                  updateFeasibility(field, event.target.checked)
                                }
                              />
                              <span className="custom-checkbox">
                                <Icon name="check" size={13} />
                              </span>
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleMilestone(index)}
                        disabled={!canToggleMilestone(p, index)}
                        className="milestone-button"
                        aria-label={`${milestone}: ${isMilestoneComplete(p, index) ? "complete" : "incomplete"}. ${isMilestoneComplete(p, index) ? (index === 7 ? "Undo analysis for Beamtime 1" : index === 6 ? "Undo Intermediate Data" : "Undo this and later milestones") : index === 8 && unfinishedBeamtimes ? "Complete data analysis for every beamtime first" : !canToggleMilestone(p, index) ? `Complete ${milestones[index === 7 ? 5 : index - 1]} first` : "Complete milestone"}.`}
                        aria-pressed={isMilestoneComplete(p, index)}
                      >
                        <span className="milestone-dot">
                          {isMilestoneComplete(p, index) && (
                            <Icon name="check" size={13} />
                          )}
                        </span>
                        <span className="milestone-label">{milestone}</span>
                      </button>
                    )}
                    {index === 3 && (
                      <div className="beamtime-caption">
                        <BeamtimeMeta
                          beamtime={p.mainBeamtime}
                          label="Beamtime 1"
                        />
                        <div className="branch-actions">
                          <button
                            type="button"
                            aria-label="Edit Beamtime 1"
                            onClick={editPrimaryBeamtime}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </BeamtimeBranches>
      </section>
      <div className="requirements-grid">
        <section className="requirements-card">
          <div className="card-heading">
            <span className="icon-tile small">
              <Icon name="check" size={19} />
            </span>
            <h2>Program requirements</h2>
            <span className="card-count">
              {p.requirements.filter(Boolean).length} of 3
            </span>
          </div>
          <div className="checkbox-list">
            {requirements.map((requirement, index) => (
              <label key={requirement} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={p.requirements[index]}
                  onChange={() =>
                    updateChecks(
                      {
                        requirements: p.requirements.map((value, i) =>
                          i === index ? !value : value,
                        ),
                      },
                      p.requirements[index] ? requirement : null,
                    )
                  }
                />
                <span className="custom-checkbox">
                  <Icon name="check" size={13} />
                </span>
                <span>{requirement}</span>
              </label>
            ))}
          </div>
        </section>
        <section
          className="requirements-card project-info-card"
          aria-labelledby="project-info-title"
        >
          <div className="card-heading">
            <span className="icon-tile small">
              <Icon name="team" size={19} />
            </span>
            <h2 id="project-info-title">Project details</h2>
          </div>
          <div className="contacts-grid" aria-label="Project team and sample">
            <ProjectTeam
              project={p}
              onUpdate={onUpdate}
              icon={<Icon name="team" size={24} />}
            />
            <div className="contact-card">
              <Icon name="user" size={24} />
              <div>
                <label className="contact-label" htmlFor="primary-scientist">
                  PRIMARY SCIENTIST
                </label>
                <select
                  id="primary-scientist"
                  className="contact-field"
                  value={p.primaryScientist}
                  onChange={(e) =>
                    onUpdate({ primaryScientist: e.target.value })
                  }
                >
                  {scientists.map((scientist) => (
                    <option key={scientist.id} value={scientist.id}>
                      {scientist.name} - {scientist.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="contact-card">
              <Icon name="user" size={24} />
              <div>
                <label className="contact-label" htmlFor="external-contact">
                  EXTERNAL CONTACT
                </label>
                <input
                  id="external-contact"
                  className="contact-field"
                  type="text"
                  value={p.externalContact}
                  placeholder="Enter contact name"
                  onChange={(e) =>
                    onUpdate({ externalContact: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="contact-card">
              <Icon name="box" size={24} />
              <div>
                <label className="contact-label" htmlFor="sample-status">
                  SAMPLE STATUS
                </label>
                <select
                  id="sample-status"
                  value={p.sample}
                  onChange={(e) => onUpdate({ sample: e.target.value })}
                >
                  <option>Awaiting Shipment to CHESS</option>
                  <option>At CHESS</option>
                  <option>In Analysis</option>
                  <option>Returned to Client</option>
                  <option>Donated to Thrift Store</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>
      <dialog
        ref={statusDialogRef}
        id="project-status-dialog"
        className="project-dialog"
        aria-labelledby="project-status-title"
        aria-describedby="project-status-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="dialog-content">
          <h2 id="project-status-title">
            {p.active ? "Mark project inactive?" : "Reactivate project?"}
          </h2>
          <p id="project-status-description">
            Change{" "}
            <strong>
              MSN-C #{p.id}: {p.name}
            </strong>{" "}
            to {p.active ? "inactive" : "active"}?
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => statusDialogRef.current.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                onUpdate({ active: !p.active });
                statusDialogRef.current.close();
              }}
            >
              {p.active ? "Mark inactive" : "Mark active"}
            </button>
          </div>
        </div>
      </dialog>
      <dialog
        ref={undoDialogRef}
        className="project-dialog"
        aria-labelledby="undo-checks-title"
        aria-describedby="undo-checks-description"
        onClose={() => setPendingUndo(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="dialog-content">
          <h2 id="undo-checks-title">Undo completed checks?</h2>
          <p id="undo-checks-description">
            Unchecking <strong>{pendingUndo?.label}</strong> will clear the
            completed items below, including dependent progress. Do you want to
            continue?
          </p>
          <ul
            className="undo-check-list"
            aria-label="Completed checks to clear"
          >
            {pendingUndo?.cleared.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => undoDialogRef.current.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button danger"
              onClick={() => {
                if (!pendingUndo) return;
                onUpdate(pendingUndo.changes);
                undoDialogRef.current.close();
              }}
            >
              Undo checks
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#171310" : "#ffffff");
    try {
      localStorage.setItem("project-management-theme", theme);
    } catch {
      /* Keep theme usable when storage is unavailable. */
    }
  }, [theme]);
  const [projects, setProjects] = useState(loadProjects);
  const [route, setRoute] = useState(window.location.hash);
  const [storageError, setStorageError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef(null);
  const mainRef = useRef(null);
  const projectId = /^#\/projects\/(\d+)$/.exec(route)?.[1];
  const project = projects.find((p) => p.id === Number(projectId));
  const isDashboard = !route || route === "#/" || route === "#";
  const HeaderTitle = isDashboard ? "h1" : "span";
  useEffect(() => {
    const listener = () => {
      setRoute(window.location.hash);
      window.scrollTo(0, 0);
      mainRef.current?.focus();
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [projects]);
  useEffect(() => {
    document.title = SITE_TITLE;
  }, []);
  function createProject(
    name,
    projectNumber = "",
    containsProtectedData = false,
  ) {
    const error = getProjectNumberError(projectNumber, projects);
    if (error) return error;
    const id = projectNumber.trim()
      ? Number(projectNumber)
      : getNextProjectNumber(projects);
    setProjects((current) => [
      {
        id,
        name,
        active: true,
        stage: -1,
        updated: today(),
        protected: containsProtectedData,
        requirements: [false, false, false],
        feasibility: false,
        defense: false,
        primaryAnalysisComplete: false,
        sample: "Not received",
        primaryScientist: currentUser.id,
        externalContact: "",
        teamMembers: [],
        beamtimes: [],
        mainBeamtime: { cycle: "", btr: "" },
        isNew: true,
      },
      ...current,
    ]);
    setAnnouncement(`Project ${name} created.`);
    window.location.hash = `/projects/${id}`;
  }
  function updateProject(changes) {
    setProjects((current) =>
      current.map((p) =>
        p.id === project.id ? { ...p, ...changes, updated: today() } : p,
      ),
    );
    setAnnouncement("Project updated.");
  }
  function openNewProject() {
    dialogRef.current.showModal();
    dialogRef.current.querySelector("input")?.focus();
  }
  function deleteProject(id) {
    setProjects((current) => current.filter((project) => project.id !== id));
    setAnnouncement(`Project MSN-C #${id} deleted.`);
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a href="#/" className="app-title-link">
          <HeaderTitle className="app-title">{SITE_TITLE}</HeaderTitle>
        </a>
        <div className="header-right">
          <button
            type="button"
            className="theme-toggle"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {theme === "dark" ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                </>
              ) : (
                <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
              )}
            </svg>
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <span className="workspace-label">
            <span />
            MSN-C workspace
          </span>
          <span className="header-avatar" title={currentUser.name}>
            KN
          </span>
        </div>
      </header>
      <main ref={mainRef} id="main-content" tabIndex={-1}>
        {isDashboard ? (
          <Dashboard
            projects={projects}
            onNew={openNewProject}
            onDelete={deleteProject}
          />
        ) : project ? (
          <ProjectDetail
            key={project.id}
            project={project}
            onUpdate={updateProject}
          />
        ) : (
          <div className="empty-state">
            <Icon name="folder" size={32} />
            <h1>Project not found</h1>
            <p>This project is not available in this browser.</p>
            <a className="button primary" href="#/">
              Back to projects
            </a>
          </div>
        )}
        {storageError && (
          <p role="alert" className="storage-warning">
            Browser storage is unavailable. Changes will last until you close or
            refresh this page.
          </p>
        )}
      </main>
      <footer className="site-footer">
        <span>Materials Solutions Network at CHESS</span>
        <span>
          Cornell University <span className="footer-dot">·</span> Ithaca, NY
        </span>
      </footer>
      <NewProjectDialog
        dialogRef={dialogRef}
        projects={projects}
        onCreate={createProject}
        onClose={() => {}}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
