const FAQS = [
  {
    q: "Can I try Relay without a credit card?",
    a: "Yes. The free plan is available immediately, and the live demo workspace lets you explore the inbox without signing up.",
  },
  {
    q: "How does multi-tenant isolation work?",
    a: "Every workspace is scoped with Postgres row-level security. Agents only ever see tickets and customers from the workspace they belong to.",
  },
  {
    q: "Does Relay support email and a website widget?",
    a: "Yes. Inbound email threads into the same inbox as widget and manual tickets, with shared SLAs and automations.",
  },
  {
    q: "Can I invite my team?",
    a: "Owners and admins can invite agents by email. Plans include seat limits that scale from Free to Business.",
  },
];

export function Faq() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      {FAQS.map((item) => (
        <div key={item.q} className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight">{item.q}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.a}
          </p>
        </div>
      ))}
    </div>
  );
}
