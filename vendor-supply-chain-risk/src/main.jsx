import React, {useState, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import config from '../demo.config.mjs';
import {consumeSSE} from './stream.mjs';
import {markdown} from './export.mjs';
import './style.css';

const Arrow = ({up = false}) => <span aria-hidden="true">{up ? '↗' : '→'}</span>;
const date = value => new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});

function App() {
  const [input,setInput] = useState({...config.examples[0].input,timeRange:config.defaultTimeRange});
  const [apiKey,setApiKey] = useState(''), [hasServerKey,setHasServerKey] = useState(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [events,setEvents] = useState([]);
  const [report,setReport] = useState(null), [sample,setSample] = useState(false), [plan,setPlan] = useState([]);
  const controller = useRef(null), activity = useRef(null);
  useEffect(() => { document.title = `${config.title} | Tavily`; fetch('/api/health').then(r=>r.json()).then(d=>setHasServerKey(d.hasServerKey)).catch(()=>{}); return () => controller.current?.abort(); },[]);
  useEffect(() => { if(activity.current) activity.current.scrollTop = activity.current.scrollHeight; },[events]);
  const update = (key,value) => setInput(prev=>({...prev,[key]:value}));

  async function run(event) {
    event.preventDefault(); setBusy(true); setError(''); setEvents([]); setReport(null); setSample(false); setPlan([]);
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,apiKey}),signal:abort.signal});
      await consumeSSE(response, event => {
        setEvents(prev=>[...prev,event]);
        if(event.type === 'plan') setPlan(event.lanes);
        if(event.type === 'result' || event.type === 'search-error') setReport(prev=>({
          ...(prev || {input:{...input},sections:[],status:'running',questions:[],note:config.reportNote,title:config.title}),
          sections: [...(prev?.sections || []),event.section].sort((a,b)=>config.lanes.findIndex(l=>l.id===a.id)-config.lanes.findIndex(l=>l.id===b.id)),
        }));
        if(event.type === 'complete') setReport(event.report);
      });
    } catch(err) {
      setError(err.name === 'AbortError' ? 'Search stopped. Completed results remain below.' : err.message);
      setReport(prev=>prev ? {...prev,status:'interrupted'} : prev);
    } finally { setBusy(false); controller.current = null; }
  }

  async function openSample() {
    setError('');
    try { const response = await fetch('/sample-report.json'); if(!response.ok) throw new Error(); const data = await response.json(); setReport(data); setInput(data.input); setSample(true); setEvents([]); setPlan([]); }
    catch { setError('The saved example could not be loaded. Try a live search.'); }
  }

  function download() {
    const blob = new Blob([markdown(report,sample)],{type:'text/markdown;charset=utf-8'}), url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href=url; link.download=`${config.id}-brief.md`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const lastStatus = events.at(-1)?.message || 'Connecting to Tavily';
  return <>
    <div className="landscape" aria-hidden="true" />
    <header className="topbar">
      <nav className="site-nav" aria-label="Main navigation">
        <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="brand-link" aria-label="Tavily website">
          <img src="/tavily-by-nebius.svg" alt="Tavily by Nebius" className="brand-logo" width="362" height="109" />
        </a>
        <div className="nav-actions">
          <a href={config.repository} target="_blank" rel="noopener noreferrer" className="nav-link" aria-label="View on GitHub" title="View on GitHub">
            <img src="/github-icon.png" alt="" className="github-logo" width="28" height="28" />
          </a>
        </div>
      </nav>
    </header>
    <main>
      <section className="hero">
        <h1>{config.headline}</h1>
        <p>{config.description}</p>
      </section>
      <section className="panel form-panel" aria-label="Research setup">
        <div className="panel-heading"><div><span className="overline">YOUR RESEARCH</span><h2>{config.formTitle}</h2></div><span className="live-badge"><i/> Live web search</span></div>
        <form onSubmit={run}>
          <fieldset disabled={busy}>
            <div className="fields">
              {config.fields.map(field=><label key={field.id} className={field.wide?'wide':''}>{field.label}{field.options ? <select value={input[field.id]} onChange={e=>update(field.id,e.target.value)}>{field.options.map(option=><option key={option}>{option}</option>)}</select> : <input required maxLength={field.maxLength} value={input[field.id]||''} placeholder={field.placeholder} onChange={e=>update(field.id,e.target.value)}/>}</label>)}
            </div>
            <div className="examples"><span>Try an example</span>{config.examples.map(example=><button type="button" className="chip" key={example.label} onClick={()=>setInput({...example.input,timeRange:config.defaultTimeRange})}>{example.label} <Arrow/></button>)}</div>
            <div className="settings">
              <label>Search window<select value={input.timeRange} onChange={e=>update('timeRange',e.target.value)}><option value="week">Past week</option><option value="month">Past month</option><option value="year">Past year</option><option value="all">Any time</option></select></label>
              <label className="key-field">Tavily API key {hasServerKey && <span className="optional">· optional</span>}<input type="password" autoComplete="off" spellCheck="false" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={hasServerKey?'Server key connected':'tvly-...'} aria-describedby="key-hint"/><small id="key-hint">Kept in this tab for your session. <a href="https://app.tavily.com" target="_blank" rel="noreferrer">Get a key <Arrow up/></a></small></label>
            </div>
            <div className="actions"><button className="primary" type="submit">{busy ? <><span className="spinner"/> {lastStatus}</> : <>{config.action} <Arrow/></>}</button><button className="text-button" type="button" onClick={openSample}>View saved example <Arrow up/></button></div>
          </fieldset>
        </form>
        {busy && <button type="button" className="text-button stop" onClick={()=>controller.current?.abort()}>Stop search</button>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form-foot"><span>3 focused searches</span><span>Linked sources</span><span>One API key</span></div>
      </section>

      {!report && !busy && <section className="workflow" aria-label="What your brief covers">{config.lanes.map((lane,i)=><div className="panel workflow-card" key={lane.id}><span className="step">0{i+1}</span><h3>{lane.title}</h3><p>{lane.note}</p></div>)}</section>}

      {!!events.length && <section className="panel activity-panel" aria-label="Live search activity"><div className="activity-heading"><span className="overline">SEARCH ACTIVITY</span><span role="status" aria-live="polite">{busy ? 'Searching the web' : report?.status === 'complete' ? 'Complete' : 'Review status below'}</span></div><ol ref={activity} className="activity">{events.map((event,i)=><li key={i} className={i===events.length-1?'current':''}><span aria-hidden="true">{event.type==='search-error'?'!':i===events.length-1&&busy?'◉':'›'}</span><div>{event.message}{event.query && <small>{event.query}</small>}</div></li>)}</ol></section>}

      {report && <section className="report" aria-label="Research brief">
        <div className="report-heading"><div><span className="overline">{sample?'SAVED EXAMPLE':'YOUR BRIEF'}</span><h2>{report.input[config.fields[0].id]}</h2><p>{report.completedAt ? `${sample?'Saved':'Retrieved'} ${date(report.completedAt)}`:'Sources appear as searches finish'}</p></div>{report.completedAt && <button className="secondary" type="button" onClick={download}>Export brief <span aria-hidden="true">↓</span></button>}</div>
        {sample && <div className="sample-notice">Saved example from a real Tavily search. Run a live search for current results.</div>}
        {['partial','failed','interrupted'].includes(report.status) && <p className="error" role="alert">{report.status==='failed'?'All searches failed. Check your key or connection and retry.':'This brief is incomplete. Review the search errors before using it.'}</p>}
        <div className="report-meta"><span>{report.sourceCount ?? new Set(report.sections.flatMap(s=>s.sources.map(r=>r.url))).size} unique sources</span><span>{report.sections.filter(s=>s.status==='complete').length} / 3 searches complete</span>{report.credits != null && <span>{report.credits} credits used{report.status==='partial'?' by successful searches':''}</span>}</div>
        {report.sections.map((section,i)=><article className="panel report-section" key={section.id}><div className="section-title"><span className="step">0{config.lanes.findIndex(l=>l.id===section.id)+1}</span><h3>{section.title}</h3></div><p className="section-note">{section.note}</p>{section.error ? <p className="error">{section.error}</p> : <>
          {section.summary && <div className="summary"><span className="overline">TAVILY SEARCH SUMMARY</span><p>{section.summary}</p></div>}
          {!section.sources.length && <p className="empty">No matching sources returned for this query and search window. Try a broader window. An empty result does not establish the absence of an event.</p>}
          <div className="source-excerpts">{section.sources.slice(0,3).map((source,index)=><div className="excerpt" key={source.url}><a href={source.url} target="_blank" rel="noreferrer"><span className="source-number">{index+1}</span>{source.title}<Arrow up/></a><p>{source.content.length>420 ? source.content.slice(0,420)+'…' : source.content || 'Open the source to read the full article.'}</p><small>{source.identityHint && <span className="identity-hint">{source.identityHint}</span>}{new URL(source.url).hostname}{source.publishedDate ? ` · Published/updated ${source.publishedDate}` : ' · Publication date unavailable'}</small></div>)}</div>
        </>}<details className="query-details"><summary>Search query & filters</summary><code>{section.request.query}</code><p>Advanced search · up to 10 results · {section.request.chunks_per_source} chunks per source</p><p>{section.request.include_domains.length ? `Domains: ${section.request.include_domains.join(', ')}` : 'Sources: open web'} · {section.request.time_range ? `Past ${section.request.time_range}` : 'Any time'}</p></details></article>)}
        {busy && plan.filter(l=>!report.sections.some(s=>s.id===l.id)).map(l=><div className="panel pending" key={l.id}><span className="spinner"/> Searching {l.title.toLowerCase()}…</div>)}
        {!!report.questions?.length && <section className="panel questions"><span className="overline">{config.questionTitle}</span><h3>Take the next conversation further.</h3>{report.questions.map(q=><p key={q}><span aria-hidden="true">›</span>{q}</p>)}</section>}
        <p className="report-note">{report.note}</p>
        <section className="all-sources"><h3>Sources</h3><p>Search relevance is a retrieval signal. Review the original page and its date for context.</p><ol>{[...new Map(report.sections.flatMap(s=>s.sources).map(s=>[s.url,s])).values()].map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} <Arrow up/></a><span>{new URL(s.url).hostname}</span></li>)}</ol></section>
        <button type="button" className="text-button back" disabled={busy} onClick={()=>{setReport(null);setEvents([]);setSample(false);setError('');window.scrollTo({top:0,behavior:'instant'});}}>← Back</button>
      </section>}
      <footer><a className="search-api-link" href="https://docs.tavily.com/documentation/api-reference/endpoint/search" target="_blank" rel="noopener noreferrer">Search API docs <Arrow up/></a></footer>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
