"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Props = {
  nextPath: string;
};

export function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "登录失败，请检查账号和密码。");
      }

      router.replace(nextPath as Route);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录失败，请检查账号和密码。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="platform-form" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="username">
        账号
      </label>
      <input
        id="username"
        className="text-input"
        type="text"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        required
      />

      <label className="field-label" htmlFor="password">
        密码
      </label>
      <input
        id="password"
        className="text-input"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />

      {status ? <div className="form-status error">{status}</div> : null}

      <button className="primary-button full-width" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "正在登录..." : "登录进入素材库"}
      </button>

      <p className="field-note">登录后会自动返回你刚才访问的页面，默认进入素材库。</p>
    </form>
  );
}
