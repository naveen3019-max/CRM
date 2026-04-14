function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wildcardPatternToRegex(pattern) {
  const escaped = pattern.split("*").map(escapeRegex).join(".*");
  return new RegExp(`^${escaped}$`);
}

function normalizeOrigin(origin) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

function stripWrappingQuotes(value) {
  return value.replace(/^['"]+|['"]+$/g, "");
}

function sanitizeOriginLikeValue(value) {
  return stripWrappingQuotes(value.trim()).replace(/\/+$/, "");
}

function compileAllowedOrigin(entry) {
  const trimmed = sanitizeOriginLikeValue(entry);

  if (trimmed.includes("*")) {
    return {
      type: "wildcard",
      matcher: wildcardPatternToRegex(trimmed)
    };
  }

  return {
    type: "exact",
    matcher: normalizeOrigin(trimmed)
  };
}

export function createCorsOriginChecker(allowedOrigins) {
  const compiled = allowedOrigins.map(compileAllowedOrigin);

  return function isAllowedOrigin(origin) {
    if (!origin) {
      return true;
    }

    const normalizedOrigin = normalizeOrigin(sanitizeOriginLikeValue(origin));

    return compiled.some((rule) => {
      if (rule.type === "wildcard") {
        return rule.matcher.test(normalizedOrigin);
      }

      return rule.matcher === normalizedOrigin;
    });
  };
}
