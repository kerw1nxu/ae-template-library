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
        video.playbackRate = 1.5;
        await video.play();
      } catch {
        setIsPreviewing(false);
      }
    }, 180);
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
      href={`/template/${item.id}`}
      className="card"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="card-media">
        <img src={getMediaUrl(item.thumbnailPath)} alt={item.name} />
        <video
          ref={videoRef}
          src={getMediaUrl(item.previewVideoPath)}
          muted
          loop
          playsInline
          preload="metadata"
          style={{ opacity: isPreviewing ? 1 : 0, transition: "opacity 0.18s ease" }}
        />
      </div>
      <div className="card-body">
        <h2>{item.name}</h2>
        <div className="tag-row">
          {item.tags.slice(0, 4).map((tag) => (
            <span className="tag" key={`${item.id}-${tag}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
