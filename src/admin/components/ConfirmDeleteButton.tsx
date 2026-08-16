export function ConfirmDeleteButton({
  onConfirm,
  label = "Delete",
  confirmMessage = "Are you sure? This can't be undone.",
}: {
  onConfirm: () => void;
  label?: string;
  confirmMessage?: string;
}) {
  return (
    <button
      type="button"
      className="admin-link admin-link--danger"
      onClick={() => {
        if (window.confirm(confirmMessage)) onConfirm();
      }}
    >
      {label}
    </button>
  );
}
