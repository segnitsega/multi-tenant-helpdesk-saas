"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  id: string;
  authorType: string;
  bodyText: string;
  createdAt: string;
};

export function WidgetApp({
  widgetKey,
  workspaceName,
  color,
  greeting,
  showPoweredBy,
}: {
  widgetKey: string;
  workspaceName: string;
  color: string;
  greeting: string;
  showPoweredBy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    window.parent.postMessage(
      { source: "relay-widget", type: "relay-widget:theme", color },
      "*",
    );
  }, [color]);

  async function refreshMessages(number: number) {
    const res = await fetch(
      `/api/widget/${encodeURIComponent(widgetKey)}/messages?ticketNumber=${number}`,
      { credentials: "include" },
    );
    const json = await res.json();
    if (json.ok) setMessages(json.messages);
  }

  useEffect(() => {
    if (!ticketNumber) return;
    const id = window.setInterval(() => {
      void refreshMessages(ticketNumber);
    }, 4000);
    return () => window.clearInterval(id);
  }, [ticketNumber, widgetKey]);

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900">
      <header
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: color }}
      >
        <div>
          <p className="text-sm font-semibold">{workspaceName}</p>
          <p className="text-xs opacity-90">{greeting}</p>
        </div>
        <button
          type="button"
          className="rounded px-2 py-1 text-lg leading-none"
          aria-label="Close"
          onClick={() =>
            window.parent.postMessage(
              { source: "relay-widget", type: "relay-widget:close" },
              "*",
            )
          }
        >
          ×
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!ticketNumber ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const res = await fetch(
                  `/api/widget/${encodeURIComponent(widgetKey)}/start`,
                  {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name,
                      email,
                      message: draft,
                      honeypot,
                    }),
                  },
                );
                const json = await res.json();
                if (!json.ok) {
                  setError(json.error?.message ?? "Could not start chat");
                  return;
                }
                setTicketNumber(json.ticketNumber);
                setMessages([
                  {
                    id: json.message.id,
                    authorType: "CUSTOMER",
                    bodyText: json.message.bodyText,
                    createdAt: json.message.createdAt,
                  },
                ]);
                setDraft("");
              });
            }}
          >
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Textarea
              placeholder="How can we help?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              required
            />
            <input
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              aria-hidden
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Starting…" : "Start chat"}
            </Button>
          </form>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.authorType === "CUSTOMER"
                  ? "ml-8 rounded-lg bg-slate-100 px-3 py-2 text-sm"
                  : "mr-8 rounded-lg px-3 py-2 text-sm text-white"
              }
              style={
                message.authorType === "CUSTOMER"
                  ? undefined
                  : { background: color }
              }
            >
              {message.bodyText}
            </div>
          ))
        )}
      </div>

      {ticketNumber ? (
        <form
          className="border-t border-slate-200 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const res = await fetch(
                `/api/widget/${encodeURIComponent(widgetKey)}/message`,
                {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: draft,
                    ticketNumber,
                    honeypot,
                  }),
                },
              );
              const json = await res.json();
              if (!json.ok) {
                setError(json.error?.message ?? "Could not send");
                return;
              }
              setMessages((prev) => [
                ...prev,
                {
                  id: json.message.id,
                  authorType: "CUSTOMER",
                  bodyText: json.message.bodyText,
                  createdAt: json.message.createdAt,
                },
              ]);
              setDraft("");
            });
          }}
        >
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message"
              required
            />
            <Button type="submit" disabled={pending || !draft.trim()}>
              Send
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </form>
      ) : null}

      {showPoweredBy ? (
        <p className="pb-2 text-center text-[10px] text-slate-400">
          Powered by Relay
        </p>
      ) : null}
    </div>
  );
}
