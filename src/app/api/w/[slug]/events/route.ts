import { requireApiTenant } from "@/server/tenancy/api-context";
import { assertCan } from "@/server/tenancy/permissions";
import { listRecentEvents, publish } from "@/server/realtime/publisher";
import { subscribeWorkspace } from "@/server/realtime/subscriber";
import type { RealtimeEvent } from "@/types/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSse(event: RealtimeEvent | { comment: string }): string {
  if ("comment" in event) {
    return `: ${event.comment}\n\n`;
  }
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const ctx = await requireApiTenant(slug);
  assertCan(ctx, "ticket.view");

  const lastEventId =
    request.headers.get("last-event-id") ??
    new URL(request.url).searchParams.get("lastEventId") ??
    undefined;

  const encoder = new TextEncoder();
  let cleanup = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      if (lastEventId) {
        const replay = await listRecentEvents(ctx.workspaceId, lastEventId);
        if (replay.needsResync) {
          const resync = await publish({
            type: "resync",
            workspaceId: ctx.workspaceId,
            payload: { reason: "gap_too_large" },
          });
          send(encodeSse(resync));
        } else {
          for (const event of replay.events) {
            send(encodeSse(event));
          }
        }
      }

      const unsubscribe = await subscribeWorkspace(
        ctx.workspaceId,
        (event) => {
          send(encodeSse(event));
        },
      );

      heartbeat = setInterval(() => {
        send(encodeSse({ comment: "heartbeat" }));
      }, 25_000);

      cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          return;
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
