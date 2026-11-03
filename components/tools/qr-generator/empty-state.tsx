"use client";
/**
 * Empty-state artwork for the preview card: a QR-shaped placeholder, never a
 * fake code. The three finder patterns and the sparse modules say "a symbol
 * belongs here" without pretending anything has been rendered or verified.
 */
export function QrPlaceholder() {
  const modules = [
    [8, 8],
    [8, 12],
    [8, 16],
    [12, 8],
    [12, 20],
    [16, 12],
    [16, 16],
    [20, 8],
    [20, 20],
    [24, 12],
    [24, 24],
    [28, 16],
    [28, 28],
    [12, 28],
    [8, 24],
  ];
  return (
    <svg
      className="qr-empty-art"
      viewBox="0 0 44 44"
      width="150"
      height="150"
      role="presentation"
      aria-hidden="true"
    >
      <rect
        x="0.5"
        y="0.5"
        width="43"
        height="43"
        rx="9"
        className="qr-empty-frame"
      />
      <g className="qr-empty-eye">
        <rect x="6" y="6" width="10" height="10" rx="3" />
        <rect x="28" y="6" width="10" height="10" rx="3" />
        <rect x="6" y="28" width="10" height="10" rx="3" />
      </g>
      <g className="qr-empty-eye-inner">
        <rect x="9" y="9" width="4" height="4" rx="1.4" />
        <rect x="31" y="9" width="4" height="4" rx="1.4" />
        <rect x="9" y="31" width="4" height="4" rx="1.4" />
      </g>
      <g className="qr-empty-module">
        {modules.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" rx="1" />
        ))}
      </g>
    </svg>
  );
}
