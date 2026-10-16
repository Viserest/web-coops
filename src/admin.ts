
import { IRequest, RequestHandler } from "itty-router";
import { CFArgs, router } from "./index";
import { get_cookie } from "./common";
import { Admin } from "./schema";

const SESSION_COOKIE_NAME = "session_id";

const withAdmin: RequestHandler<IRequest, CFArgs> = async (req, env, ctx) => {
	const r = () => new Response(null, {
		headers: { "Location": "/admin/login" },
	});
	// Get session id
	const session_id = get_cookie(req, SESSION_COOKIE_NAME);
	if (session_id === null) return r();

	const admin: Admin | null = await env.DB
		.prepare(`SELECT admin.*
		  FROM sesssion
		  JOIN session ON admin.id = session.admin_id
		  WHERE session.id = ?`)
		.bind(session_id)
		.first();
	if (admin === null) return r();

	req.admin = admin;
};

router.get("/admin", (req, env, ctx) => {
	// if logged in: Dashboard
	// else: Login Page
});
router.get("/api/message", withAdmin, (req, env, ctx) => { });
router.get("/api/subscriber", withAdmin, (req, env, ctx) => { });
router.get("/api/link", withAdmin, (req, env, ctx) => { });
router.get("/message/:id_message/send", withAdmin, (req, env, ctx) => { });




router.get("/message_send/:msg_id", (c) =>
  c.html(`<form action="/coops/message_send" method="POST">
    <h1>Send to Newsletter</h1>
    <input type="text" name="message_id" value="${c.req.param("msg_id")}" />
    <input type="text" name="recipient" value="all" hidden />
    <input type="submit" />
</form>
<form action="/coops/message_send" method="POST">
    <h1>Send to Email Address</h1>
    <input type="text" name="message_id" value="${c.req.param("msg_id")}" />
    <input type="text" name="recipient" value="${CONFIG.SMTP_DEFAULT_EMAIL}" />
    <input type="submit" />
</form>`),
);

function temp_email(msg: Message, link: Link) {
  return {
    html: `<html lang="en">
  <head>
      <title>Coop's Pizzeria</title>
  </head>
  <body style="margin: 0; border-radius: 10px; background: black; color: white; text-align: center;">
    <div>
      <img src="https://coopspizzeria.com/apps/coops/assets/images/logo.png" alt="Coop's Pizzeria Logo" style="display: block; margin: 0 auto; width: 100%; max-width: 400px;">
      <h1>Taste The Difference</h1>
  </div>
  <div>
      <p>${msg.text}</p>
      <img src="https://coopspizzeria.com/uploads/${msg._image}" alt="Newsletter image" style="display: block; margin: 0 auto; width: 100%; max-width: 700px;">
  </div>
  <div>
      <p>1219A W. Crawford St, Salina, KS</p>
      <p>Open Monday-Saturday 11AM-8PM, Closed Sunday</p>
      <p>+1 785-823-5556</p>
      <a href="https://coopspizzeria.com/email_msg/${link.code}" style="display: block; color: inherit;">Click to view this email as a web page</a>
      <a href="https://coopspizzeria.com/confirm/${link.code}" style="display: block; color: inherit;">Click to unsubscribe</a>
  </div>
  </body>
  </html>`,
    text: `Coop's Pizzeria

1219A W. Crawford St, Salina, KS
Open Monday-Saturday 11AM-8PM, Closed Sunday
+1 (785)-823-5556

${msg.subject}
${msg.text}

Click to view this email as a web page:
https://coopspizzeria.com/email_msg/${link.code}

Click to unsubscribe:
https://coopspizzeria.com/confirm/${link.code}
`,
  };
}

Events.create("send_batch", async (vars) => {
  const message: Message = vars.message;

  // Get 100 emails which are not in the link table and not deleted
  const emails = await coops_db<
    { sub_id: number; email: string }[]
  >`SELECT subscribers.id, subscribers.email
FROM subscribers
WHERE NOT EXISTS (SELECT 1
    FROM links
    WHERE links.msg_id = ${message.id}
      AND links.email = subscribers.email)
AND subscribers.deleted_at = 0 LIMIT ${CONFIG.SMTP_SEND_COUNT}`;

  // Close if no emails are found
  if (emails.length === 0) {
    Events.stop(vars.code);
    return;
  }

  let batch = await Promise.all(
    emails.map(async (sub) => {
      // Create link
      const link =
        await coops_db<Link>`INSERT INTO links (sub_id, msg_id) VALUES (${sub.sub_id},${message.id}) RETURNING *`;

      // Convert to resend batch
      return {
        from: CONFIG.SMTP_EMAIL,
        to: sub.email,
        subject: message.subject,
        ...temp_email(message, link),
      };
    }),
  );

  // Send email
  if (resend === null) {
    console.log(
      `[IN DEV MODE] Would've sent to ${emails.length} email addresses.`,
    );
  } else {
    const { data, error } = await resend.batch.send(batch);

    // Print response
    if (error) console.error(error);
    else console.log(data);
  }

  // Update the send count
  coops_db`UPDATE messages SET sent = sent + ${emails.length} WHERE id = ${message.id}`;
});

// message_id, recipient: all, 1 email
router.post("/message_send", async (c) => {
  // Get body
  const body = new URLSearchParams(await c.req.text());

  // Get message_code
  const message_id = body.get("message_id");
  if (message_id === null) return c.text("Message code not provided.");

  // Get message
  const message =
    await coops_db<Message | null>`SELECT * FROM messages WHERE id = ${message_id}`;
  if (message === null) return c.text("Message code not found.");

  // Get recipient
  const recipient = body.get("recipient");
  if (recipient === null) return c.text("Recipient not provided.");

  /**
   * Send to every email subscribed
   */
  if (recipient === "all") {
    const code = Events.schedule(
      "send_batch",
      { message },
      CONFIG.SMTP_INTERVAL,
    );

    logger("coops", "message", c.get("ray"), {
      action: "newsletter",
      msg_id: message.id,
      admin_username: c.get("admin").username,
    });

    const event = await Events.read(code);
    if (event === null) return c.text("Unable to start sending.");

    const count = await coops_db<number>`SELECT COUNT(*) FROM subscribers`;

    // Both in milliseconds
    const finish_in = (count * event.delay) / CONFIG.SMTP_SEND_COUNT;
    const finish_at = new Date(Date.now() + finish_in);

    return c.text(`Sending to ${count} emails.
Sending at ${CONFIG.SMTP_SEND_COUNT} emails/day.
Finishing in ${finish_in / 3600}hrs.
Finishing at ${finish_at}.`);
  } else {
    /**
     * Send to a single email
     */
    const email = decodeURIComponent(recipient);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return c.text("Invalid email address.");

    // Find subscriber or create a new one
    let sub =
      await coops_db<Subscriber | null>`SELECT * FROM subscribers WHERE email = ${email} LIMIT 1`;
    if (sub === null)
      sub =
        await coops_db<Subscriber>`INSERT INTO subscribers (email, name) VALUES (${email}, "test") RETURNING *`;

    // Create link
    const link =
      await coops_db<Link>`INSERT INTO links (sub_id, msg_id) VALUES (${sub.id},${message.id}) RETURNING *`;

    if (resend === null) {
      console.log(`[IN DEV MODE] Would've sent to ${email}.`);
    } else {
      const { data, error } = await resend.emails.send({
        from: CONFIG.SMTP_EMAIL,
        to: [email],
        subject: message.subject,
        ...temp_email(message, link),
      });

      // Print response
      if (error) console.error(error);
      else console.log(data);
    }

    // Update the send count
    coops_db`UPDATE messages SET sent = sent + 1 WHERE id = ${message.id}`;
    return c.text(`Sent to: ${email}.`);
  }
});
