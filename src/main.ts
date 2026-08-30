import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { loadDataset } from "./data/loadDataset";

const rootElement = document.querySelector<HTMLDivElement>("#app");

if (!rootElement) {
  throw new Error("app_root_missing");
}

const root = createRoot(rootElement);
root.render(React.createElement("main", { className: "app-shell" }, "Loading territorial dataset…"));

loadDataset("/data/agua-negra-v0")
  .then((dataset) => {
    root.render(React.createElement(App, { dataset }));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown_dataset_error";
    root.render(
      React.createElement(
        "main",
        { className: "app-shell" },
        React.createElement(
          "section",
          { className: "fatal-state" },
          React.createElement("strong", null, "Dataset validation failed."),
          React.createElement("span", null, message),
        ),
      ),
    );
  });
