import { json } from "../_lib/respond.js";
import { adminEmailFor } from "../_lib/auth.js";

export async function onRequest(context) {
  const email = adminEmailFor(context.request, context.env);
  if (!email) return json({ error: "Not authorized" }, 401);
  context.data.adminEmail = email;
  return context.next();
}
