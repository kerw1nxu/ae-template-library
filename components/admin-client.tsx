"use client";

import { FormEvent, useState } from "react";
import type { AdminUserRecord, TagGroup, UserRole } from "@/lib/types";

type Props = {
  initialUsers: AdminUserRecord[];
  initialTagGroups: TagGroup[];
};

type Status = {
  kind: "idle" | "success" | "error";
  message: string;
};

export function AdminClient({ initialUsers, initialTagGroups }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [tagGroups, setTagGroups] = useState(initialTagGroups);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  const reloadUsers = async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const payload = (await response.json()) as { items?: AdminUserRecord[]; error?: string };
    if (!response.ok || !payload.items) {
      throw new Error(payload.error ?? "账号列表加载失败。");
    }
    setUsers(payload.items);
  };

  const reloadGroups = async () => {
    const response = await fetch("/api/admin/tag-groups", { cache: "no-store" });
    const payload = (await response.json()) as { items?: TagGroup[]; error?: string };
    if (!response.ok || !payload.items) {
      throw new Error(payload.error ?? "分类列表加载失败。");
    }
    setTagGroups(payload.items);
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

  const createGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await run(async () => {
      const response = await fetch("/api/admin/tag-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(formData.get("name") ?? "") }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "分类创建失败。");
      }
      form.reset();
      await reloadGroups();
    }, "分类已创建。");
  };

  const createTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await run(async () => {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          groupName: String(formData.get("groupName") ?? ""),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "标签创建失败。");
      }
      form.reset();
      await reloadGroups();
    }, "标签已创建。");
  };

  const patchGroup = async (groupName: string, body: Record<string, unknown>) => {
    await run(async () => {
      const response = await fetch(`/api/admin/tag-groups/${encodeURIComponent(groupName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "分类更新失败。");
      }
      await reloadGroups();
    }, "分类已更新。");
  };

  const patchTag = async (id: number, body: Record<string, unknown>) => {
    await run(async () => {
      const response = await fetch(`/api/admin/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "标签更新失败。");
      }
      await reloadGroups();
    }, "标签已更新。");
  };

  return (
    <div className="admin-layout">
      {status.message ? <div className={`status ${status.kind}`}>{status.message}</div> : null}

      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Accounts</p>
            <h2>账号管理</h2>
          </div>
          <p>创建账号、调整角色，或停用不再使用的账号。</p>
        </div>

        <form className="inline-form user-form" onSubmit={createUser}>
          <input name="username" type="text" placeholder="账号" required />
          <input name="password" type="password" placeholder="初始密码，至少 8 位" required />
          <select name="role" defaultValue="user">
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button className="primary-button" type="submit">创建账号</button>
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
                {user.disabledAt ? "恢复" : "停用"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Taxonomy</p>
            <h2>分类与标签</h2>
          </div>
          <p>维护首页筛选、上传选择和详情页展示所使用的标签体系。</p>
        </div>

        <form className="inline-form" onSubmit={createGroup}>
          <input name="name" type="text" placeholder="新分类名称" required />
          <button className="primary-button" type="submit">创建分类</button>
        </form>

        <form className="inline-form tag-form" onSubmit={createTag}>
          <input name="name" type="text" placeholder="新标签名称" required />
          <select name="groupName" required defaultValue="">
            <option value="" disabled>选择分类</option>
            {tagGroups.map((group) => (
              <option key={group.groupName} value={group.groupName}>
                {group.groupName}
              </option>
            ))}
          </select>
          <button className="primary-button" type="submit">创建标签</button>
        </form>

        <div className="group-admin-list">
          {tagGroups.map((group) => (
            <section className="group-admin" key={group.groupName}>
              <div className="group-admin-head">
                <div>
                  <strong>{group.groupName}</strong>
                  <span>{group.isEnabled ? "已启用" : "已停用"}</span>
                </div>
                <div className="row-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      const name = window.prompt("输入新的分类名称", group.groupName);
                      if (name && name !== group.groupName) {
                        void patchGroup(group.groupName, { name });
                      }
                    }}
                  >
                    重命名
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => void patchGroup(group.groupName, { isEnabled: !group.isEnabled })}
                  >
                    {group.isEnabled ? "停用" : "启用"}
                  </button>
                </div>
              </div>
              <div className="admin-tags">
                {group.tags.map((tag) => (
                  <span className={`admin-tag${tag.isEnabled ? "" : " disabled"}`} key={tag.id}>
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => {
                        const name = window.prompt("输入新的标签名称", tag.name);
                        if (name && name !== tag.name) {
                          void patchTag(tag.id, { name });
                        }
                      }}
                    >
                      改名
                    </button>
                    <button
                      type="button"
                      onClick={() => void patchTag(tag.id, { isEnabled: !tag.isEnabled })}
                    >
                      {tag.isEnabled ? "停用" : "启用"}
                    </button>
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
