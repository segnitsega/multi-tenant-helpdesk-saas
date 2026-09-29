import sanitizeHtml from "sanitize-html";
import { htmlToText } from "@/lib/html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "span",
];

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      code: ["class"],
      span: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}

export function sanitizeAndPlainText(html: string): {
  bodyHtml: string;
  bodyText: string;
} {
  const bodyHtml = sanitizeRichHtml(html);
  return { bodyHtml, bodyText: htmlToText(bodyHtml) };
}
