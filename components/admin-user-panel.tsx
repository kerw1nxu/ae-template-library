"use client";

import { FormEvent, useState } from "react";
import type { UserRecord, UserRole } from "@/lib/types";

type Props = {
  users: UserRecord[];
  currentUserId: string;
};

export function AdminUserPanel({ users, currentUserId }: Props) {
  const [items, setItems] = useState(users);
  const [createState, setCreateState] = useState({
    username: "",
    password: "",
    role: "member" as UserRole,
  });
  const [status, setStatus] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createState),
      });

      const payload = (await response.json()) as { item?: UserRecord; error?: string };
      const nextItem = payload.item;
      if (!response.ok || !nextItem) {
        throw new Error(payload.error ?? "创建账号失败。");
      }

      setItems((current) => [...current, nextItem]);
      setCreateState({ username: "", password: "", role: "member" });
      setStatus("账号已创建。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "创建账号失败。");
    } finally {
      setIsCreating(false);
    }
  };

  const updateUser = async (userId: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { item?: UserRecord; error?: string };
    const nextItem = payload.item;
    if (!response.ok || !nextItem) {
      throw new Error(payload.error ?? "账号更新失败。");
    }

    setItems((current) => current.map((item) => (item.id === nextItem.id ? nextItem : item)));
    return nextItem;
  };

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="section-header">
          <div>
            <h2>创建账号</h2>
            <p className="muted">管理员手动创建内部账号，站点不开放注册。</p>
          </div>
        </div>

        <form className="form" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="new-username">用户名</label>
            <input
              id="new-username"
              type="text"
              value={createState.username}
              onChange={(event) => setCreateState((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="new-password">初始密码</label>
            <input
              id="new-password"
              type="password"
              value={createState.password}
              onChange={(event) => setCreateState((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="new-role">角色</label>
            <select
              id="new-role"
              value={createState.role}
              onChange={(event) =>
                setCreateState((current) => ({ ...current, role: event.target.value as UserRole }))
              }
            >
              <option value="member">成员</option>
              <option value="admin">管理员</option>
            </select>
          </div>

          {status ? <div className={`status${status.includes("失败") ? " error" : " success"}`}>{status}</div> : null}

          <button className="button" type="submit" disabled={isCreating}>
            {isCreating ? "创建中..." : "创建账号"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>现有账号</h2>
            <p className="muted">可以调整角色、启用状态并重置密码。密码重置后该账号会被强制退出。</p>
          </div>
        </div>

        <div className="user-table">
          {items.map((user) => (
            <article className="user-card" key={user.id}>
              <div className="user-card-header">
                <div>
                  <h3>{user.username}</h3>
                  <p className="muted">
                    {user.role === "admin" ? "管理员" : "成员"} · {user.status === "active" ? "启用中" : "已禁用"}
                    {user.id === currentUserId ? " · 当前账号" : ""}
                  </p>
                </div>

                <select
                  value={user.role}
                  onChange={async (event) => {
                    try {
                      await updateUser(user.id, { role: event.target.value });
                      setStatus("角色已更新。");
                    } catch (error) {
                      setStatus(error instanceof Error ? error.message : "角色更新失败。");
                    }
                  }}
                >
                  <option value="member">成员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div className="user-card-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={async () => {
                    try {
                      await updateUser(user.id, {
                        status: user.status === "active" ? "disabled" : "active",
                      });
                      setStatus(user.status === "active" ? "账号已禁用。" : "账号已启用。");
                    } catch (error) {
                      setStatus(error instanceof Error ? error.message : "账号状态更新失败。");
                    }
                  }}
                >
                  {user.status === "active" ? "禁用账号" : "启用账号"}
                </button>

                <input
                  type="password"
                  placeholder="输入新密码"
                  value={passwordDrafts[user.id] ?? ""}
                  onChange={(event) =>
                    setPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))
                  }
                />
                <button
                  className="button"
                  type="button"
                  onClick={async () => {
                    try {
                      await updateUser(user.id, { password: passwordDrafts[user.id] ?? "" });
                      setPasswordDrafts((current) => ({ ...current, [user.id]: "" }));
                      setStatus("密码已重置。");
                    } catch (error) {
                      setStatus(error instanceof Error ? error.message : "密码重置失败。");
                    }
                  }}
                >
                  重置密码
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
