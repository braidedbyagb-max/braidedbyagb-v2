// Auth is enforced by src/proxy.ts — no double-check needed here
export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
