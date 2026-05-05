export const API_BASE = () =>
  localStorage.getItem("devMode") === "true"
    ? "http://localhost:8002"
    : "http://10.13.225.20:8002";
