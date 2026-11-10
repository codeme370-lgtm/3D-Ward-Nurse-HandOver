const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i;

export function isValidWardEmail(email) {
  return typeof email === "string" && email.length <= 254 && emailPattern.test(email);
}
