import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Checkmark from "./Checkmark";
import SortableHeader from "./SortableHeader";
import { scientists } from "./data";

const teamCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

export default function ProjectTeam({ project, onUpdate, icon }) {
  const members = project.teamMembers ?? [];
  const [sort, setSort] = useState({
    field: "fullName",
    direction: "ascending",
  });
  const sortedMembers = [...members].sort((a, b) => {
    const first = a[sort.field].trim();
    const second = b[sort.field].trim();
    // Keep unlisted companies at the end in either direction.
    if (!first || !second)
      return (
        Number(!first) - Number(!second) ||
        teamCollator.compare(a.fullName, b.fullName)
      );
    const order = teamCollator.compare(first, second);
    return (
      (sort.direction === "ascending" ? order : -order) ||
      teamCollator.compare(a.fullName, b.fullName)
    );
  });
  function sortBy(field) {
    setSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia("(min-width: 1001px)").matches,
  );
  const [headerActions, setHeaderActions] = useState(null);
  const Panel = isDesktop ? "aside" : "dialog";
  const [isAdding, setIsAdding] = useState(false);
  const addButtonRef = useRef(null);
  const triggerRef = useRef(null);
  const sidebarRef = useRef(null);
  const nameRef = useRef(null);
  const confirmationRef = useRef(null);
  const actionTriggerRef = useRef(null);
  const actionConfirmedRef = useRef(false);
  const hadDraftRef = useRef(false);
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
    if (isAdding || editingId) {
      hadDraftRef.current = true;
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ block: "nearest" });
    } else if (hadDraftRef.current) {
      hadDraftRef.current = false;
      if (isDesktop || isOpen) addButtonRef.current?.focus();
    }
  }, [isAdding, editingId]);

  function cancelEditor() {
    resetEditor();
    setMessage("");
    addButtonRef.current?.focus();
  }
  function startAdding() {
    resetEditor();
    setIsAdding(true);
    setMessage("");
  }

  useEffect(() => {
    setHeaderActions(document.getElementById("project-team-actions"));
    document.body.classList.add("project-team-layout");
    const media = window.matchMedia("(min-width: 1001px)");
    function updateLayout(event) {
      setIsDesktop(event.matches);
      setIsOpen(false);
    }
    media.addEventListener("change", updateLayout);
    return () => {
      document.body.classList.remove("project-team-layout");
      media.removeEventListener("change", updateLayout);
    };
  }, []);

  useEffect(() => {
    if (isDesktop) return;
    if (isOpen && !sidebarRef.current.open) sidebarRef.current.showModal();
    else if (!isOpen && sidebarRef.current.open) sidebarRef.current.close();
  }, [isOpen, isDesktop]);

  function closeSidebar() {
    if (!isDesktop && sidebarRef.current?.open) sidebarRef.current.close();
    setIsOpen(false);
    resetEditor();
    setMessage("");
    triggerRef.current?.focus({ preventScroll: true });
  }
  function resetEditor() {
    setIsAdding(false);
    setEditingId(null);
    setFullName("");
    setCompany("");
  }
  function editMember(member) {
    setIsAdding(false);
    setEditingId(member.id);
    setFullName(member.fullName);
    setCompany(member.company);
    setMessage("");
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
  function saveMemberRow(event) {
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
    resetEditor();
    addButtonRef.current?.focus();
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

  function editorCells() {
    return (
      <>
        <td className="team-inline-field">
          <label className="sr-only" htmlFor="team-member-name">
            Full name
          </label>
          <input
            ref={nameRef}
            id="team-member-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            autoComplete="name"
            required
          />
        </td>
        <td className="team-inline-field">
          <label className="sr-only" htmlFor="team-member-company">
            Company (optional)
          </label>
          <input
            id="team-member-company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Company"
            autoComplete="organization"
          />
        </td>
        <td className="team-actions-cell">
          <div className="team-member-actions">
            <button
              type="submit"
              className="team-member-action team-inline-save"
              aria-label={editingMember ? "Save changes" : "Add person"}
              title={editingMember ? "Save changes" : "Add person"}
              disabled={
                !fullName.trim() || (Boolean(editingMember) && !hasEdits)
              }
            >
              <Checkmark size={17} />
              <span>{editingMember ? "Save" : "Add"}</span>
            </button>
            <button
              type="button"
              className="team-member-action team-inline-cancel"
              aria-label={editingMember ? "Cancel edit" : "Cancel new person"}
              title="Cancel"
              onClick={cancelEditor}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M6 18 18 6" />
              </svg>
              <span>Cancel</span>
            </button>
          </div>
        </td>
      </>
    );
  }

  return (
    <>
      {headerActions &&
        createPortal(
          <button
            type="button"
            className="team-mobile-trigger icon-button"
            aria-label="Open project team and contacts"
            ref={triggerRef}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls="project-team-sidebar"
            title="Project team and contacts"
            onClick={openSidebar}
          >
            {icon}
          </button>,
          headerActions,
        )}
      {createPortal(
        <Panel
          ref={sidebarRef}
          id="project-team-sidebar"
          className="team-sidebar"
          aria-labelledby="team-sidebar-title"
          data-open={isDesktop || isOpen}
          aria-modal={isDesktop ? undefined : true}
          onClose={() => {
            setIsOpen(false);
            resetEditor();
            setMessage("");
          }}
          onClick={(event) => {
            if (!isDesktop && event.target === event.currentTarget)
              closeSidebar();
          }}
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
              className="icon-button team-panel-close"
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
            <section
              className="team-contacts"
              aria-labelledby="project-contacts-title"
            >
              <h3 id="project-contacts-title">Contacts</h3>
              <div className="project-contact-fields">
                <div className="project-detail-field">
                  <label htmlFor="primary-scientist">Primary scientist</label>
                  <select
                    id="primary-scientist"
                    aria-describedby="primary-scientist-role"
                    value={project.primaryScientist}
                    onChange={(e) =>
                      onUpdate({ primaryScientist: e.target.value })
                    }
                  >
                    {[
                      ...new Set(scientists.map((scientist) => scientist.role)),
                    ].map((role) => (
                      <optgroup key={role} label={role}>
                        {scientists
                          .filter((scientist) => scientist.role === role)
                          .map((scientist) => (
                            <option key={scientist.id} value={scientist.id}>
                              {scientist.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <span
                    id="primary-scientist-role"
                    className="project-field-help"
                  >
                    {
                      scientists.find(
                        (scientist) =>
                          scientist.id === project.primaryScientist,
                      )?.role
                    }
                  </span>
                </div>
                <div className="project-detail-field">
                  <label htmlFor="external-contact">External contact</label>
                  <input
                    id="external-contact"
                    type="text"
                    value={project.externalContact}
                    placeholder="Enter contact name"
                    onChange={(e) =>
                      onUpdate({ externalContact: e.target.value })
                    }
                  />
                </div>
              </div>
            </section>

            <div className="team-sidebar-body">
              <div className="team-table-toolbar">
                <h3 className="team-members-title">Team members</h3>
                <button
                  ref={addButtonRef}
                  type="button"
                  className="button secondary team-add-button"
                  aria-label="Add team member"
                  title="Add team member"
                  onClick={startAdding}
                  disabled={isAdding || Boolean(editingMember)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
              <div className="team-mobile-sort">
                <label htmlFor="team-sort">Sort by</label>
                <select
                  id="team-sort"
                  value={`${sort.field}:${sort.direction}`}
                  onChange={(event) => {
                    const [field, direction] = event.target.value.split(":");
                    setSort({ field, direction });
                  }}
                >
                  <option value="fullName:ascending">Full name (A to Z)</option>
                  <option value="fullName:descending">
                    Full name (Z to A)
                  </option>
                  <option value="company:ascending">Company (A to Z)</option>
                  <option value="company:descending">Company (Z to A)</option>
                </select>
              </div>
              <form className="team-table-frame" onSubmit={saveMemberRow}>
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
                      <SortableHeader
                        field="fullName"
                        label="Full name"
                        sort={sort}
                        onSort={sortBy}
                      />
                      <SortableHeader
                        field="company"
                        label="Company"
                        sort={sort}
                        onSort={sortBy}
                      />
                      <th scope="col" className="team-actions-heading">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isAdding && (
                      <tr
                        className="team-inline-row team-row-editing"
                        aria-label="New team member"
                      >
                        {editorCells()}
                      </tr>
                    )}
                    {sortedMembers.map((member) => (
                      <tr
                        key={member.id}
                        className={
                          editingId === member.id
                            ? "team-inline-row team-row-editing"
                            : ""
                        }
                      >
                        {editingId === member.id ? (
                          editorCells()
                        ) : (
                          <>
                            <td className="team-person-name">
                              <span
                                className="team-person-avatar"
                                aria-hidden="true"
                              >
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
                                  disabled={isAdding || Boolean(editingMember)}
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
                                  onClick={(event) =>
                                    requestRemoval(member, event)
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
                                    <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                                  </svg>
                                  <span>Remove</span>
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {!members.length && !isAdding && (
                      <tr>
                        <td colSpan={3} className="team-empty-cell">
                          No team members yet. Use + to add someone.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </form>
              <p
                className="team-member-message"
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            </div>
          </div>
        </Panel>,
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
          if (!isDesktop && !isOpen) return;
          const target = actionTriggerRef.current;
          if (
            !actionConfirmedRef.current &&
            target?.isConnected &&
            !target.disabled
          )
            target.focus();
          else if (nameRef.current) nameRef.current.focus();
          else addButtonRef.current?.focus();
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
