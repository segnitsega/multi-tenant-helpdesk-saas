import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stub = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "server-only-stub.mjs"),
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: stub };
  }
  return nextResolve(specifier, context);
}
