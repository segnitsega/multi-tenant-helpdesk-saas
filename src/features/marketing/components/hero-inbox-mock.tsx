export function HeroInboxMock() {
  return (
    <div
      aria-hidden
      className="border-border/60 bg-background/80 relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border shadow-2xl shadow-black/10 backdrop-blur"
    >
      <div className="border-border/60 flex h-10 items-center gap-2 border-b px-4">
        <span className="size-2.5 rounded-full bg-red-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="text-muted-foreground ml-3 text-xs">Relay · Inbox</span>
      </div>
      <div className="grid min-h-[280px] grid-cols-[7rem_11rem_1fr] md:min-h-[360px] md:grid-cols-[9rem_14rem_1fr]">
        <div className="border-border/60 bg-muted/30 space-y-2 border-r p-3">
          {["All open", "Mine", "Unassigned", "Pending"].map((label, i) => (
            <div
              key={label}
              className={`rounded-md px-2 py-1.5 text-[11px] ${
                i === 0
                  ? "bg-primary/15 text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="border-border/60 space-y-0 border-r">
          {[
            { n: 128, subject: "Refund for order #4821", who: "Ava Chen" },
            { n: 127, subject: "Can't reset password", who: "Noah Patel" },
            { n: 126, subject: "API rate limit spike", who: "Jordan Lee" },
          ].map((row, i) => (
            <div
              key={row.n}
              className={`border-border/40 space-y-1 border-b px-3 py-2.5 ${
                i === 0 ? "bg-primary/10" : ""
              }`}
            >
              <p className="text-muted-foreground text-[10px]">{row.who}</p>
              <p className="truncate text-[11px] font-medium">
                #{row.n} {row.subject}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col p-4">
          <p className="text-sm font-semibold">#128 Refund for order #4821</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Ava Chen · via email
          </p>
          <div className="bg-muted/40 mt-4 space-y-2 rounded-lg p-3 text-xs leading-relaxed">
            <p>Hi team — I was charged twice for order #4821. Can you help?</p>
          </div>
          <div className="bg-primary/10 mt-3 ml-auto max-w-[85%] space-y-2 rounded-lg p-3 text-xs leading-relaxed">
            <p>
              Thanks Ava — I can see the duplicate charge. I&apos;ve queued a
              refund and will confirm once it posts.
            </p>
          </div>
          <div className="border-border/60 mt-auto rounded-lg border border-dashed px-3 py-4 text-[11px] text-muted-foreground">
            Write a reply… ⌘Enter to send
          </div>
        </div>
      </div>
    </div>
  );
}
