export function isRegisterPasswordCompliant(password: string): boolean {
  if (password.length < 8) return false;
  if (![...password].some((ch) => /\p{L}/u.test(ch))) return false;
  if (![...password].some((ch) => /\d/u.test(ch))) return false;
  return true;
}
