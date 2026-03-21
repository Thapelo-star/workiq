export default function Loading() {
  return (
    <div style={{ padding:'28px 0' }}>
      <div style={{ height:32, width:220, background:'#e8eaf2', borderRadius:8, marginBottom:8 }} />
      <div style={{ height:16, width:340, background:'#f0f2f8', borderRadius:6, marginBottom:32 }} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:16, marginBottom:24 }}>
        {[1,2,3,4,5].map(function(i){ return (
          <div key={i} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, height:90 }} />
        )})}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, height:280 }} />
        <div style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, height:280 }} />
      </div>
    </div>
  )
}