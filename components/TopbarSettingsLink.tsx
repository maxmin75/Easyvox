import Link from "next/link";

type TopbarSettingsLinkProps = {
  href: string;
  className?: string;
};

export default function TopbarSettingsLink({ href, className }: TopbarSettingsLinkProps) {
  return (
    <Link
      href={href}
      className={className ?? "topbar-settings-link topbar-settings-tooltip"}
      data-tooltip="Impostazioni"
      aria-label="Impostazioni Profilo"
      title="Impostazioni"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M19.4 12.9a7.6 7.6 0 0 0 .05-.9 7.6 7.6 0 0 0-.05-.9l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.4.96a7.17 7.17 0 0 0-1.57-.9L14.7 2.9a.5.5 0 0 0-.5-.4h-3.84a.5.5 0 0 0-.5.4l-.36 2.5c-.56.22-1.08.52-1.57.9l-2.4-.96a.5.5 0 0 0-.6.22L3 8.88a.5.5 0 0 0 .12.64l2.03 1.58a7.6 7.6 0 0 0-.05.9 7.6 7.6 0 0 0 .05.9L3.12 14.5a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.4-.96c.49.38 1.01.68 1.57.9l.36 2.5a.5.5 0 0 0 .5.4h3.84a.5.5 0 0 0 .5-.4l.36-2.5c.56-.22 1.08-.52 1.57-.9l2.4.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.6ZM12 15.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Z" />
      </svg>
    </Link>
  );
}
