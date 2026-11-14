"use client";
import { useHydrated } from "@/lib/use-hydrated";
import { useState } from "react";
import { Dices, Eye, EyeOff, History, RotateCcw } from "lucide-react";
import {
  defaultPasswordOptions,
  generatePasswordBatch,
  passwordEntropy,
  passwordStrength,
  type PasswordOptions,
} from "@/lib/tools/password";
import CopyButton from "./copy-button";
import { downloadText } from "@/lib/tools/download";
import { WorkspaceHeading } from "./tool-ui";

export default function PasswordGenerator() {
  const ready = useHydrated();
  const [options, setOptions] = useState<PasswordOptions>(
    defaultPasswordOptions,
  );
  const [password, setPassword] = useState("");
  const [count, setCount] = useState(1);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const bits = passwordEntropy(options);
  const strength = passwordStrength(bits);

  function change(next: PasswordOptions) {
    setOptions(next);
    setPassword("");
    setError("");
  }
  function setLength(raw: number) {
    const length = Number.isFinite(raw)
      ? Math.min(64, Math.max(8, Math.floor(raw)))
      : options.length;
    change({ ...options, length });
  }
  function generate() {
    try {
      const next = generatePasswordBatch(options, count).join("\n");
      setPassword(next);
      setError("");
      setHistory((prev) =>
        count === 1
          ? [next, ...prev.filter((p) => p !== next)].slice(0, 5)
          : [],
      );
    } catch (e) {
      setPassword("");
      setError(
        e instanceof Error ? e.message : "Unable to generate a password.",
      );
    }
  }

  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <WorkspaceHeading
        title="Random, not predictable"
        description="Cryptographically secure randomness (crypto.getRandomValues). Generated on your device; copying or downloading saves a separate copy."
      />
      <label htmlFor="password-length">Password length</label>
      <div className="range-row">
        <input
          id="password-length"
          type="range"
          min={8}
          max={64}
          value={options.length}
          onChange={(e) => setLength(Number(e.target.value))}
        />
        <input
          type="number"
          min={8}
          max={64}
          className="length-number"
          aria-label="Password length in characters"
          value={options.length}
          onChange={(e) => setLength(Number(e.target.value))}
        />
        <output htmlFor="password-length" className="sr-only">
          {options.length}
        </output>
      </div>

      <div className="strength" aria-live="polite">
        <div className="strength-head">
          <span>
            Pool-size indicator: <strong>{strength.label}</strong>
          </span>
          <span>Approximately {bits} bits (unconstrained pool)</span>
        </div>
        <div
          className="strength-track"
          role="meter"
          aria-label="Unconstrained pool-size indicator"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={strength.level}
          aria-valuetext={`${strength.label}, approximately ${bits} bits for an unconstrained pool`}
        >
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={`strength-segment level-${strength.level}${level <= strength.level ? " on" : ""}`}
            />
          ))}
        </div>
        <p className="help">
          This is an upper bound for unconstrained random strings, not a
          measured strength: requiring each selected character set changes the
          distribution. Longer unique passwords and a password manager are
          recommended.
        </p>
      </div>

      <div className="settings-grid">
        {(
          [
            ["uppercase", "Uppercase (A–Z)"],
            ["lowercase", "Lowercase (a–z)"],
            ["numbers", "Numbers (0–9)"],
            ["symbols", "Symbols (!@#$…)"],
            [
              "excludeAmbiguous",
              "Exclude ambiguous characters (I, l, 1, O, 0, o, |)",
            ],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="check-label">
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) => change({ ...options, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <label htmlFor="password-count">Number of passwords (1–50)</label>
      <input
        id="password-count"
        type="number"
        min={1}
        max={50}
        value={count}
        onChange={(event) => {
          setCount(event.currentTarget.valueAsNumber);
          setPassword("");
          setError("");
        }}
      />
      <div className="action-row">
        <button className="primary" onClick={generate}>
          <Dices size={16} /> Generate password
        </button>
        <button
          className="secondary"
          onClick={() => {
            change(defaultPasswordOptions);
            setHistory([]);
            setCount(1);
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>
      {error && (
        <p className="status error" role="alert">
          Error: {error}
        </p>
      )}
      <div className="result-panel">
        <div className="tool-toolbar">
          <label htmlFor="password-output">
            Generated password{count === 1 ? "" : "s"}
          </label>
          <button
            type="button"
            className="toolbar-button"
            aria-pressed={!visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}{" "}
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        <textarea
          id="password-output"
          className={`password-output${visible ? "" : " masked"}`}
          readOnly
          rows={2}
          value={password}
          placeholder="Your next password starts here…"
        />
        <div className="workspace-foot">
          <p>
            At least one character from each selected set is included. Use a
            password manager and never reuse passwords.
          </p>
          <CopyButton key={password} text={password} />
          <button
            type="button"
            className="secondary"
            disabled={!password}
            onClick={() => downloadText(password, "quickkit-passwords.txt")}
          >
            Download passwords
          </button>
        </div>
      </div>

      <p className="help">
        Downloading saves passwords as plaintext on your device; protect or
        delete the file after importing them into a password manager.
      </p>
      {history.length > 1 && (
        <section className="history" aria-labelledby="password-history">
          <h3 id="password-history">
            <History size={15} /> Recent (this session only)
          </h3>
          <ul>
            {history.slice(1).map((item) => (
              <li key={item}>
                <code className={visible ? "" : "masked"}>{item}</code>
                <CopyButton key={item} text={item} />
              </li>
            ))}
          </ul>
          <p className="help">
            Kept only in this tab’s memory. Refreshing or resetting clears it.
          </p>
        </section>
      )}
      <p className="sr-only" role="status">
        {password ? "New password generated." : ""}
      </p>
    </fieldset>
  );
}
