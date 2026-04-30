"use client";

import { FormEvent, useState } from "react";

type Props = {
  nextPath: string;
};

export function LoginForm({ nextPath }: Props) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "登录失败。");
      }
      window.location.href = nextPath || "/";
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-card" onSubmit={submit}>
      <div>
        <p className="eyebrow">受保护的素材库</p>
        <h1>登录 AE 模板素材库</h1>
        <p>登录后可打开详情、预览视频并下载模板包。管理员可继续上传、扫描和维护标签。</p>
      </div>

      <div className="field">
        <label htmlFor="username">账号</label>
        <input id="username" name="username" type="text" autoComplete="username" required />
      </div>

      <div className="field">
        <label htmlFor="password">密码</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {error ? <div className="status error">{error}</div> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "正在登录..." : "登录"}
      </button>
    </form>
  );
}
