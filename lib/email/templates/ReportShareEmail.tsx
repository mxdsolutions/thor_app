export type ReportShareEmailProps = {
    recipientName: string | null;
    tenantName: string;
    tenantLogoUrl: string | null;
    tenantPrimaryColor: string;
    senderName: string;
    reportTitle: string;
    message: string | null;
    shareUrl: string;
    expiresAt: string;
};

const THOR_PRIMARY = "#000000";

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatExpiry(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("en-AU", {
            day: "numeric", month: "long", year: "numeric",
        });
    } catch {
        return iso;
    }
}

/** Inline-styled HTML email. THOR-branded shell (header/footer); mention of the
 *  sending tenant in the body so the recipient knows who's asking. Resend doesn't
 *  require @react-email/components — plain HTML works fine and avoids the dep. */
export function renderReportShareEmail(props: ReportShareEmailProps): string {
    const greeting = props.recipientName
        ? `Hi ${escapeHtml(props.recipientName)},`
        : "Hi there,";

    const tenantBadge = props.tenantLogoUrl
        ? `<img src="${escapeHtml(props.tenantLogoUrl)}" alt="${escapeHtml(props.tenantName)}" height="32" style="max-height:32px;display:block;border:0;" />`
        : `<strong style="font-size:18px;color:#0f172a;">${escapeHtml(props.tenantName)}</strong>`;

    const messageBlock = props.message
        ? `<tr><td style="padding:0 32px 16px;">
              <div style="border-left:3px solid #e2e8f0;padding:8px 14px;color:#475569;font-size:14px;line-height:1.5;background:#f8fafc;border-radius:0 6px 6px 0;">
                  ${escapeHtml(props.message).replace(/\n/g, "<br/>")}
              </div>
           </td></tr>`
        : "";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Please complete: ${escapeHtml(props.reportTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <!-- THOR header -->
          <tr>
            <td style="background:${THOR_PRIMARY};padding:20px 32px;color:#ffffff;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">
              THOR
            </td>
          </tr>

          <!-- Tenant badge -->
          <tr>
            <td style="padding:32px 32px 8px;">
              ${tenantBadge}
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 8px;color:#0f172a;font-size:22px;font-weight:600;line-height:1.3;">
              Please complete: ${escapeHtml(props.reportTitle)}
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 16px;color:#475569;font-size:15px;line-height:1.6;">
              ${greeting}<br/><br/>
              <strong>${escapeHtml(props.senderName)}</strong> from <strong>${escapeHtml(props.tenantName)}</strong> has asked you to complete a report. Click the button below to open it — no login required.
            </td>
          </tr>

          ${messageBlock}

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:8px 32px 24px;">
              <a href="${escapeHtml(props.shareUrl)}"
                 style="display:inline-block;background:${escapeHtml(props.tenantPrimaryColor || THOR_PRIMARY)};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                Open the report
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px;color:#94a3b8;font-size:12px;line-height:1.5;">
              This link expires on ${escapeHtml(formatExpiry(props.expiresAt))}. If the button doesn't work, copy and paste this URL into your browser:<br/>
              <a href="${escapeHtml(props.shareUrl)}" style="color:#475569;word-break:break-all;">${escapeHtml(props.shareUrl)}</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:20px 32px;color:#64748b;font-size:12px;line-height:1.5;">
              Sent via <strong style="color:#0f172a;">THOR</strong> — industrial CRM for trades. Built by MXD Solutions.<br/>
              You're receiving this because ${escapeHtml(props.tenantName)} sent you a report to complete.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
