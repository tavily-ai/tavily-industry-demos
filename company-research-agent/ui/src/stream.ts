export async function consumeSSE(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void,
) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string; error?: string }).detail ||
        (body as { error?: string }).error ||
        `Request failed (${response.status}).`,
    );
  }
  if (!response.body) throw new Error("Streaming is unavailable in this browser.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        if (event.type === "error") {
          throw new Error(String(event.error || event.message || "Research failed."));
        }
        if (event.type === "complete") complete = true;
        onEvent(event);
      }
      if (done) break;
    }
    if (!complete) throw new Error("The connection ended before the brief finished. Please retry.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
