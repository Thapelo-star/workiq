'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setLoading(true)
    setWidth(0)
    const t1 = setTimeout(() => setWidth(75), 50)
    const t2 = setTimeout(() => setWidth(100), 500)
    const t3 = setTimeout(() => { setLoading(false); setWidth(0) }, 750)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [pathname])

  if (!loading && width === 0) return null

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, height:4, background:'rgba(0,0,0,0.08)' }}>
      <div style={{ height:'100%', width: width + '%', background:'linear-gradient(90deg, #b4b93c, #6366f1, #0ea5e9)', borderRadius:'0 3px 3px 0', transition: width === 75 ? 'width 0.5s ease' : width === 100 ? 'width 0.2s ease' : 'none', boxShadow:'0 0 12px rgba(99,102,241,0.8)' }} />
    </div>
  )
}