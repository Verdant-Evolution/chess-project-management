import { useRef, useState } from "react";
import Checkmark from "./Checkmark";

export default function ProjectDetailsEditor({ project, onUpdate }) {
  const dialogRef = useRef(null);
  const nameRef = useRef(null);
  const [name, setName] = useState("");
  const [btr, setBtr] = useState("");
  const [protectedData, setProtectedData] = useState(false);

  function openEditor() {
    setName(project.name);
    setBtr(project.mainBeamtime?.btr ?? "");
    setProtectedData(Boolean(project.protected));
    dialogRef.current.showModal();
    nameRef.current?.focus();
  }

  function save(event) {
    event.preventDefault();
    if (!name.trim()) return;
    onUpdate({
      name: name.trim(),
      protected: protectedData,
      mainBeamtime: { ...project.mainBeamtime, btr: btr.trim() },
    });
    dialogRef.current.close();
  }

  return (
    <>
      <button
        type="button"
        className="button secondary edit-project-details"
        aria-label="Edit project details"
        aria-haspopup="dialog"
        onClick={openEditor}
      >
        Edit
      </button>
      <dialog
        ref={dialogRef}
        className="project-dialog"
        aria-labelledby="edit-project-details-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="dialog-content">
          <h2 id="edit-project-details-title">Edit project details</h2>
          <form onSubmit={save}>
            <label htmlFor="edit-experiment-name">Experiment name</label>
            <input
              ref={nameRef}
              id="edit-experiment-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <div className="dialog-field">
              <label htmlFor="edit-project-btr">BTR number (optional)</label>
              <input
                id="edit-project-btr"
                value={btr}
                onChange={(event) => setBtr(event.target.value)}
                aria-describedby="edit-project-btr-hint"
              />
              <span className="field-hint" id="edit-project-btr-hint">
                BTR for Beamtime 1. Edit other beamtimes in the workflow.
              </span>
            </div>
            <label className="checkbox-row protected-data-choice">
              <input
                type="checkbox"
                checked={protectedData}
                onChange={(event) => setProtectedData(event.target.checked)}
              />
              <span className="custom-checkbox"><Checkmark /></span>
              <span>Dataset contains protected or sensitive data</span>
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => dialogRef.current.close()}
              >
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={!name.trim()}>
                Save changes
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
