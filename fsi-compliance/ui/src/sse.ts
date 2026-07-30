const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getApiUrl(): string {
  return API_URL;
}

export async function streamSSE(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: any) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText || "Request failed");
  }
  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
