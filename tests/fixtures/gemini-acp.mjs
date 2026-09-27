// A local protocol fixture. It never contacts a model or reads account data.
import { createInterface } from "node:readline";
const send = (msg) =>
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
let prompt;
createInterface({ input: process.stdin }).on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.method === "initialize")
    send({
      id: msg.id,
      result: { agentCapabilities: { promptCapabilities: { image: true } } },
    });
  else if (msg.method === "session/new")
    send({
      id: msg.id,
      result: {
        sessionId: "test",
        models: {
          availableModels: [{ modelId: "auto", name: "Auto" }],
          currentModelId: "auto",
        },
      },
    });
  else if (msg.method === "session/prompt") {
    prompt = msg;
    send({ id: 700, method: "session/request_permission", params: {} });
  } else if (msg.id === 700) {
    const image = prompt.params.prompt.find((p) => p.type === "image");
    const output = JSON.stringify({
      image: image.data,
      mimeType: image.mimeType,
      permission: msg.result.outcome.outcome,
      key: process.env.GEMINI_API_KEY || null,
    });
    for (const text of [output.slice(0, 12), output.slice(12)])
      send({
        method: "session/update",
        params: {
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text },
          },
        },
      });
    send({ id: prompt.id, result: { stopReason: "end_turn" } });
  }
});
