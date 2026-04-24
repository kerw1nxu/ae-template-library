"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getMediaUrl } from "@/lib/media-url";
import type { TemplateListItem } from "@/lib/types";

type Props = {
  item: TemplateListItem;
};

export function TemplateCard({ item }: Props) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const delayRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canPreview = item.canPreview && Boolean(item.previewVideoPath);

  useEffect(() => {
    return () => {
      if (delayRef.current) {
        window.clearTimeout(delayRef.current);
      }
    };
  }, []);

  const handleEnter = () => {
    if (!canPreview) {
      return;
    }

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
        video.playbackRate = 3;
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

  const media = (
    <div className="card-media">
      <img src={getMediaUrl(item.thumbnailPath)} alt={item.name} loading="lazy" />
      {canPreview && item.previewVideoPath ? (
        <video
          ref={videoRef}
          src={getMediaUrl(item.previewVideoPath)}
          muted
          loop
          playsInline
          preload="metadata"
          style={{ opacity: isPreviewing ? 1 : 0 }}
        />
      ) : (
        <span className="locked-badge">登录后预览</span>
      )}
    </div>
  );

  const content = (
    <>
      {media}
      <div className="card-body">
        <h2>{item.name}</h2>
        <div className="card-meta">
          <span>{item.uploadedBy}</span>
          <span>{new Date(item.createdAt).toLocaleDateString("zh-CN")}</span>
        </div>
        <div className="tag-row">
          {item.tags.slice(0, 4).map((tag) => (
            <span className="tag" key={`${item.id}-${tag}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  if (!item.canOpenDetail) {
    return (
      <article className="template-card locked-card" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
        {content}
      </article>
    );
  }

  return (
    <Link
      href={`/template/${item.id}`}
      className="template-card"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {content}
    </Link>
  );
}
