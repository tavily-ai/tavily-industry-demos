const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getApiUrl(): string {
  return API_URL;
}

/** Parse a POST response using the browser's streaming fetch API.
 * Supports multi-line SSE data fields and does not assume chunk boundaries align
 * with event boundaries.
 */
export async function streamSSE<TEvent = unknown>(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: TEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json()).detail ?? ""; } catch { /* non-JSON error */ }
    throw new Error(detail || response.statusText || `Request failed (${response.status})`);
  }
  if (!response.body) throw new Error("The server returned no response stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatch = (block: string) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;
    try { onEvent(JSON.parse(data) as TEvent); } catch { /* ignore malformed event, continue stream */ }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(dispatch);
    if (done) break;
  }
  if (buffer.trim()) dispatch(buffer);
}
