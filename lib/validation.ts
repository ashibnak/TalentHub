// Small shared validators for server actions (the codebase deliberately avoids a
// schema lib — these are plain guards used inline).

/** True only for a well-formed http(s) URL. Rejects `javascript:`, `data:`, etc.
 *  so a stored URL is safe to render in an <a href>. */
export function isHttpUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}
