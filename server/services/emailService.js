import nodemailer from "nodemailer";
import { projectMarkdown } from "./exportService.js";

export async function sendProjectEmail(project, to) {
  // TODO: Skip when SMTP_HOST is not configured, otherwise create the transport from the
  // TODO: SMTP environment variables and send the blueprint Markdown as an attachment.
  return { skipped: true, message: "sendProjectEmail is not implemented yet" };
}
