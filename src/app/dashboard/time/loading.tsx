export default function Loading() {
  return (
    <div style={{ padding:'28px 0' }}>
      <div style={{ height:32, width:200, background:'#e8eaf2', borderRadius:8, marginBottom:8, animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height:16, width:300, background:'#f0f2f8', borderRadius:6, marginBottom:32, animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, height:400, animation:'pulse 1.5s ease-in-out infinite' }} />
      <style>{@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }}</style>
    </div>
  )
}
