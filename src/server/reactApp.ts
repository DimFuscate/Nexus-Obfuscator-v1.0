import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const e = React.createElement;

export function renderReactApp(): string {
  const body = e(
    "main",
    { className: "app" },
    e(
      "header",
      { className: "bar" },
      e("div", null, e("h1", null, "NexusProtect"), e("p", null, "Luau obfuscation workspace")),
      e("span", { id: "healthStatus" }, "Local"),
    ),
    e(
      "section",
      { className: "controls" },
      e("label", { className: "seed" }, e("span", null, "Seed"), e("input", { id: "seedInput", autoComplete: "off", spellCheck: false, placeholder: "randomized per build" })),
      e("button", { id: "randomSeedButton", type: "button" }, "Randomize"),
      e("label", { className: "file" }, "Upload", e("input", { id: "sourceFile", type: "file", accept: ".lua,.luau,text/plain", hidden: true })),
      e("button", { id: "obfuscateButton", className: "primary", type: "button" }, "OBF"),
    ),
    e(
      "section",
      { className: "grid" },
      e("textarea", { id: "sourceInput", spellCheck: false, placeholder: "paste Luau source" }),
      e("textarea", { id: "outputCode", spellCheck: false, readOnly: true, placeholder: "protected output" }),
    ),
    e(
      "section",
      { className: "footerbar" },
      e("div", { id: "statusBox" }, "Ready"),
      e("div", { id: "metrics" }, "0 B -> 0 B"),
      e("button", { id: "copyButton", type: "button" }, "Copy"),
      e("button", { id: "downloadButton", type: "button" }, "Download"),
    ),
    e("footer", { className: "credits" }, "Based on Prometheus by Elias Oelschner, https://github.com/prometheus-lua/Prometheus"),
  );

  return `<!doctype html>${renderToStaticMarkup(e(
    "html",
    { lang: "en" },
    e(
      "head",
      null,
      e("meta", { charSet: "UTF-8" }),
      e("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      e("title", null, "NexusProtect"),
      e("link", { rel: "stylesheet", href: "/styles.css" }),
    ),
    e("body", null, body, e("script", { type: "module", src: "/app.js" })),
  ))}`;
}
