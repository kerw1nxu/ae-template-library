"use client";

import { FormEvent, useState } from "react";
import type { AdminUserRecord, UserRole } from "@/lib/types";

type Props = {
  initialUsers: AdminUserRecord[];
};

type Status = {
  kind: "idle" | "success" | "error";
  message: string;
};

export function AdminClient({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  const reloadUsers = async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const payload = (await response.json()) as { items?: AdminUserRecord[]; error?: string };
    if (!response.ok || !payload.items) {
      throw new Error(payload.error ?? "账号列表加载失败。");
    }
    setUsers(payload.items);
  };

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setStatus({ kind: "idle", message: "" });
    try {
      await action();
      setStatus({ kind: "success", message: successMessage });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "操作失败。" });
    }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await run(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? ""),
          role: String(formData.get("role") ?? "user"),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "账号创建失败。");
      }
      form.reset();
      await reloadUsers();
    }, "账号已创建。");
  };

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    await run(async () => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "账号更新失败。");
      }
      await reloadUsers();
    }, "账号已更新。");
  };

  return (
    <div className="admin-layout">
      {status.message ? <div className={`status ${status.kind}`}>{status.message}</div> : null}

      <section className="admin-panel">
        <div className="panel-title">
          <h2>成员账号</h2>
          <p>只能由管理员创建账号，没有公开注册入口。</p>
        </div>

        <form className="inline-form" onSubmit={createUser}>
          <input name="username" type="text" placeholder="账号" required />
          <input name="password" type="password" placeholder="初始密码，至少 8 位" required />
          <select name="role" defaultValue="user">
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button className="primary-button" type="submit">新增账号</button>
        </form>

        <div className="admin-table">
          {users.map((user) => (
            <div className="admin-row" key={user.id}>
              <div>
                <strong>{user.username}</strong>
                <span>{user.disabledAt ? "已停用" : user.role}</span>
              </div>
              <select
                value={user.role}
                onChange={(event) => void patchUser(user.id, { role: event.target.value as UserRole })}
                disabled={Boolean(user.disabledAt)}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  const password = window.prompt("输入新密码，至少 8 位");
                  if (password) {
                    void patchUser(user.id, { password });
                  }
                }}
              >
                重置密码
              </button>
              <button
                type="button"
                className={user.disabledAt ? "ghost-button" : "danger-button"}
                onClick={() => void patchUser(user.id, { disabled: !user.disabledAt })}
              >
                {user.disabledAt ? "启用" : "停用"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
