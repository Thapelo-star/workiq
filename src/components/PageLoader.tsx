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
    const t1 = setTimeout(() => setWidth(70), 50)
    const t2 = setTimeout(() => { setWidth(100) }, 400)
    const t3 = setTimeout(() => { setLoading(false); setWidth(0) }, 650)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [pathname])

  if (!loading && width === 0) return null

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, height:3, background:'transparent' }}>
      <div style={{
        height:'100%',
        width: width + '%',
        background: 'linear-gradient(90deg, #6366f1, #0ea5e9)',
        borderRadius:'0 2px 2px 0',
        transition: width === 70 ? 'width 0.4s ease' : width === 100 ? 'width 0.2s ease' : 'none',
        boxShadow: '0 0 8px rgba(99,102,241,0.6)',
      }} />
    </div>
  )
}
