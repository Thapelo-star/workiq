export default function Loading() {
  return (
    <div style={{ padding:'28px 0' }}>
      <div style={{ height:32, width:220, background:'#e8eaf2', borderRadius:8, marginBottom:8, animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height:16, width:340, background:'#f0f2f8', borderRadius:6, marginBottom:32, animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:16, marginBottom:24 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'20px 22px', height:90, animation:'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {[1,2].map(i => (
          <div key={i} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:22, height:280, animation:'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <style>{@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }}</style>
    </div>
  )
}
