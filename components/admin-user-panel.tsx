"use client";

import { FormEvent, useMemo, useState } from "react";
import type { UserRecord, UserRole } from "@/lib/types";

type Props = {
  users: UserRecord[];
  currentUserId: string;
};

type FeedbackState =
  | { kind: "idle"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function AdminUserPanel({ users, currentUserId }: Props) {
  const [items, setItems] = useState(users);
  const [createState, setCreateState] = useState({
    username: "",
    password: "",
    role: "member" as UserRole,
  });
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle", message: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((user) => user.status === "active").length,
      admins: items.filter((user) => user.role === "admin").length,
    }),
    [items],
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback({ kind: "idle", message: "" });
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
        throw new Error(payload.error ?? "创建用户失败。");
      }

      setItems((current) => [...current, nextItem]);
      setCreateState({ username: "", password: "", role: "member" });
      setFeedback({ kind: "success", message: "用户已创建。" });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "创建用户失败。",
      });
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
      throw new Error(payload.error ?? "更新用户失败。");
    }

    setItems((current) => current.map((item) => (item.id === nextItem.id ? nextItem : item)));
    return nextItem;
  };

  return (
    <div className="admin-layout">
      <section className="admin-summary">
        <article className="admin-stat">
          <span>总账号数</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="admin-stat">
          <span>启用中</span>
          <strong>{stats.active}</strong>
        </article>
        <article className="admin-stat">
          <span>管理员</span>
          <strong>{stats.admins}</strong>
        </article>
      </section>

      <section className="admin-panels">
        <div className="admin-panel">
          <div className="panel-head">
            <div>
              <span className="section-overline">创建账号</span>
              <h2>新增内部用户</h2>
              <p>平台不开放注册，所有成员由管理员创建并分配角色。</p>
            </div>
          </div>

          <form className="platform-form" onSubmit={handleCreate}>
            <label className="field-label" htmlFor="new-username">
              账号名
            </label>
            <input
              id="new-username"
              className="text-input"
              type="text"
              value={createState.username}
              onChange={(event) => setCreateState((current) => ({ ...current, username: event.target.value }))}
              required
            />

            <label className="field-label" htmlFor="new-password">
              初始密码
            </label>
            <input
              id="new-password"
              className="text-input"
              type="password"
              value={createState.password}
              onChange={(event) => setCreateState((current) => ({ ...current, password: event.target.value }))}
              required
            />

            <label className="field-label" htmlFor="new-role">
              角色
            </label>
            <select
              id="new-role"
              className="text-input"
              value={createState.role}
              onChange={(event) =>
                setCreateState((current) => ({ ...current, role: event.target.value as UserRole }))
              }
            >
              <option value="member">成员</option>
              <option value="admin">管理员</option>
            </select>

            {feedback.message ? (
              <div className={`form-status${feedback.kind === "error" ? " error" : " success"}`}>
                {feedback.message}
              </div>
            ) : null}

            <button className="primary-button full-width" type="submit" disabled={isCreating}>
              {isCreating ? "正在创建..." : "创建用户"}
            </button>
          </form>
        </div>

        <div className="admin-panel wide">
          <div className="panel-head">
            <div>
              <span className="section-overline">账号列表</span>
              <h2>角色、状态与密码</h2>
              <p>在同一个管理台里维护用户角色、启停状态和密码重置。</p>
            </div>
          </div>

          <div className="user-card-list">
            {items.map((user) => (
              <article key={user.id} className="user-item-card">
                <div className="user-item-head">
                  <div>
                    <h3>{user.username}</h3>
                    <p>
                      {user.role === "admin" ? "管理员" : "成员"} ·{" "}
                      {user.status === "active" ? "启用中" : "已停用"}
                      {user.id === currentUserId ? " · 当前登录账号" : ""}
                    </p>
                  </div>

                  <select
                    className="text-input compact-select"
                    value={user.role}
                    onChange={async (event) => {
                      try {
                        await updateUser(user.id, { role: event.target.value });
                        setFeedback({ kind: "success", message: `已更新 ${user.username} 的角色。` });
                      } catch (error) {
                        setFeedback({
                          kind: "error",
                          message: error instanceof Error ? error.message : "更新角色失败。",
                        });
                      }
                    }}
                  >
                    <option value="member">成员</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>

                <div className="user-item-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={async () => {
                      try {
                        await updateUser(user.id, {
                          status: user.status === "active" ? "disabled" : "active",
                        });
                        setFeedback({
                          kind: "success",
                          message:
                            user.status === "active"
                              ? `已停用 ${user.username}。`
                              : `已启用 ${user.username}。`,
                        });
                      } catch (error) {
                        setFeedback({
                          kind: "error",
                          message: error instanceof Error ? error.message : "更新状态失败。",
                        });
                      }
                    }}
                  >
                    {user.status === "active" ? "停用账号" : "启用账号"}
                  </button>

                  <div className="password-reset-row">
                    <input
                      className="text-input"
                      type="password"
                      placeholder="输入新密码"
                      value={passwordDrafts[user.id] ?? ""}
                      onChange={(event) =>
                        setPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))
                      }
                    />
                    <button
                      className="primary-button"
                      type="button"
                      onClick={async () => {
                        try {
                          await updateUser(user.id, { password: passwordDrafts[user.id] ?? "" });
                          setPasswordDrafts((current) => ({ ...current, [user.id]: "" }));
                          setFeedback({ kind: "success", message: `已重置 ${user.username} 的密码。` });
                        } catch (error) {
                          setFeedback({
                            kind: "error",
                            message: error instanceof Error ? error.message : "重置密码失败。",
                          });
                        }
                      }}
                    >
                      重置密码
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
