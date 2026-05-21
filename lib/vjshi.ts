const VJSHI_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const ACW_POS_LIST = [
  0xf, 0x23, 0x1d, 0x18, 0x21, 0x10, 0x1, 0x26, 0xa, 0x9, 0x13, 0x1f, 0x28, 0x1b, 0x16, 0x17, 0x19, 0xd, 0x6,
  0xb, 0x27, 0x12, 0x14, 0x8, 0xe, 0x15, 0x20, 0x1a, 0x2, 0x1e, 0x7, 0x4, 0x11, 0x5, 0x3, 0x1c, 0x22, 0x25,
  0xc, 0x24,
];

const ACW_MASK = "3000176000856006061501533003690027800375";

type RemoteAsset = {
  url: string;
  extension: string;
  bytes: Buffer;
};

export type VjshiTemplateAssets = {
  vjshiId: string;
  title: string;
  keywords: string[];
  thumbnail: RemoteAsset;
  previewVideo: RemoteAsset;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanUrl(value: string) {
  return decodeHtml(value)
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\+$/g, "")
    .trim();
}

function getExtensionFromUrl(url: string, fallback: string) {
  try {
    const ext = new URL(url).pathname.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
    return ext ?? fallback;
  } catch {
    return fallback;
  }
}

function parseSetCookie(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const raw = withGetSetCookie.getSetCookie?.() ?? (headers.get("set-cookie") ? [headers.get("set-cookie")!] : []);
  return raw
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);
}

function solveAcwCookie(arg1: string) {
  const output = Array.from({ length: ACW_POS_LIST.length }, () => "");
  for (const [index, char] of Array.from(arg1).entries()) {
    const target = ACW_POS_LIST.findIndex((position) => position === index + 1);
    if (target >= 0) {
      output[target] = char;
    }
  }

  const arg2 = output.join("");
  let cookie = "";
  for (let index = 0; index < Math.min(arg2.length, ACW_MASK.length); index += 2) {
    cookie += (Number.parseInt(arg2.slice(index, index + 2), 16) ^ Number.parseInt(ACW_MASK.slice(index, index + 2), 16))
      .toString(16)
      .padStart(2, "0");
  }
  return cookie;
}

async function fetchVjshiHtml(url: string) {
  const baseHeaders = {
    "User-Agent": VJSHI_USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: "https://www.vjshi.com/",
  };

  const first = await fetch(url, { headers: baseHeaders, cache: "no-store" });
  let html = await first.text();
  const arg1 = html.match(/var arg1='([0-9a-f]+)'/i)?.[1];
  if (!arg1) {
    return html;
  }

  const cookies = [...parseSetCookie(first.headers), `acw_sc__v2=${solveAcwCookie(arg1)}`].join("; ");
  const second = await fetch(url, {
    headers: {
      ...baseHeaders,
      Cookie: cookies,
    },
    cache: "no-store",
  });
  html = await second.text();
  if (/var arg1='[0-9a-f]+'/i.test(html)) {
    throw new Error("VJshi 页面校验未通过。");
  }
  return html;
}

function extractMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match) {
      return decodeHtml(match).trim();
    }
  }
  return "";
}

function extractTitle(html: string) {
  const ogTitle = extractMeta(html, "og:title");
  const rawTitle = ogTitle || decodeHtml(html.match(/<title>([^<]+)/i)?.[1] ?? "").trim();
  return rawTitle
    .replace(/[_-]?\s*(?:AE模板下载|视频素材下载).*$/u, "")
    .replace(/[-_]\s*光厂.*$/u, "")
    .trim();
}

function extractKeywords(html: string) {
  return Array.from(
    new Set(
      extractMeta(html, "keywords")
        .split(/[\s,，、]+/u)
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

function extractImageUrl(html: string) {
  const ogImage = extractMeta(html, "og:image");
  if (ogImage) {
    return cleanUrl(ogImage);
  }

  const cover = html.match(/https?:\\?\/\\?\/pic\.vjshi\.com[^"'<> ]+video_cover[^"'<> ]*/i)?.[0];
  const image = cover ?? html.match(/https?:\\?\/\\?\/pic\.vjshi\.com[^"'<> ]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'<> ]*)?/i)?.[0];
  return image ? cleanUrl(image) : "";
}

function extractVideoUrl(html: string) {
  const urls = Array.from(
    html.matchAll(/https?:\\?\/\\?\/(?:l?mp4|mp4)\.vjshi\.com[^"'<> ]+?\.mp4(?:\?[^"'<> ]*)?/gi),
    (match) => cleanUrl(match[0]),
  );
  return urls.find((url) => url.includes("mp4.vjshi.com")) ?? urls[0] ?? "";
}

async function downloadAsset(url: string, label: string, fallbackExtension: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": VJSHI_USER_AGENT,
      Referer: "https://www.vjshi.com/",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${label}下载失败。`);
  }
  return {
    url,
    extension: getExtensionFromUrl(url, fallbackExtension),
    bytes: Buffer.from(await response.arrayBuffer()),
  };
}

export async function fetchVjshiTemplateAssets(vjshiId: string): Promise<VjshiTemplateAssets> {
  const html = await fetchVjshiHtml(`https://www.vjshi.com/watch/${vjshiId}.html`);
  const title = extractTitle(html);
  const keywords = extractKeywords(html);
  const thumbnailUrl = extractImageUrl(html);
  const previewVideoUrl = extractVideoUrl(html);

  if (!title) {
    throw new Error("没有解析到 VJshi 标题。");
  }
  if (!thumbnailUrl) {
    throw new Error("没有解析到 VJshi 封面图。");
  }
  if (!previewVideoUrl) {
    throw new Error("没有解析到 VJshi 预览视频。");
  }
  if (keywords.length === 0) {
    throw new Error("没有解析到 VJshi tags。");
  }

  const [thumbnail, previewVideo] = await Promise.all([
    downloadAsset(thumbnailUrl, "封面图", ".jpg"),
    downloadAsset(previewVideoUrl, "预览视频", ".mp4"),
  ]);

  return {
    vjshiId,
    title,
    keywords,
    thumbnail,
    previewVideo,
  };
}
