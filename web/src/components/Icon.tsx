const PATHS = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /></>,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  send: <path d="m3 11 18-8-8 18-2-8z" />,
  up: <path d="m18 15-6-6-6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  edit: <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  chart: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  play: <path d="M7 4v16l13-8z" />,
  upload: <><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  grip: <><circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  video: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3.5v11L16 14" /></>,
  scale: <><rect x="3" y="3" width="18" height="18" rx="4.5" /><path d="M7.5 10a6 6 0 0 1 9 0" /><path d="m12 10 1.6-2.2" /></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  calculator: <><rect x="5" y="2" width="14" height="20" rx="2.5" /><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  sparkles: <><path d="M11 3.5 12.8 8l4.7 1.8-4.7 1.8L11 16.2l-1.8-4.6-4.7-1.8L9.2 8z" /><path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></>,
  devices: <><path d="M17 8V5.5A1.5 1.5 0 0 0 15.5 4h-12A1.5 1.5 0 0 0 2 5.5v8A1.5 1.5 0 0 0 3.5 15H13" /><path d="M6 19h7" /><rect x="16" y="10" width="6" height="11" rx="1.5" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.5-1.9l-.4-1.2a1.6 1.6 0 0 1 1.5-2.1H17a4 4 0 0 0 4-4c0-4.9-4-8.8-9-8.8z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  translate: <><path d="M4 5h8M8 3v2M10.5 5c-1 4-3.5 7-6.5 8.5M6.5 9c1 2 3 3.5 5 4.5" /><path d="m13 21 4-9 4 9M14.5 18h5" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13M12 16.5h.01" /></>,
  rotate: <><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" /><path d="M20.5 4v5h-5" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
  xLogo: <><path d="M4 4h4.5L20 20h-4.5z" /><path d="M19.5 4l-6.6 7.3M4.5 20l6.6-7.3" /></>,
  youtube: <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v5.5M8 7.5v.01M12 16.5V11M12 13.5a2.5 2.5 0 0 1 5 0v3" /></>,
} as const;

const DIRECTIONAL = new Set<string>(['chevron', 'chevronLeft', 'send', 'play', 'arrow']);

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, strokeWidth = 1.75 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg className={DIRECTIONAL.has(name) ? 'flip' : undefined} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
