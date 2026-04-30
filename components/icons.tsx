type IconName = "download" | "scan" | "search" | "upload";

type Props = {
  name: IconName;
  className?: string;
};

const paths: Record<IconName, string[]> = {
  download: ["M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2", "M7 11l5 5l5-5", "M12 4v12"],
  scan: [
    "M4 7V6a2 2 0 0 1 2-2h2",
    "M4 17v1a2 2 0 0 0 2 2h2",
    "M16 4h2a2 2 0 0 1 2 2v1",
    "M16 20h2a2 2 0 0 0 2-2v-1",
    "M5 12h14",
  ],
  search: ["M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0", "M21 21l-6-6"],
  upload: ["M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2", "M7 9l5-5l5 5", "M12 4v12"],
};

export function Icon({ name, className }: Props) {
  return (
    <svg
      className={className ?? "icon"}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name].map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
