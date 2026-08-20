if (typeof window.URL.createObjectURL !== "function") {
  window.URL.createObjectURL = () => "";
}
