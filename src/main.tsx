import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { installPreventBrowserSwipeNavigation } from "@/lib/preventBrowserSwipeNavigation";
import "./index.css";

installPreventBrowserSwipeNavigation();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
