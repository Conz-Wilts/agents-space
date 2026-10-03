export const metadata = { title: "Agents Space MCP" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-monospace, monospace", padding: 32 }}>{children}</body>
    </html>
  );
}
