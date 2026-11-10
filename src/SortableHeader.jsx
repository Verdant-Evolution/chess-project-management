export default function SortableHeader({
  field,
  label,
  sort,
  onSort,
  className,
}) {
  const active = sort.field === field;
  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? sort.direction : "none"}
    >
      <button
        type="button"
        className="table-sort-button"
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label.toLowerCase()}`}
        title={`${label}: sort ${active && sort.direction === "ascending" ? "descending" : "ascending"}`}
      >
        <span>{label}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {active ? (
            <path
              d={
                sort.direction === "ascending"
                  ? "M12 19V5m-5 5 5-5 5 5"
                  : "M12 5v14m-5-5 5 5 5-5"
              }
            />
          ) : (
            <path d="m8 9 4-4 4 4m-8 6 4 4 4-4" />
          )}
        </svg>
      </button>
    </th>
  );
}
