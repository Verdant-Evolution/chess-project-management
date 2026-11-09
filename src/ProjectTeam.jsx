import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ProjectTeam({ project, onUpdate, icon }) {
  const members = project.teamMembers ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const sidebarRef = useRef(null);
  const nameRef = useRef(null);
  const confirmationRef = useRef(null);
  const actionTriggerRef = useRef(null);
  const actionConfirmedRef = useRef(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const editingMember = members.find((member) => member.id === editingId);
  const hasEdits =
    editingMember &&
    (fullName.trim() !== editingMember.fullName ||
      company.trim() !== editingMember.company);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("team-panel-open");
    function handleEscape(event) {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        closeSidebar();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.classList.remove("team-panel-open");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function closeSidebar() {
    setIsOpen(false);
    resetEditor();
    setMessage("");
    triggerRef.current?.focus({ preventScroll: true });
  }
  function resetEditor() {
    setEditingId(null);
    setFullName("");
    setCompany("");
  }
  function editMember(member) {
    setEditingId(member.id);
    setFullName(member.fullName);
    setCompany(member.company);
    setMessage("");
    nameRef.current?.focus();
    nameRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function requestRemoval(member, event) {
    actionConfirmedRef.current = false;
    actionTriggerRef.current = event.currentTarget;
    setPendingAction({ type: "remove", member });
    confirmationRef.current.showModal();
  }

  function openSidebar() {
    setIsOpen(true);
  }
  function addMember(event) {
    event.preventDefault();
    const name = fullName.trim();
    if (!name) return;
    if (editingMember) {
      if (!hasEdits) return;
      actionConfirmedRef.current = false;
      actionTriggerRef.current = document.activeElement;
      setPendingAction({
        type: "edit",
        member: editingMember,
        updates: { fullName: name, company: company.trim() },
      });
      confirmationRef.current.showModal();
      return;
    }
    onUpdate({
      teamMembers: [
        ...members,
        { id: crypto.randomUUID(), fullName: name, company: company.trim() },
      ],
    });
    setMessage(`Added ${name} to the team.`);
    setFullName("");
    nameRef.current?.focus();
  }
  function confirmAction() {
    if (!pendingAction) return;
    actionConfirmedRef.current = true;
    const { member, type, updates } = pendingAction;
    if (type === "remove") {
      onUpdate({
        teamMembers: members.filter((person) => person.id !== member.id),
      });
      if (editingId === member.id) resetEditor();
      setMessage(`Removed ${member.fullName} from the team.`);
    } else {
      onUpdate({
        teamMembers: members.map((person) =>
          person.id === member.id ? { ...person, ...updates } : person,
        ),
      });
      resetEditor();
      setMessage(`Updated ${updates.fullName}.`);
    }
    confirmationRef.current.close();
  }

  return (
    <>
      <button
        type="button"
        className="contact-card team-trigger"
        aria-label="Manage project team"
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls="project-team-sidebar"
        onClick={() => (isOpen ? closeSidebar() : openSidebar())}
      >
        {icon}
        <span className="team-trigger-text">
          <span className="contact-label">PROJECT TEAM</span>
          <strong>
            {members.length
              ? `${members.length} ${members.length === 1 ? "person" : "people"}`
              : "No team members"}
          </strong>
          <span>View and manage team</span>
        </span>
        <svg
          className="team-trigger-arrow"
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
      </button>
      {createPortal(
        <aside
          ref={sidebarRef}
          id="project-team-sidebar"
          className="team-sidebar"
          aria-labelledby="team-sidebar-title"
          data-open={isOpen}
          inert={!isOpen}
          aria-hidden={!isOpen}
        >
          <header className="team-sidebar-header">
            <div>
              <h2 id="team-sidebar-title">Project team</h2>
              <p>
                MSN-C #{project.id}{" "}
                <span className="team-count">
                  {members.length} {members.length === 1 ? "person" : "people"}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close team sidebar"
              onClick={closeSidebar}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M6 18 18 6" />
              </svg>
            </button>
          </header>
          <div className="team-sidebar-scroll">
            <div className="team-sidebar-body">
              <table
                className="team-members-table"
                aria-label="Project team members"
              >
                <colgroup>
                  <col />
                  <col />
                  <col className="team-actions-column" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Full name</th>
                    <th scope="col">Company</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className={
                        editingId === member.id ? "team-row-editing" : ""
                      }
                    >
                      <td className="team-person-name">
                        <span className="team-person-avatar" aria-hidden="true">
                          {member.fullName
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span>{member.fullName}</span>
                      </td>
                      <td className="team-person-company">
                        {member.company || "No company listed"}
                      </td>
                      <td className="team-actions-cell">
                        <div className="team-member-actions">
                          <button
                            type="button"
                            className="team-member-action"
                            aria-label={`Edit ${member.fullName}`}
                            title={`Edit ${member.fullName}`}
                            onClick={() => editMember(member)}
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
                              <path d="m15 5 4 4M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
                            </svg>
                            <span>{"Edit"}</span>
                          </button>
                          <button
                            type="button"
                            className="team-member-action remove-team-member"
                            aria-label={`Remove ${member.fullName}`}
                            title={`Remove ${member.fullName}`}
                            onClick={(event) => requestRemoval(member, event)}
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
                              <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                            </svg>
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!members.length && (
                    <tr>
                      <td colSpan={3} className="team-empty-cell">
                        No team members yet. Add a person below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <form className="team-member-form" onSubmit={addMember}>
              <h3>{editingMember ? "Edit person" : "Add a person"}</h3>
              <label htmlFor="team-member-name">Full name</label>
              <input
                ref={nameRef}
                id="team-member-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Alex Morgan"
                autoComplete="name"
                required
              />
              <label htmlFor="team-member-company">Company (optional)</label>
              <input
                id="team-member-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="e.g. Cornell University"
                autoComplete="organization"
              />
              <div className="team-member-form-actions">
                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    !fullName.trim() || (Boolean(editingMember) && !hasEdits)
                  }
                >
                  {editingMember ? "Save changes" : "Add person"}
                </button>
                {editingMember && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      resetEditor();
                      setMessage("");
                      nameRef.current?.focus();
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
              <span
                className="team-member-message"
                role="status"
                aria-live="polite"
              >
                {message}
              </span>
            </form>
          </div>
        </aside>,
        document.body,
      )}
      <dialog
        ref={confirmationRef}
        className="project-dialog"
        aria-labelledby="team-action-title"
        aria-describedby="team-action-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        onClose={() => {
          setPendingAction(null);
          if (!isOpen) return;
          const target = actionTriggerRef.current;
          if (
            !actionConfirmedRef.current &&
            target?.isConnected &&
            !target.disabled
          )
            target.focus();
          else nameRef.current?.focus();
        }}
      >
        <div className="dialog-content">
          <h2 id="team-action-title">
            {pendingAction?.type === "remove"
              ? "Remove person?"
              : "Save person changes?"}
          </h2>
          <p id="team-action-description">
            {pendingAction?.type === "remove" ? "Remove " : "Update "}
            <strong>{pendingAction?.member.fullName}</strong>
            {pendingAction?.member.company
              ? ` (${pendingAction.member.company})`
              : ""}
            {pendingAction?.type === "remove"
              ? " from this project's team?"
              : " with the details below?"}
          </p>
          {pendingAction?.type === "edit" && (
            <dl className="team-member-review">
              <div>
                <dt>Full name</dt>
                <dd>{pendingAction.updates.fullName}</dd>
              </div>
              <div>
                <dt>Company</dt>
                <dd>{pendingAction.updates.company || "Not specified"}</dd>
              </div>
            </dl>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => confirmationRef.current.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`button ${pendingAction?.type === "remove" ? "danger" : "primary"}`}
              onClick={confirmAction}
            >
              {pendingAction?.type === "remove"
                ? "Remove person"
                : "Confirm changes"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
