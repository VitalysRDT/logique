// Upstash Redis auto-deserialise les JSON stockes dans les hash.
// Ce helper garantit qu'on obtient toujours le type attendu,
// que la valeur soit deja un objet ou encore une string JSON.
export function ensureParsed<T>(value: unknown): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
  return value as T;
}
