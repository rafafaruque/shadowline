// Runs only inside the OS sandbox. It never receives credentials or evaluator paths.
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const send = process.stdout.write.bind(process.stdout);
const { app } = await import(pathToFileURL(process.argv[2]).href);
for await (const line of createInterface({ input: process.stdin })) {
  try {
    const { id, url } = JSON.parse(line);
    if (
      typeof id !== "number" ||
      typeof url !== "string" ||
      !url.startsWith("/")
    )
      throw new Error("Invalid request");
    const response = await app.request(url);
    const body = await response.text();
    if (body.length > 100_000)
      throw new Error("Application response exceeds limit");
    send(
      JSON.stringify({
        id,
        status: response.status,
        headers: [...response.headers],
        body,
      }) + "\n",
    );
  } catch {
    send(JSON.stringify({ error: "Application request failed" }) + "\n");
  }
}
