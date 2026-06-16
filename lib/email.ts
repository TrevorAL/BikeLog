export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NOTIFICATIONS_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { ok: false, error: "Email provider not configured." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, text: opts.text }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body.slice(0, 200) };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error." };
  }
}
