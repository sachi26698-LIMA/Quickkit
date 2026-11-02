/** Bounded recursive descent expression parser. No JavaScript evaluation. */
export function scientific(
  expression: string,
  degrees: boolean,
  answer?: number,
): number {
  if (expression.length > 500)
    throw new Error("Expression is too long (maximum 500 characters).");
  const tokens =
    expression.match(
      /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[+\-*/^()!,]/gi,
    ) || [];
  if (
    tokens.join("").toLowerCase() !==
    expression.replace(/\s+/g, "").toLowerCase()
  )
    throw new Error("Invalid character in expression.");
  let pos = 0,
    depth = 0;
  const angle = (n: number) => (degrees ? (n * Math.PI) / 180 : n);
  const inverse = (n: number) => (degrees ? (n * 180) / Math.PI : n);
  const funcs: Record<string, (n: number) => number> = {
    sin: (n) => Math.sin(angle(n)),
    cos: (n) => Math.cos(angle(n)),
    tan: (n) => {
      const radians = angle(n);
      if (Math.abs(Math.cos(radians)) < 1e-15)
        throw new Error("Tangent is undefined at this angle.");
      return Math.tan(radians);
    },
    asin: (n) => inverse(Math.asin(n)),
    acos: (n) => inverse(Math.acos(n)),
    atan: (n) => inverse(Math.atan(n)),
    sqrt: Math.sqrt,
    ln: Math.log,
    log: Math.log10,
    abs: Math.abs,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    asinh: Math.asinh,
    acosh: Math.acosh,
    atanh: Math.atanh,
  };
  function primary(): number {
    if (++depth > 100) throw new Error("Expression is too deeply nested.");
    try {
      const t = tokens[pos++];
      if (!t) throw new Error("Incomplete expression.");
      if (t === "(") {
        const n = sum();
        if (tokens[pos++] !== ")")
          throw new Error("Missing closing parenthesis.");
        return n;
      }
      const word = t.toLowerCase();
      if (word === "pi") return Math.PI;
      if (word === "e") return Math.E;
      if (word === "ans") {
        if (answer === undefined || !Number.isFinite(answer))
          throw new Error("No previous answer. Evaluate a calculation first.");
        return answer;
      }
      if (word === "ncr" || word === "npr") {
        if (tokens[pos++] !== "(")
          throw new Error("Functions require parentheses.");
        const n = sum();
        if (tokens[pos++] !== ",")
          throw new Error("Use two arguments, e.g. nCr(5,2).");
        const r = sum();
        if (tokens[pos++] !== ")")
          throw new Error("Missing closing parenthesis.");
        if (
          !Number.isInteger(n) ||
          !Number.isInteger(r) ||
          n < 0 ||
          r < 0 ||
          r > n ||
          n > 170
        )
          throw new Error("Use integers 0 ≤ r ≤ n ≤ 170.");
        let out = 1;
        if (word === "ncr") {
          const k = Math.min(r, n - r);
          for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i;
        } else {
          for (let i = 0; i < r; i++) out *= n - i;
        }
        return out;
      }
      if (Object.hasOwn(funcs, word)) {
        if (tokens[pos++] !== "(")
          throw new Error("Functions require parentheses.");
        const n = sum();
        if (tokens[pos++] !== ")")
          throw new Error("Missing closing parenthesis.");
        return funcs[word](n);
      }
      if (/^(?:\d|\.)/.test(t)) return Number(t);
      throw new Error("Expected a number, constant or function.");
    } finally {
      depth--;
    }
  }
  function postfix(): number {
    let n = primary();
    while (tokens[pos] === "!") {
      pos++;
      if (!Number.isInteger(n) || n < 0 || n > 170)
        throw new Error("Factorial requires an integer from 0 to 170.");
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      n = f;
    }
    return n;
  }
  function power(): number {
    const n = postfix();
    if (tokens[pos] === "^") {
      pos++;
      return n ** unary();
    }
    return n;
  }
  function unary(): number {
    if (tokens[pos] === "+") {
      pos++;
      return unary();
    }
    if (tokens[pos] === "-") {
      pos++;
      return -unary();
    }
    return power();
  }
  function product(): number {
    let n = unary();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++],
        v = unary();
      if (op === "/" && v === 0) throw new Error("Cannot divide by zero.");
      n = op === "*" ? n * v : n / v;
    }
    return n;
  }
  function sum(): number {
    let n = product();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++],
        v = product();
      n = op === "+" ? n + v : n - v;
    }
    return n;
  }
  const value = sum();
  if (pos !== tokens.length)
    throw new Error("Unexpected token; use explicit multiplication.");
  if (!Number.isFinite(value))
    throw new Error("Result is undefined or outside the supported range.");
  return value;
}
