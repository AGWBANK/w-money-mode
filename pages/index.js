import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

// ── Simulation engine ────────────────────────────────────────────
const SAL = {
  1:52140,2:52140,3:64020,4:72600,5:81180,6:81180,7:81180,8:81180,
  9:81180,10:81180,11:81180,12:98340,13:103620,14:103620,15:103620,
  16:103620,17:103620,18:103620,19:103620,20:110220,
}
for (let i = 21; i <= 36; i++) SAL[i] = 132660

function keelCost(mo, accs, newA, cardVol) {
  const plat = mo<=3?1755:mo<=6?3510:mo<=9?9360:11700
  const vts = mo>=7?1580:0
  const impl = mo===1?23576:mo===6?23400:mo===7?5850:0
  const acct = accs*(accs<1000?0.702:0.585)
  const sepa = accs*17*0.2925
  const kyc = newA*5
  const cu = accs*0.6*0.7
  const pos = cu*25*0.04797
  const vol = cardVol*0.001
  const ds = cu*8*0.03978
  const vtsa = mo>=7?cu*25*0.00819:0
  const cr = cu*0.01638
  return plat+vts+impl+acct+sepa+kyc+pos+vol+ds+vtsa+cr
}

// Phase-based growth
function getGrowthRate(mo, phase1, phase2, phase3) {
  if (mo <= 9) return phase1/100
  if (mo <= 18) return phase2/100
  return phase3/100
}

function simulate(p) {
  let accs = 0, cash = p.seed + 240000
  const rows = []

  for (let mo = 1; mo <= 36; mo++) {
    const gr = getGrowthRate(mo, p.gr1, p.gr2, p.gr3)
    const prevNew = mo < 5 ? p.m1 : rows[rows.length-1]?.newA || p.m1
    const newA = mo < 4 ? 0 : mo === 4 ? p.m1 : Math.round(prevNew * (1 + gr))
    const churn = Math.round(accs * p.churn/100)
    accs = Math.max(0, accs - churn + newA)

    const ess = Math.round(accs * p.tierEss/100)
    const gro = Math.round(accs * p.tierGro/100)
    const sc  = Math.round(accs * p.tierSc/100)

    const sub = ess*p.priceEss + gro*p.priceGro + sc*p.priceSc
    const cardVol = (ess*p.spendEss + gro*p.spendGro + sc*p.spendSc)*0.7
    const ic = cardVol*0.012
    const fx = accs*0.6*0.1*150*0.0046 + ess*0.3*500*0.0016 + gro*0.5*1500*0.0018 + sc*0.7*5000*0.0024
    const fl = mo>=p.floatStart?(ess*p.depEss+gro*p.depGro+sc*p.depSc)*p.floatRate/100/12:0
    const mmf = mo>=9?(ess*0.2*200000+gro*0.4*500000+sc*0.6*1000000)*0.005/12:0
    const rev = sub+ic+fx+fl+mmf

    const k = keelCost(mo, accs, newA, cardVol)
    const sal = SAL[mo]||132660
    const fixed = p.mkt+p.ops
    const gross = rev-k
    const ebitda = rev-k-sal-fixed
    const net = ebitda-1300
    const capex = mo===1?39000:0
    if (mo===p.saMo) cash+=p.saAmt
    cash = cash+ebitda-capex

    rows.push({
      mo, yr: Math.ceil(mo/12),
      accs, newA, churn,
      ess, gro, sc,
      sub, ic, fx, fl, mmf, rev,
      k, sal, fixed, gross, ebitda, net, cash,
      gm: rev>0?gross/rev:0,
      em: rev>0?ebitda/rev:0,
    })
  }
  return rows
}

function ys(d, yr, k) { return d.filter(m=>m.yr===yr).reduce((a,m)=>a+m[k],0) }
function ye(d, yr, k) { const ms=d.filter(m=>m.yr===yr); return ms[ms.length-1]?.[k]||0 }
function fm(n) {
  if (n===null||n===undefined) return '—'
  const a=Math.abs(n)
  return (n<0?'-':'')+(a>=1e6?'€'+(a/1e6).toFixed(1)+'M':a>=1000?'€'+Math.round(a/1000)+'K':'€'+Math.round(a))
}
function fn(n) { return n>=1000?Math.round(n/1000)+'K':Math.round(n).toLocaleString() }
function pc(n) { return (n*100).toFixed(1)+'%' }

export default function Model() {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [p, setP] = useState({
    // Growth
    m1: 40, gr1: 20, gr2: 12, gr3: 8, churn: 1.8,
    // Tiers
    tierEss: 25, tierGro: 10, tierSc: 5,
    priceEss: 19, priceGro: 49, priceSc: 99,
    // Card spend
    spendEss: 1500, spendGro: 4000, spendSc: 12000,
    // Float
    floatStart: 10, floatRate: 1.8,
    depEss: 80000, depGro: 200000, depSc: 500000,
    // Funding
    seed: 3000000, saMo: 20, saAmt: 8000000,
    // Costs
    mkt: 8000, ops: 19056,
  })

  const sim = simulate(p)

  function upd(key, val) {
    setP(prev => ({ ...prev, [key]: +val }))
  }

  async function logout() {
    await fetch('/api/logout')
    router.push('/login')
  }

  const r1 = ys(sim,1,'rev'), r2 = ys(sim,2,'rev'), r3 = ys(sim,3,'rev')
  const e1 = ys(sim,1,'ebitda'), e2 = ys(sim,2,'ebitda'), e3 = ys(sim,3,'ebitda')
  const a1 = ye(sim,1,'accs'), a2 = ye(sim,2,'accs'), a3 = ye(sim,3,'accs')
  const minCash = Math.min(...sim.map(m=>m.cash))
  const be = sim.find(m=>m.ebitda>0)
  const g1 = ys(sim,1,'gross'), g2 = ys(sim,2,'gross'), g3 = ys(sim,3,'gross')
  const k1 = ys(sim,1,'k'), k2 = ys(sim,2,'k'), k3 = ys(sim,3,'k')
  const f1 = ys(sim,1,'fl')+ys(sim,1,'mmf')
  const f2 = ys(sim,2,'fl')+ys(sim,2,'mmf')
  const f3 = ys(sim,3,'fl')+ys(sim,3,'mmf')
  const fp3 = r3>0?f3/r3:0

  const S = {
    wrap: { minHeight:'100vh', background:'var(--paper)', display:'flex', flexDirection:'column' },
    nav: {
      background:'var(--ink)', padding:'0 1.5rem',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      height: 52, flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 100,
    },
    navLogo: { display:'flex', alignItems:'center', gap:10 },
    navW: {
      width:30, height:30, borderRadius:8, background:'var(--w-mid)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:800, fontSize:15, color:'#fff', fontFamily:'Syne,sans-serif',
    },
    navTitle: { fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#fff', letterSpacing:'-0.01em' },
    navSub: { fontFamily:'DM Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'0.08em', textTransform:'uppercase' },
    navRight: { display:'flex', alignItems:'center', gap:16 },
    navBadge: {
      fontFamily:'DM Mono,monospace', fontSize:9, letterSpacing:'0.08em',
      textTransform:'uppercase', color:'rgba(255,255,255,0.3)',
      border:'1px solid rgba(255,255,255,0.1)', borderRadius:4,
      padding:'3px 8px',
    },
    logoutBtn: {
      fontFamily:'DM Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.4)',
      background:'transparent', border:'none', cursor:'pointer', letterSpacing:'0.04em',
    },
    body: { display:'flex', flex:1, minHeight:0 },
    sidebar: {
      width:240, background:'var(--ink)', flexShrink:0,
      padding:'1.25rem 1rem', overflowY:'auto',
      borderRight:'1px solid rgba(255,255,255,0.06)',
    },
    main: { flex:1, padding:'1.5rem', overflowY:'auto', maxHeight:'calc(100vh - 52px)' },
    secLbl: {
      fontFamily:'DM Mono,monospace', fontSize:9, letterSpacing:'0.10em',
      textTransform:'uppercase', color:'rgba(255,255,255,0.35)',
      marginBottom:8, marginTop:16, paddingTop:12,
      borderTop:'1px solid rgba(255,255,255,0.07)',
    },
    sr: { marginBottom:10 },
    srLbl: {
      display:'flex', justifyContent:'space-between', alignItems:'baseline',
      marginBottom:3,
      fontFamily:'DM Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.5)',
    },
    srVal: { fontWeight:500, color:'rgba(255,255,255,0.9)' },
    range: { width:'100%', accentColor:'var(--w-mid)', cursor:'pointer', height:3 },
    tabs: {
      display:'flex', gap:2, marginBottom:'1.25rem',
      borderBottom:'1px solid var(--border)',
    },
    tab: (active) => ({
      padding:'7px 14px', fontSize:12, fontWeight:active?600:400,
      cursor:'pointer', border:'none', background:'transparent',
      color: active?'var(--w)':'var(--muted)',
      fontFamily:'Syne,sans-serif', letterSpacing:'-0.01em',
      borderBottom: active?'2px solid var(--w)':'2px solid transparent',
      marginBottom:-1,
      transition:'all 0.15s',
    }),
    g4: { display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginBottom:'1rem' },
    g3: { display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:'1rem' },
    g2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' },
    kpi: (good) => ({
      background: good===true?'var(--green-lt)':good===false?'var(--red-lt)':'var(--paper2)',
      borderRadius:'var(--radius-lg)', padding:'0.85rem 1rem',
      border:`1px solid ${good===true?'rgba(26,77,26,0.15)':good===false?'rgba(140,31,31,0.15)':'var(--border)'}`,
    }),
    kpiL: { fontSize:10, fontWeight:500, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4, fontFamily:'DM Mono,monospace' },
    kpiV: (good) => ({ fontSize:22, fontWeight:700, fontFamily:'Syne,sans-serif', letterSpacing:'-0.02em', color:good===true?'var(--green)':good===false?'var(--red)':'var(--ink)' }),
    kpiS: { fontSize:10, color:'var(--muted)', marginTop:3, fontFamily:'DM Mono,monospace' },
    card: { background:'var(--paper)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem 1.1rem', marginBottom:10 },
    cardH: { fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.7rem', fontFamily:'DM Mono,monospace' },
    note: (type) => ({
      borderRadius:8, padding:'0.55rem 0.8rem', fontSize:11, lineHeight:1.6, marginBottom:6,
      borderLeft:`3px solid ${type==='warn'?'var(--amber)':type==='danger'?'var(--red)':type==='good'?'var(--teal)':'var(--w-mid)'}`,
      background: type==='warn'?'var(--amber-lt)':type==='danger'?'var(--red-lt)':type==='good'?'var(--teal-lt)':'var(--w-pale)',
      color: type==='warn'?'var(--amber)':type==='danger'?'var(--red)':type==='good'?'var(--teal)':'var(--w)',
    }),
  }

  const SliderRow = ({ label, id, min, max, step, val, fmt }) => (
    <div style={S.sr}>
      <div style={S.srLbl}>
        <span>{label}</span>
        <span style={S.srVal}>{fmt ? fmt(val) : val}</span>
      </div>
      <input type="range" style={S.range} min={min} max={max} step={step}
        value={val} onChange={e => upd(id, e.target.value)} />
    </div>
  )

  const Table = ({ rows }) => (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
      <thead>
        <tr>
          {rows[0].map((h,i) => (
            <th key={i} style={{
              fontFamily:'DM Mono,monospace', fontSize:9, fontWeight:500,
              color:'var(--muted)', textAlign:i===0?'left':'right',
              padding:'5px 8px', borderBottom:'1px solid var(--border)',
              textTransform:'uppercase', letterSpacing:'0.04em',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.slice(1).map((row, ri) => (
          <tr key={ri} style={{ background:row._bold?'var(--paper2)':'transparent' }}>
            {row.filter((_,i)=>i!=='_bold').map((cell, ci) => (
              <td key={ci} style={{
                padding:'5px 8px',
                textAlign:ci===0?'left':'right',
                borderBottom:'1px solid var(--border)',
                fontWeight:row._bold?600:400,
                fontFamily:ci===0?'Syne,sans-serif':'DM Mono,monospace',
                fontSize:ci===0?12:11,
                color: typeof cell==='string'&&cell.startsWith('-')?'var(--red)':
                       row._bold?'var(--ink)':'var(--muted)',
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <>
      <Head>
        <title>W Money — Financial Model</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={S.wrap}>
        {/* Nav */}
        <nav style={S.nav}>
          <div style={S.navLogo}>
            <div style={S.navW}>W</div>
            <div>
              <div style={S.navTitle}>W Money</div>
              <div style={S.navSub}>Pre-seed financial model</div>
            </div>
          </div>
          <div style={S.navRight}>
            <div style={S.navBadge}>Confidential</div>
            <button style={S.logoutBtn} onClick={logout}>Sign out</button>
          </div>
        </nav>

        <div style={S.body}>
          {/* Sidebar */}
          <aside style={S.sidebar}>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, letterSpacing:'0.10em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:12 }}>
              Assumptions
            </div>

            <div style={S.secLbl}>Growth</div>
            <SliderRow label="M1 accounts (from M4)" id="m1" min={10} max={100} step={5} val={p.m1} />
            <SliderRow label="Growth M4–M9 (%/mo)" id="gr1" min={5} max={30} step={1} val={p.gr1} fmt={v=>`${v}%`} />
            <SliderRow label="Growth M10–M18 (%/mo)" id="gr2" min={3} max={20} step={1} val={p.gr2} fmt={v=>`${v}%`} />
            <SliderRow label="Growth M19–M36 (%/mo)" id="gr3" min={2} max={15} step={1} val={p.gr3} fmt={v=>`${v}%`} />
            <SliderRow label="Monthly churn (%)" id="churn" min={0.5} max={5} step={0.1} val={p.churn} fmt={v=>`${v}%`} />

            <div style={S.secLbl}>Pricing</div>
            <SliderRow label="Essential €/mo" id="priceEss" min={9} max={39} step={1} val={p.priceEss} fmt={v=>`€${v}`} />
            <SliderRow label="Growth €/mo" id="priceGro" min={19} max={79} step={1} val={p.priceGro} fmt={v=>`€${v}`} />
            <SliderRow label="Scale €/mo" id="priceSc" min={49} max={149} step={1} val={p.priceSc} fmt={v=>`€${v}`} />

            <div style={S.secLbl}>Card spend</div>
            <SliderRow label="Essential €/mo" id="spendEss" min={500} max={5000} step={100} val={p.spendEss} fmt={v=>`€${(+v).toLocaleString()}`} />
            <SliderRow label="Growth €/mo" id="spendGro" min={1000} max={10000} step={500} val={p.spendGro} fmt={v=>`€${(+v).toLocaleString()}`} />
            <SliderRow label="Scale €/mo" id="spendSc" min={3000} max={20000} step={1000} val={p.spendSc} fmt={v=>`€${(+v).toLocaleString()}`} />

            <div style={S.secLbl}>Float & deposits</div>
            <SliderRow label="Float starts month #" id="floatStart" min={6} max={18} step={1} val={p.floatStart} fmt={v=>`M${v}`} />
            <SliderRow label="Float net rate (%/yr)" id="floatRate" min={0} max={3.5} step={0.1} val={p.floatRate} fmt={v=>`${v}%`} />
            <SliderRow label="Essential deposit €" id="depEss" min={20000} max={200000} step={10000} val={p.depEss} fmt={v=>fm(+v)} />
            <SliderRow label="Growth deposit €" id="depGro" min={50000} max={500000} step={25000} val={p.depGro} fmt={v=>fm(+v)} />
            <SliderRow label="Scale deposit €" id="depSc" min={100000} max={1500000} step={50000} val={p.depSc} fmt={v=>fm(+v)} />

            <div style={S.secLbl}>Fundraising</div>
            <SliderRow label="Seed €" id="seed" min={1000000} max={6000000} step={250000} val={p.seed} fmt={v=>fm(+v)} />
            <SliderRow label="Series A month #" id="saMo" min={12} max={30} step={1} val={p.saMo} fmt={v=>`M${v}`} />
            <SliderRow label="Series A amount €" id="saAmt" min={3000000} max={15000000} step={500000} val={p.saAmt} fmt={v=>fm(+v)} />

            <div style={S.secLbl}>Fixed costs</div>
            <SliderRow label="Marketing €/mo" id="mkt" min={1000} max={30000} step={500} val={p.mkt} fmt={v=>`€${(+v).toLocaleString()}`} />
            <SliderRow label="Ops & overhead €/mo" id="ops" min={5000} max={40000} step={500} val={p.ops} fmt={v=>`€${(+v).toLocaleString()}`} />
          </aside>

          {/* Main content */}
          <main style={S.main}>
            {/* Tabs */}
            <div style={S.tabs}>
              {['overview','runway','pnl','monthly'].map(t => (
                <button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>
                  {t==='overview'?'Overview':t==='runway'?'Cash runway':t==='pnl'?'P&L table':'Monthly detail'}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {tab==='overview' && (
              <>
                {/* KPIs */}
                <div style={S.g4}>
                  <div style={S.kpi()}>
                    <div style={S.kpiL}>Y3 accounts</div>
                    <div style={S.kpiV()}>{a3.toLocaleString()}</div>
                    <div style={S.kpiS}>Y1: {a1.toLocaleString()} · Y2: {a2.toLocaleString()}</div>
                  </div>
                  <div style={S.kpi()}>
                    <div style={S.kpiL}>Y3 revenue</div>
                    <div style={S.kpiV()}>{fm(r3)}</div>
                    <div style={S.kpiS}>Y1: {fm(r1)} · Y2: {fm(r2)}</div>
                  </div>
                  <div style={S.kpi(e3>0)}>
                    <div style={S.kpiL}>Y3 EBITDA</div>
                    <div style={S.kpiV(e3>0)}>{fm(e3)}</div>
                    <div style={S.kpiS}>{r3?pc(e3/r3):'-'} margin · breakeven {be?`M${be.mo}`:'not in 3yr'}</div>
                  </div>
                  <div style={S.kpi(minCash>700000?true:minCash<300000?false:null)}>
                    <div style={S.kpiL}>Min cash</div>
                    <div style={S.kpiV(minCash>700000?true:minCash<300000?false:null)}>{fm(minCash)}</div>
                    <div style={S.kpiS}>Series A: M{p.saMo} · {fm(p.saAmt)}</div>
                  </div>
                </div>

                {/* Alerts */}
                {minCash<300000 && <div style={S.note('danger')}>⚠ Cash hits {fm(minCash)} — critical. Move Series A earlier or reduce burn.</div>}
                {fp3>0.75 && r3>0 && <div style={S.note('warn')}>Float is {pc(fp3)} of Y3 revenue — high concentration. Keel written agreement required before presenting to investors.</div>}
                {p.floatRate===0 && <div style={S.note('warn')}>Float rate = 0%. Revenue is subscriptions + interchange only.</div>}
                {be && <div style={S.note('good')}>First EBITDA-positive month: M{be.mo}. Cash at that point: {fm(be.cash)}.</div>}

                {/* P&L summary */}
                <div style={S.card}>
                  <div style={S.cardH}>3-year P&L summary</div>
                  <Table rows={[
                    ['Line item','Year 1','Year 2','Year 3'],
                    ['Subscriptions', fm(ys(sim,1,'sub')), fm(ys(sim,2,'sub')), fm(ys(sim,3,'sub'))],
                    ['Interchange', fm(ys(sim,1,'ic')), fm(ys(sim,2,'ic')), fm(ys(sim,3,'ic'))],
                    ['Float + MMF', fm(f1), fm(f2), fm(f3)],
                    ['FX revenue', fm(ys(sim,1,'fx')), fm(ys(sim,2,'fx')), fm(ys(sim,3,'fx'))],
                    Object.assign(['Total revenue', fm(r1), fm(r2), fm(r3)], {_bold:true}),
                    ['Keel BaaS', fm(-k1), fm(-k2), fm(-k3)],
                    Object.assign(['Gross profit', fm(g1), fm(g2), fm(g3)], {_bold:true}),
                    ['Gross margin %', pc(r1?g1/r1:0), pc(r2?g2/r2:0), pc(r3?g3/r3:0)],
                    ['Salaries', fm(-ys(sim,1,'sal')), fm(-ys(sim,2,'sal')), fm(-ys(sim,3,'sal'))],
                    ['Fixed opex', fm(-ys(sim,1,'fixed')), fm(-ys(sim,2,'fixed')), fm(-ys(sim,3,'fixed'))],
                    Object.assign(['EBITDA', fm(e1), fm(e2), fm(e3)], {_bold:true}),
                    ['EBITDA margin %', pc(r1?e1/r1:0), pc(r2?e2/r2:0), pc(r3?e3/r3:0)],
                  ]} />
                </div>

                {/* VC benchmarks */}
                <div style={S.card}>
                  <div style={S.cardH}>VC benchmark check</div>
                  <div style={S.g3}>
                    {[
                      ['Gross margin Y3', pc(r3?g3/r3:0), '68–76%', r3&&g3/r3>=0.68&&g3/r3<=0.82],
                      ['EBITDA margin Y3', pc(r3?e3/r3:0), '25–40%', r3&&e3/r3>=0.20&&e3/r3<=0.50],
                      ['Monthly churn', `${p.churn}%`, '1.5–2.5%', p.churn>=1.0&&p.churn<=2.5],
                      ['Y3 accounts', a3.toLocaleString(), '3,000–8,000', a3>=3000&&a3<=9000],
                      ['Float % of Y3 rev', r3?pc(f3/r3):'—', '<70%', r3&&f3/r3<0.70],
                      ['Min cash', fm(minCash), '>€500K', minCash>500000],
                    ].map(([label, val, bench, ok]) => (
                      <div key={label} style={{
                        background: ok?'var(--green-lt)':ok===false?'var(--red-lt)':'var(--paper2)',
                        border: `1px solid ${ok?'rgba(26,77,26,0.15)':ok===false?'rgba(140,31,31,0.15)':'var(--border)'}`,
                        borderRadius: 8, padding:'0.7rem 0.9rem',
                      }}>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:17, fontWeight:700, fontFamily:'Syne,sans-serif', color:ok?'var(--green)':ok===false?'var(--red)':'var(--ink)' }}>{val}</div>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:'var(--muted)', marginTop:2 }}>Benchmark: {bench}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* RUNWAY */}
            {tab==='runway' && (
              <>
                <div style={S.g4}>
                  {[
                    ['Min cash (pre-A)', fm(Math.min(...sim.filter(m=>m.mo<p.saMo).map(m=>m.cash))), minCash>500000],
                    ['Cash at Series A', fm(sim[p.saMo-1]?.cash||0), null],
                    ['Breakeven month', be?`M${be.mo}`:'> M36', !!be],
                    ['Peak monthly burn', fm(-Math.min(...sim.map(m=>m.ebitda))), null],
                  ].map(([l,v,ok]) => (
                    <div key={l} style={S.kpi(ok)}>
                      <div style={S.kpiL}>{l}</div>
                      <div style={S.kpiV(ok)}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Month bars */}
                <div style={S.card}>
                  <div style={S.cardH}>Monthly cash — red &lt;€300K · amber &lt;€700K · blue = Series A · green = profitable</div>
                  <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:80, marginBottom:6 }}>
                    {sim.map(m => {
                      const maxC = Math.max(...sim.map(x=>Math.abs(x.cash)))
                      const h = Math.max(4, Math.round(Math.abs(m.cash)/maxC*76))
                      const col = m.mo===p.saMo?'#3D35A8':m.cash<300000?'#8C1F1F':m.cash<700000?'#C17A20':m.ebitda>0?'#1A4D1A':'#6B6860'
                      return (
                        <div key={m.mo} title={`M${m.mo}: ${fm(m.cash)} | EBITDA ${fm(m.ebitda)}`}
                          style={{ flex:1, height:h, background:col, borderRadius:2, cursor:'help', minWidth:4 }} />
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'DM Mono,monospace', fontSize:9, color:'var(--muted)' }}>
                    <span>M1</span><span>M12</span><span>M24</span><span>M36</span>
                  </div>
                </div>

                {/* Cash table */}
                <div style={S.card}>
                  <div style={S.cardH}>Quarterly cash position</div>
                  <Table rows={[
                    ['Quarter','Accounts','Revenue','EBITDA','Cash balance'],
                    ...[3,6,9,12,15,18,21,24,27,30,33,36].map(mo => {
                      const m = sim[mo-1]
                      if (!m) return []
                      return [`Q${Math.ceil(mo/3)} / M${mo}`, m.accs.toLocaleString(), fm(m.rev), fm(m.ebitda), fm(m.cash)]
                    }).filter(r=>r.length>0)
                  ]} />
                </div>
              </>
            )}

            {/* P&L TABLE */}
            {tab==='pnl' && (
              <div style={S.card}>
                <div style={S.cardH}>Full 36-month P&L</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ minWidth:900, width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead>
                      <tr>
                        {['Line item','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12',
                          'M13','M14','M15','M16','M17','M18','M19','M20','M21','M22','M23','M24',
                          'M25','M26','M27','M28','M29','M30','M31','M32','M33','M34','M35','M36'].map((h,i) => (
                          <th key={i} style={{
                            fontFamily:'DM Mono,monospace', fontSize:8, fontWeight:500,
                            color:'var(--muted)', textAlign:i===0?'left':'right',
                            padding:'4px 5px', borderBottom:'1px solid var(--border)',
                            background:'var(--paper2)', position:i===0?'sticky':'static', left:0,
                            minWidth:i===0?120:56, whiteSpace:'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {label:'Accounts', key:'accs', fmt:v=>v.toLocaleString(), bold:true},
                        {label:'Revenue', key:'rev', fmt:fm, bold:true},
                        {label:'  Subscriptions', key:'sub', fmt:fm},
                        {label:'  Interchange', key:'ic', fmt:fm},
                        {label:'  Float+MMF', key:'fl', fmt:fm},
                        {label:'  FX', key:'fx', fmt:fm},
                        {label:'Keel BaaS', key:'k', fmt:v=>fm(-v)},
                        {label:'Gross profit', key:'gross', fmt:fm, bold:true},
                        {label:'Gross margin %', key:'gm', fmt:pc, bold:false},
                        {label:'Salaries', key:'sal', fmt:v=>fm(-v)},
                        {label:'Fixed opex', key:'fixed', fmt:v=>fm(-v)},
                        {label:'EBITDA', key:'ebitda', fmt:fm, bold:true, color:true},
                        {label:'EBITDA margin %', key:'em', fmt:pc},
                        {label:'Cash balance', key:'cash', fmt:fm, bold:true},
                      ].map(({label,key,fmt,bold,color}) => (
                        <tr key={label}>
                          <td style={{
                            fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:bold?600:400,
                            padding:'4px 5px', borderBottom:'1px solid var(--border)',
                            background:'var(--paper)', position:'sticky', left:0,
                            color:'var(--ink)', whiteSpace:'nowrap',
                          }}>{label}</td>
                          {sim.map(m => {
                            const v = key==='fl'?m.fl+m.mmf:m[key]
                            const isNeg = typeof v==='number'&&v<0
                            return (
                              <td key={m.mo} style={{
                                fontFamily:'DM Mono,monospace', fontSize:9,
                                textAlign:'right', padding:'4px 5px',
                                borderBottom:'1px solid var(--border)',
                                fontWeight:bold?600:400,
                                background:color&&v>0?'rgba(26,77,26,0.05)':color&&v<0?'rgba(140,31,31,0.05)':'transparent',
                                color: isNeg?'var(--red)':color&&v>0?'var(--green)':'var(--ink)',
                              }}>{fmt(v)}</td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MONTHLY DETAIL */}
            {tab==='monthly' && (
              <div style={S.card}>
                <div style={S.cardH}>Monthly detail — colour = cash health</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr>{['Month','Accounts','Revenue','Keel','Gross profit','GM%','EBITDA','Cash','Runway (mo)'].map((h,i)=>(
                      <th key={i} style={{
                        fontFamily:'DM Mono,monospace', fontSize:9, fontWeight:500, color:'var(--muted)',
                        textAlign:i===0?'left':'right', padding:'5px 8px',
                        borderBottom:'1px solid var(--border)', textTransform:'uppercase', letterSpacing:'0.04em',
                      }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {sim.map(m => {
                      const rowBg = m.cash<300000?'var(--red-lt)':m.cash<700000?'var(--amber-lt)':m.ebitda>0?'var(--green-lt)':'transparent'
                      const runway = m.ebitda<0&&m.cash>0?Math.round(m.cash/Math.abs(m.ebitda)):'∞'
                      return (
                        <tr key={m.mo} style={{ background:rowBg }}>
                          <td style={{ fontFamily:'Syne,sans-serif', fontWeight:600, padding:'5px 8px', borderBottom:'1px solid var(--border)' }}>M{m.mo}</td>
                          {[
                            m.accs.toLocaleString(),
                            fm(m.rev), fm(m.k), fm(m.gross),
                            pc(m.gm), fm(m.ebitda), fm(m.cash),
                            typeof runway==='number'?`${runway} mo`:runway,
                          ].map((v,i)=>(
                            <td key={i} style={{
                              fontFamily:'DM Mono,monospace', fontSize:10, textAlign:'right',
                              padding:'5px 8px', borderBottom:'1px solid var(--border)',
                              color: typeof v==='string'&&(v.startsWith('-')||v.startsWith('€-'))?'var(--red)':'var(--ink)',
                            }}>{v}</td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
