// Slack webhook notifications.
// Two types: posts ready for review (end of generation), and failures.

type SlackBlock =
  | {
      type: "section";
      text: { type: "mrkdwn"; text: string };
    }
  | {
      type: "actions";
      elements: Array<{
        type: "button";
        text: { type: "plain_text"; text: string };
        url: string;
        style?: "primary" | "danger";
      }>;
    };

async function post(text: string, blocks: SlackBlock[]) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    console.warn("[slack] SLACK_WEBHOOK_URL not set — skipping notification");
    return;
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
    });
    if (!res.ok) {
      console.error(`[slack] webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[slack] webhook POST failed", err);
  }
}

export async function notifyReadyForReview(opts: {
  postCount: number;
  runId: string;
  categories: string[];
}) {
  const { postCount, runId, categories } = opts;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const queueUrl = `${appUrl}/queue`;
  const text = `${postCount} posts ready for review`;
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${postCount} LinkedIn posts ready for review*\nCategories: ${categories.join(", ")}\nRun ID: \`${runId.slice(0, 8)}\``,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Review Queue" },
          url: queueUrl,
          style: "primary",
        },
      ],
    },
  ];
  await post(text, blocks);
}

export async function notifyApproved(opts: {
  postId: string;
  approvedBy: string;
  scheduledFor: string | null;
  devMode?: boolean;
}) {
  const { postId, approvedBy, scheduledFor, devMode } = opts;
  const scheduledLabel = scheduledFor
    ? new Date(scheduledFor).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
        timeZoneName: "short",
      })
    : "(no schedule)";
  const devTag = devMode ? " *(DEV_MODE — skipped Publer)*" : "";
  const text = `Post approved by ${approvedBy}`;
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: *Post approved${devTag}*\nBy: *${approvedBy}*\nScheduled for: *${scheduledLabel}*\nPost ID: \`${postId.slice(0, 8)}\``,
      },
    },
  ];
  await post(text, blocks);
}

export async function notifyPublished(opts: {
  postId: string;
  linkedinUrl?: string | null;
}) {
  const { postId, linkedinUrl } = opts;
  const text = "Post live on LinkedIn";
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:loudspeaker: *Post live on LinkedIn*\nPost ID: \`${postId.slice(0, 8)}\`${linkedinUrl ? `\n<${linkedinUrl}|View post>` : ""}`,
      },
    },
  ];
  await post(text, blocks);
}

export async function notifyPublishFailed(opts: {
  postId: string;
  error: unknown;
}) {
  const message = opts.error instanceof Error ? opts.error.message : String(opts.error);
  const text = "Publish failed";
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:rotating_light: *Publish failed*\nPost ID: \`${opts.postId.slice(0, 8)}\`\nError: ${message}\nTime: ${new Date().toISOString()}`,
      },
    },
  ];
  await post(text, blocks);
}

export async function notifyAnalyticsSyncFailed(opts: { error: unknown }) {
  const message = opts.error instanceof Error ? opts.error.message : String(opts.error);
  const text = "Analytics sync failed";
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:warning: *Analytics sync failed*\nError: ${message}\nTime: ${new Date().toISOString()}`,
      },
    },
  ];
  await post(text, blocks);
}

export async function notifyFailure(opts: {
  context: string;
  error: unknown;
  postId?: string;
  runId?: string;
}) {
  const { context, error, postId, runId } = opts;
  const message = error instanceof Error ? error.message : String(error);
  const text = `PatientPartner Social Agent failure: ${context}`;
  const details = [
    `*Context:* ${context}`,
    `*Error:* ${message}`,
    postId && `*Post ID:* \`${postId.slice(0, 8)}\``,
    runId && `*Run ID:* \`${runId.slice(0, 8)}\``,
    `*Time:* ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:rotating_light: *PatientPartner Social Agent Alert*\n${details}`,
      },
    },
  ];
  await post(text, blocks);
}
