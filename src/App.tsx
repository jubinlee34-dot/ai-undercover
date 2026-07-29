import { FormEvent, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'

const teams = [
  { id: 1, name: '보라 부엉이', status: '제출 완료', score: 84, color: '#9b6cff' },
  { id: 2, name: '은빛 여우', status: '작성 중', score: 72, color: '#5bd6ff' },
  { id: 3, name: '검은 고양이', status: '제출 완료', score: 91, color: '#ff6cb7' },
  { id: 4, name: '밤의 수달', status: '대기 중', score: 68, color: '#ffb86c' },
  { id: 5, name: '푸른 까마귀', status: '작성 중', score: 77, color: '#6ce7bd' },
  { id: 6, name: '달빛 토끼', status: '제출 완료', score: 88, color: '#c9a7ff' },
]

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? 'brand--compact' : ''}`} to="/">
      <span className="brand-mark" aria-hidden="true">A</span>
      <span><b>AI</b> 언더커버</span>
    </Link>
  )
}

function RoundPill({ round = 1 }: { round?: number }) {
  return <span className="round-pill"><i /> {round}회차 진행 중</span>
}

function JoinPage() {
  const [code, setCode] = useState('')
  const [joined, setJoined] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (code.trim().length >= 4) setJoined(true)
  }

  return (
    <main className="join-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="join-header"><Brand /><span className="demo-badge">CLASSROOM BETA</span></header>
      <section className="join-card">
        <div className="eyebrow"><span>●</span> 오늘의 비밀 임무</div>
        <h1>우리 모둠의<br /><em>언더커버</em>를 찾아라</h1>
        <p className="lead">선생님이 알려준 참여 코드를 입력하고<br className="mobile-only" /> 추리 게임에 합류하세요.</p>
        {joined ? (
          <div className="success-panel">
            <span className="success-icon">✓</span>
            <div><b>입장 준비 완료!</b><p>코드 {code.toUpperCase()} · 곧 게임이 시작됩니다.</p></div>
          </div>
        ) : (
          <form className="code-form" onSubmit={submit}>
            <label htmlFor="join-code">참여 코드</label>
            <div className="input-shell">
              <input id="join-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="예: A1B2C3" autoComplete="off" />
              <button type="submit" disabled={code.trim().length < 4}>참여하기 <span>→</span></button>
            </div>
            <small>영문과 숫자로 이루어진 6자리 코드예요.</small>
          </form>
        )}
        <div className="join-steps">
          <span><b>01</b> 코드 입력</span><i /><span><b>02</b> 모둠 확인</span><i /><span><b>03</b> 추리 시작</span>
        </div>
      </section>
      <footer className="join-footer">교실의 모든 생각이 단서가 됩니다.</footer>
    </main>
  )
}

function AdminPage() {
  const [round, setRound] = useState(1)
  const [running, setRunning] = useState(true)
  const [selected, setSelected] = useState(2)
  return (
    <main className="admin-page app-page">
      <header className="app-header">
        <Brand compact />
        <div className="header-actions"><RoundPill round={round} /><span className="teacher-badge">강사 패드</span></div>
      </header>
      <section className="admin-content">
        <div className="section-heading">
          <div><span className="kicker">LIVE CONTROL</span><h1>수업 운영 센터</h1><p>모둠의 진행 상황을 한눈에 확인하고 회차를 운영하세요.</p></div>
          <div className="round-switch" role="group" aria-label="회차 선택">
            <button className={round === 1 ? 'active' : ''} onClick={() => setRound(1)}>1회차</button>
            <button className={round === 2 ? 'active' : ''} onClick={() => setRound(2)}>2회차</button>
          </div>
        </div>
        <div className="stats-grid">
          <article><span>참여 모둠</span><strong>6<small> / 7</small></strong><div className="mini-bars">{[1,1,1,1,1,1,0].map((v,i)=><i key={i} className={v ? 'on' : ''}/>)}</div></article>
          <article><span>제출 완료</span><strong>3<small> 모둠</small></strong><div className="progress"><i style={{width:'50%'}} /></div></article>
          <article><span>남은 시간</span><strong className="timer">08:42</strong><button className="ghost-button" onClick={() => setRunning(!running)}>{running ? '일시정지' : '다시 시작'}</button></article>
        </div>
        <div className="admin-grid">
          <section className="panel teams-panel">
            <div className="panel-title"><div><h2>모둠 현황</h2><span>카드를 눌러 상세 내용을 확인하세요</span></div><button className="icon-button">↻</button></div>
            <div className="team-list">
              {teams.map(team => (
                <button key={team.id} className={`team-row ${selected === team.id ? 'selected' : ''}`} onClick={() => setSelected(team.id)}>
                  <span className="team-number" style={{'--team-color':team.color} as React.CSSProperties}>{team.id}</span>
                  <span className="team-name"><b>{team.name}</b><small>대표 김하늘 · 4명 참여</small></span>
                  <span className={`status status-${team.status.replace(' ', '')}`}>{team.status}</span>
                  <span className="chevron">›</span>
                </button>
              ))}
            </div>
          </section>
          <aside className="panel detail-panel">
            <div className="detail-top"><span className="team-number large" style={{'--team-color':teams[selected-1].color} as React.CSSProperties}>{selected}</span><div><small>선택한 모둠</small><h2>{teams[selected-1].name}</h2></div></div>
            <div className="detail-block"><label>현재 추리</label><p>“AI의 답변이 너무 완벽해서 오히려 의심스러워요.”</p></div>
            <div className="score-row"><span>설득력 점수</span><b>{teams[selected-1].score}<small>/100</small></b></div>
            <div className="detail-actions"><button className="primary-button">답변 크게 보기</button><button className="secondary-button">모둠 호출</button></div>
          </aside>
        </div>
        <div className="control-bar"><div><span className="pulse-dot"/><p><b>{round}회차가 진행 중입니다</b><small>학생 화면과 공유 화면이 연결되어 있어요.</small></p></div><button onClick={() => setRound(round === 1 ? 2 : 1)}>{round === 1 ? '1회차 종료 및 다음 회차' : '활동 종료'} <span>→</span></button></div>
      </section>
    </main>
  )
}

function DisplayPage() {
  const [reveal, setReveal] = useState(false)
  return (
    <main className="display-page">
      <header><Brand compact /><RoundPill /><span className="room-code">참여 코드 <b>A1B2C3</b></span></header>
      <section className="display-hero">
        <span className="display-kicker">ROUND 01 · 실시간 추리 현황</span>
        <h1>가장 <em>의심스러운 답변</em>은<br />어느 모둠일까요?</h1>
        <p>모둠별 의견을 비교하고 숨은 단서를 찾아보세요.</p>
      </section>
      <section className="score-board">
        {teams.map((team, index) => (
          <article key={team.id} className={index === 2 ? 'leader' : ''}>
            <div className="rank">{index === 2 ? '★' : String(index + 1).padStart(2,'0')}</div>
            <span className="team-number display-number" style={{'--team-color':team.color} as React.CSSProperties}>{team.id}</span>
            <div className="display-team"><small>{team.name}</small><strong>{reveal ? team.score : '—'}<i>{reveal ? '표' : ''}</i></strong></div>
            <div className="vote-bar"><i style={{height: reveal ? `${team.score}%` : '8%'}} /></div>
          </article>
        ))}
      </section>
      <div className="display-bottom"><div><span className="live-dot"/><p><b>{reveal ? '투표 결과를 공개했습니다' : '모둠 투표를 기다리고 있습니다'}</b><small>{reveal ? '결과를 함께 살펴보세요.' : '3개 모둠이 제출을 완료했어요.'}</small></p></div><button onClick={() => setReveal(!reveal)}>{reveal ? '결과 숨기기' : '결과 공개하기'}</button></div>
    </main>
  )
}

function TeamPage() {
  const [round, setRound] = useState(1)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return (
    <main className="team-page">
      <header><Brand compact /><span className="team-chip"><i /> 2모둠 · 은빛 여우</span></header>
      <section className="team-content">
        <div className="team-progress"><span className="done">입장</span><i className="done"/><span className="current">추리</span><i/><span>제출</span></div>
        <div className="mission-card">
          <div className="mission-top"><span>SECRET MISSION</span><b>{round}회차</b></div>
          <div className="mission-icon">?</div>
          <h1>이 답변은<br /><em>사람</em>이 썼을까요, <em>AI</em>가 썼을까요?</h1>
          <p>답변 속 표현과 논리를 살펴보고 모둠의 근거를 정리해 주세요.</p>
          <div className="prompt-box"><label>분석할 답변</label><blockquote>“기술은 우리의 선택을 대신하는 것이 아니라, 더 나은 선택을 할 수 있도록 가능성을 넓혀주는 도구입니다.”</blockquote></div>
        </div>
        <form className="answer-card" onSubmit={(e)=>{e.preventDefault(); if(answer.trim()) setSubmitted(true)}}>
          <div className="answer-heading"><div><span>모둠 대표만 작성해 주세요</span><h2>우리 모둠의 추리 근거</h2></div><span className="author">대표 김하늘</span></div>
          <textarea value={answer} onChange={(e)=>setAnswer(e.target.value)} maxLength={300} placeholder="어떤 표현이 의심스러웠나요? 모둠에서 나눈 이야기를 구체적으로 적어보세요." />
          <div className="textarea-meta"><span>{answer.length} / 300</span><small>최소 한 문장 이상 작성해 주세요.</small></div>
          <div className="choice-label">최종 선택</div>
          <div className="choice-row">
            <label><input type="radio" name="choice" defaultChecked/><span className="choice-icon">☺</span><b>사람의 답변</b></label>
            <label><input type="radio" name="choice"/><span className="choice-icon ai">✦</span><b>AI의 답변</b></label>
          </div>
          <button className="submit-answer" disabled={!answer.trim() || submitted}>{submitted ? '제출 완료 ✓' : `${round}회차 답변 제출하기`}<span>{submitted ? '' : '→'}</span></button>
          {submitted && round === 1 && <button type="button" className="next-round" onClick={()=>{setRound(2);setAnswer('');setSubmitted(false)}}>2회차로 이동</button>}
        </form>
      </section>
    </main>
  )
}

function NotFound() {
  return <main className="not-found"><Brand/><h1>길을 잃은 단서예요.</h1><p>요청한 화면을 찾을 수 없습니다.</p><Link to="/">참여 화면으로 돌아가기</Link></main>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
