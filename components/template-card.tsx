"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getMediaUrl } from "@/lib/media-url";
import type { TemplateListItem } from "@/lib/types";

type Props = {
  item: TemplateListItem;
  href?: string;
  compact?: boolean;
};

export function TemplateCard({ item, href, compact = false }: Props) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const delayRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const description = item.description.trim() || "打开详情页查看标签分组、预览视频和下载入口。";
  const createdAt = new Date(item.createdAt).toLocaleDateString("zh-CN");
  const linkHref = (href ?? `/template/${item.id}`) as Route;

  useEffect(() => {
    return () => {
      if (delayRef.current) {
        window.clearTimeout(delayRef.current);
      }
    };
  }, []);

  const handleEnter = () => {
    if (delayRef.current) {
      window.clearTimeout(delayRef.current);
    }

    delayRef.current = window.setTimeout(async () => {
      setIsPreviewing(true);

      const video = videoRef.current;
      if (!video) {
        return;
      }

      try {
        video.playbackRate = 1.25;
        await video.play();
      } catch {
        setIsPreviewing(false);
      }
    }, 160);
  };

  const handleLeave = () => {
    if (delayRef.current) {
      window.clearTimeout(delayRef.current);
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.playbackRate = 1;
    }

    setIsPreviewing(false);
  };

  return (
    <Link
      href={linkHref}
      className={`template-card${compact ? " compact" : ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="template-card-media">
        <img src={getMediaUrl(item.thumbnailPath)} alt={item.name} />
        <video
          ref={videoRef}
          className="template-card-video"
          src={getMediaUrl(item.previewVideoPath)}
          muted
          loop
          playsInline
          preload="metadata"
          style={{ opacity: isPreviewing ? 1 : 0 }}
        />
        <div className="template-card-flags">
          <span className="template-flag dark">{isPreviewing ? "预览中" : "模板预览"}</span>
          <span className="template-flag light">{createdAt}</span>
        </div>
      </div>

      <div className="template-card-body">
        <h3 className="template-card-title">{item.name}</h3>
        {!compact ? <p className="template-card-description">{description}</p> : null}
        <div className="template-card-meta">
          <span>{item.uploadedBy}</span>
          <span>{item.tags[0] ?? "AE模板"}</span>
        </div>
      </div>
    </Link>
  );
}
