import SiteNav from '@/app/_components/SiteNav'
import SiteFooter from '@/app/_components/SiteFooter'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 68 }}>{children}</main>
      <SiteFooter />
    </>
  )
}
