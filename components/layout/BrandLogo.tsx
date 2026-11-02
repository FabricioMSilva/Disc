import Image from "next/image";
import Link from "next/link";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";

type BrandLogoProps = {
  href?: string;
  variant?: "header" | "sidebar" | "login";
  onClick?: () => void;
};

export function BrandLogo({ href, variant = "header", onClick }: BrandLogoProps) {
  const logo = (
    <span className={`brand-logo-surface brand-logo-${variant}`}>
      <Image
        src="/disc-nf-logo.png"
        alt={`${APP_NAME} - ${APP_DESCRIPTION}`}
        width={1132}
        height={365}
        className="brand-logo-image"
        sizes="220px"
      />
    </span>
  );

  return href ? <Link href={href} className="brand-logo-link" onClick={onClick}>{logo}</Link> : logo;
}
