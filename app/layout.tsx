import type { Metadata } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | ${APP_DESCRIPTION}`,
  description: `Plataforma ${APP_NAME} para avaliação comportamental.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}