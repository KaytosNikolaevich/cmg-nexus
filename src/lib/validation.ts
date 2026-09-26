/** Checks calendar age, including birthdays that have not occurred yet this year. */
export function isAtLeast18(birthDate: string, today = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    return false;
  }

  const age = today.getFullYear() - year - (today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
  return age >= 18;
}

/** A finite decimal temperature, without exponent notation or alphabetic characters. */
export function isValidTemperature(value: string): boolean {
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value));
}