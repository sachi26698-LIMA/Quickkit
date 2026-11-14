"use client";

import { useSyncExternalStore } from "react";
import { securityToolBySlug } from "@/lib/tools/security/catalog";
import {
  securityGroupBySlug,
  type SecurityGroupSlug,
} from "@/lib/tools/security/consolidation";
import PasswordGenerator from "@/components/tools/password-generator";
import HashGenerator from "@/components/tools/devtools/hash-generator";
import Base64Tool from "@/components/tools/devtools/base64";
import SecurityWorkspace from "./workspace";
import NetworkWorkspace from "./network-workspace";
import RsaWorkspace from "./rsa-workspace";
import "./consolidated-workspace.css";

const EVENT = "quickkit:security-operation";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(EVENT, callback);
  };
}
function currentSearch() {
  return window.location.search;
}
function serverSearch(): string | null {
  return null;
}

export default function ConsolidatedWorkspace({
  slug,
}: {
  slug: SecurityGroupSlug;
}) {
  const group = securityGroupBySlug(slug)!;
  const search = useSyncExternalStore(subscribe, currentSearch, serverSearch);
  const requested = new URLSearchParams(search ?? "").get("operation");
  const operations: readonly string[] = group.operations;
  const selected =
    requested && operations.includes(requested) ? requested : operations[0];
  function select(operation: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("operation", operation);
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(EVENT));
  }
  function name(operation: string) {
    if (operation === "password-generator") return "Password Generator";
    if (operation === "hash-generator") return "Hash & Batch Checksums";
    if (operation === "base64-encoder-decoder") return "Base64 Text & Files";
    return securityToolBySlug(operation)?.name ?? operation;
  }
  const item = securityToolBySlug(selected);
  // Do not render a default form before the bookmarked operation is known:
  // users must never be able to enter data into a form that hydration replaces.
  if (search === null)
    return <p role="status">Loading the selected operation…</p>;
  return (
    <section
      className="security-consolidated"
      aria-label={`${group.name} operations`}
    >
      <p className="security-tabs-note">
        Choose an operation. Switching tabs clears that operation’s inputs and
        results from the page; save anything you need first.
      </p>
      <div
        className="security-tabs"
        role="tablist"
        aria-label="Choose an operation"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const index = operations.indexOf(selected);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? operations.length - 1
                : (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    operations.length) %
                  operations.length;
          select(operations[next]);
          document.getElementById(`tab-${operations[next]}`)?.focus();
        }}
      >
        {operations.map((operation) => (
          <button
            key={operation}
            id={`tab-${operation}`}
            role="tab"
            type="button"
            aria-selected={operation === selected}
            aria-controls="security-operation-panel"
            tabIndex={operation === selected ? 0 : -1}
            onClick={() => select(operation)}
          >
            {name(operation)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="security-operation-panel"
        aria-labelledby={`tab-${selected}`}
      >
        {selected === "password-generator" ? (
          <PasswordGenerator key={selected} />
        ) : selected === "hash-generator" ? (
          <HashGenerator key={selected} />
        ) : selected === "base64-encoder-decoder" ? (
          <Base64Tool key={selected} />
        ) : item?.mode === "dns-lookup" ||
          item?.mode === "dnssec" ||
          item?.mode === "public-ip" ? (
          <NetworkWorkspace
            key={selected}
            dnssec={item.mode === "dnssec"}
            publicIp={item.mode === "public-ip"}
          />
        ) : item?.mode === "rsa" ? (
          <RsaWorkspace key={selected} />
        ) : item ? (
          <SecurityWorkspace
            key={selected}
            mode={item.mode}
            example={item.example}
          />
        ) : null}
      </div>
    </section>
  );
}
