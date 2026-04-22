import { randomUUID } from "node:crypto";
import { execute } from "@/lib/db";

export async function logAuditEvent(input: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
}) {
  await execute(
    `
      INSERT INTO audit_logs (
        id, actor_user_id, action, target_type, target_id, details_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      input.actorUserId ?? null,
      input.action,
      input.targetType,
      input.targetId ?? null,
      input.details ? JSON.stringify(input.details) : null,
      new Date().toISOString(),
    ],
  );
}
