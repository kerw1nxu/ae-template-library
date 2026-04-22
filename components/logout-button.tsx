"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsSubmitting(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login" as Route);
      router.refresh();
      setIsSubmitting(false);
    }
  };

  return (
    <button className="secondary-button" type="button" onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "退出中..." : "退出登录"}
    </button>
  );
}
