import "server-only";
import { env } from "@/server/env";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderEmailLayout(input: {
  preheader?: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
  workspaceName?: string;
}) {
  const brand = input.workspaceName?.trim() || env.MAIL_FROM_NAME || "Relay";
  const preheader = input.preheader ?? input.title;
  const year = new Date().getFullYear();
  const footer =
    input.footerNote ??
    "You received this email because of activity in your Relay workspace.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background: #f4f5f7; }
    a { color: #4f46e5; }
    .btn a { text-decoration: none !important; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:20px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">
                    ${escapeHtml(brand)}
                  </td>
                  <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:500;">
                    Support
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:650;color:#18181b;">
                ${escapeHtml(input.title)}
              </h1>
              <div style="font-size:15px;line-height:1.6;color:#3f3f46;">
                ${input.bodyHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f4f4f5;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;font-size:12px;line-height:1.5;color:#71717a;">
                    ${escapeHtml(footer)}
                    <br />
                    © ${year} Relay · ${escapeHtml(env.APP_URL.replace(/^https?:\/\//, ""))}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" class="btn" style="margin:24px 0;">
  <tr>
    <td align="center" bgcolor="#4f46e5" style="border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:600;color:#ffffff;border-radius:10px;background:#4f46e5;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function emailParagraph(html: string) {
  return `<p style="margin:0 0 14px;">${html}</p>`;
}

export function emailMuted(html: string) {
  return `<p style="margin:0 0 14px;font-size:13px;color:#71717a;">${html}</p>`;
}
