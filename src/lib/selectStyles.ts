// Shared react-select styling — mirrors the dropdowns in OrderModal so the
// Statistics pages use the same dark/gold dropdown look. Keep in sync with
// darkSelectStyles in components/orders/OrderModal.tsx.
export const darkSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.20)",
    minHeight: 44,
    borderRadius: 16,
    boxShadow: "none",
    ":hover": { borderColor: "#D6B36A" },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "#111111",
    border: "1px solid #242424",
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 9999,
    boxShadow: "0 0 40px rgba(0,0,0,0.6)",
  }),
  menuList: (base: any) => ({ ...base, backgroundColor: "#111111", padding: 8 }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1A1A1A" : "transparent",
    color: state.isFocused ? "#F5F1E8" : "#A1A1AA",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    marginBottom: 2,
  }),
  input: (base: any) => ({ ...base, color: "#F5F1E8" }),
  placeholder: (base: any) => ({ ...base, color: "#8b8b93" }),
  singleValue: (base: any) => ({ ...base, color: "#F5F1E8" }),
  dropdownIndicator: (base: any) => ({ ...base, color: "#71717a", ":hover": { color: "#D6B36A" } }),
  indicatorSeparator: (base: any) => ({ ...base, backgroundColor: "rgba(255,255,255,0.14)" }),
}
