import { FormEvent, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'

type ReviewStatus = '승인' | '수정 요청' | '미제출'
type TeamStage = 'create' | 'review' | 'solve'

const teams: Array<{
  id: number
  name: string
  author: string
  status: ReviewStatus
  submitted: boolean
  color: string
}> = [
  { id: 1, name: '보라 부엉이', author: '김하늘', status: '승인', submitted: true, color: '#9b6cff' },
  { id: 2, name: '은빛 여우', author: '박서준', status: '수정 요청', submitted: true, color: '#5bd6ff' },
  { id: 3, name: '검은 고양이', author: '이수아', status: '승인', submitted: true, color: '#ff6cb7' },
  { id: 4, name: '밤의 수달', author: '최유진', status: '미제출', submitted: false, color: '#ffb86c' },
  { id: 5, name: '푸른 까마귀', author: '정민호', status: '승인', submitted: true, color: '#6ce7bd' },
  { id: 6, name: '달빛 토끼', author: '한지우', status: '승인', submitted: true, color: '#c9a7ff' },
]

const sampleCards = [
  { key: 'A', title: '빛보다 빠른 신호', body: '양자 얽힘을 이용하면 정보를 빛보다 빠르게 보낼 수 있다.' },
  { key: 'B', title: '관측과 양자 상태', body: '양자 상태를 측정하면 여러 가능성 중 하나의 결과가 관측된다.' },
  { key: 'C', title: '중첩 상태', body: '양자 컴퓨터의 큐비트는 0과 1의 중첩 상태를 표현할 수 있다.' },
]

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? 'brand--compact' : ''}`} to="/">
      <span className="brand-mark" aria-hidden="true">A</span>
      <span><b>AI</b> 언더커버</span>
    </Link>
  )
}

function StagePill({ label }: { label: string }) {
  return <span className="stage-pill"><i /> {label}</span>
}

function JoinPage() {
  const [code, setCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [author, setAuthor] = useState('')
  const [joined, setJoined] = useState(false)
  const canJoin = code.trim().length >= 4 && teamName.trim() !== '' && author.trim() !== ''

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (canJoin) setJoined(true)
  }

  return (
    <main className="join-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="join-header">
        <Brand />
        <span className="demo-badge">CLASSROOM BETA</span>
      </header>

      <section className="join-card">
        <div className="eyebrow"><span>●</span> 세 개의 답변, 하나의 함정</div>
        <h1>사실 사이에 숨은<br /><em>AI 환각</em>을 찾아라</h1>
        <p className="lead">모둠에서 함께 토론하고 대표 작성자 한 명이 입력합니다.</p>

        {joined ? (
          <div className="success-panel">
            <span className="success-icon">✓</span>
            <div>
              <b>{teamName} 입장 완료!</b>
              <p>대표 {author} · 참여 코드 {code.toUpperCase()}</p>
            </div>
          </div>
        ) : (
          <form className="join-form" onSubmit={submit}>
            <label>
              <span>참여 코드</span>
              <input
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="예: A1B2C3"
                autoComplete="off"
              />
            </label>
            <label>
              <span>모둠 이름</span>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="예: 은빛 여우"
              />
            </label>
            <label>
              <span>대표 작성자 이름</span>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="이름을 입력하세요"
              />
            </label>
            <button type="submit" disabled={!canJoin}>입장하기 <span>→</span></button>
          </form>
        )}

        <div className="join-steps">
          <span><b>01</b> 모둠 입장</span><i />
          <span><b>02</b> 문제 제작</span><i />
          <span><b>03</b> 환각 추리</span>
        </div>
      </section>
      <footer className="join-footer">사실을 확인하는 습관이 최고의 탐정 도구입니다.</footer>
    </main>
  )
}

function AdminPage() {
  const [phase, setPhase] = useState('문제 검수')
  const [selected, setSelected] = useState(2)
  const selectedTeam = teams[selected - 1]
  const submittedCount = teams.filter((team) => team.submitted).length
  const approvedCount = teams.filter((team) => team.status === '승인').length

  const advance = () => {
    const phases = ['문제 검수', '1회차 진행', '정답 공개', '2회차 진행', '최종 결과']
    setPhase(phases[(phases.indexOf(phase) + 1) % phases.length])
  }

  return (
    <main className="admin-page app-page">
      <header className="app-header">
        <Brand compact />
        <div className="header-actions">
          <StagePill label={phase} />
          <span className="teacher-badge">강사 패드</span>
        </div>
      </header>

      <section className="admin-content">
        <div className="section-heading">
          <div>
            <span className="kicker">LIVE CONTROL</span>
            <h1>수업 운영 센터</h1>
            <p>문제 검수부터 회차 배정과 결과 공개까지 한곳에서 운영하세요.</p>
          </div>
          <button className="outline-button">공유 화면 열기 ↗</button>
        </div>

        <div className="stats-grid">
          <article>
            <span>참여 모둠</span>
            <strong>6<small> / 7</small></strong>
            <div className="mini-bars">{[1, 1, 1, 1, 1, 1, 0].map((value, index) => <i key={index} className={value ? 'on' : ''} />)}</div>
          </article>
          <article>
            <span>문제 제출 현황</span>
            <strong>{submittedCount}<small> / 6</small></strong>
            <div className="progress"><i style={{ width: `${submittedCount / 6 * 100}%` }} /></div>
          </article>
          <article>
            <span>문제 검수 현황</span>
            <strong>{approvedCount}<small> 승인</small></strong>
            <div className="review-summary"><b>수정 1</b><b>미제출 1</b></div>
          </article>
        </div>

        <div className="admin-grid">
          <section className="panel teams-panel">
            <div className="panel-title">
              <div><h2>모둠별 문제 현황</h2><span>모둠을 선택해 제출 문제를 검수하세요.</span></div>
              <span className="count-badge">모둠당 1문제</span>
            </div>
            <div className="team-list">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className={`team-row ${selected === team.id ? 'selected' : ''}`}
                  onClick={() => setSelected(team.id)}
                >
                  <span className="team-number" style={{ '--team-color': team.color } as React.CSSProperties}>{team.id}</span>
                  <span className="team-name"><b>{team.name}</b><small>대표 {team.author}</small></span>
                  <span className={`status status-${team.status.replace(' ', '')}`}>{team.status}</span>
                  <span className="chevron">›</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="panel review-panel">
            <div className="detail-top">
              <span className="team-number large" style={{ '--team-color': selectedTeam.color } as React.CSSProperties}>{selected}</span>
              <div><small>선택한 문제</small><h2>{selectedTeam.name}</h2></div>
            </div>
            <div className="review-preview">
              <label>문제 제목</label>
              <p>양자 기술, 진실은 무엇일까?</p>
              <div className="abc-mini"><span>A</span><span>B</span><span>C</span></div>
            </div>
            <div className="review-note">
              <span>현재 상태</span>
              <b className={`status-text status-text-${selectedTeam.status.replace(' ', '')}`}>{selectedTeam.status}</b>
            </div>
            <div className="detail-actions">
              <button className="primary-button">문제 검수</button>
              <button className="secondary-button">수정 요청 보내기</button>
            </div>
          </aside>
        </div>

        <section className="operation-panel">
          <div className="operation-heading">
            <div><span className="pulse-dot" /><p><b>현재 단계 · {phase}</b><small>학생 화면과 공유 화면에 실시간으로 반영됩니다.</small></p></div>
            <button className="primary-button" onClick={advance}>다음 운영 단계 →</button>
          </div>
          <div className="operation-flow">
            {['1회차 자동 배정', '1회차 시작', '1회차 마감', '정답 공개', '2회차 재배정', '최종 결과 공개'].map((label, index) => (
              <button key={label} className={index < 2 ? 'complete' : index === 2 ? 'active' : ''}>
                <span>{index < 2 ? '✓' : index + 1}</span>{label}
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

function DisplayPage() {
  const [view, setView] = useState<'progress' | 'answer' | 'result'>('progress')
  const progress = Math.round(teams.filter((team) => team.submitted).length / teams.length * 100)

  return (
    <main className="display-page">
      <header>
        <Brand compact />
        <StagePill label={view === 'progress' ? '1회차 풀이 중' : view === 'answer' ? '정답 공개' : '최종 결과'} />
        <span className="room-code">참여 코드 <b>A1B2C3</b></span>
      </header>

      <section className="display-hero">
        <span className="display-kicker">AI UNDERCOVER · ROUND 01</span>
        <h1>세 개의 답변,<br /><em>하나의 함정</em></h1>
        <p>{view === 'progress' ? '사실 사이에 숨은 AI 환각을 찾아보세요.' : view === 'answer' ? '환각 카드는 A였습니다.' : '두 번의 추리가 모두 끝났습니다.'}</p>
      </section>

      {view === 'progress' && (
        <section className="display-dashboard">
          <div className="display-timer">
            <span>남은 시간</span>
            <strong>08:42</strong>
            <small>1회차 답안 제출 중</small>
          </div>
          <div className="display-progress">
            <div className="progress-copy"><span>전체 제출 진행률</span><strong>{progress}%</strong></div>
            <div className="progress large-progress"><i style={{ width: `${progress}%` }} /></div>
            <div className="display-team-grid">
              {teams.map((team) => (
                <article key={team.id} className={team.submitted ? 'submitted' : ''}>
                  <span className="team-number" style={{ '--team-color': team.color } as React.CSSProperties}>{team.id}</span>
                  <div><b>{team.name}</b><small>{team.submitted ? '제출 완료' : '풀이 중'}</small></div>
                  <i>{team.submitted ? '✓' : '…'}</i>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {view === 'answer' && (
        <section className="reveal-stage">
          <span className="reveal-label">AI 환각 카드</span>
          <strong>A</strong>
          <div>
            <h2>빛보다 빠른 신호</h2>
            <p>양자 얽힘만으로 정보를 빛보다 빠르게 전달할 수 있다는 설명은 사실이 아닙니다.</p>
          </div>
        </section>
      )}

      {view === 'result' && (
        <section className="result-stage">
          <div><span>가장 정확한 검증</span><strong>검은 고양이</strong><small>2회 모두 정답 · 출처 검증 완료</small></div>
          <div><span>가장 날카로운 근거</span><strong>달빛 토끼</strong><small>핵심 오류를 구체적으로 설명</small></div>
          <div><span>함께 만든 기록</span><strong>12번의 추리</strong><small>6개 모둠 · 2개 회차</small></div>
        </section>
      )}

      <div className="display-bottom">
        <div><span className="live-dot" /><p><b>강사 공지</b><small>선택보다 근거와 출처가 더 중요합니다. 끝까지 확인해 주세요!</small></p></div>
        <div className="view-switch">
          <button className={view === 'progress' ? 'active' : ''} onClick={() => setView('progress')}>진행</button>
          <button className={view === 'answer' ? 'active' : ''} onClick={() => setView('answer')}>정답</button>
          <button className={view === 'result' ? 'active' : ''} onClick={() => setView('result')}>결과</button>
        </div>
      </div>
    </main>
  )
}

function StepTabs({ stage, setStage }: { stage: TeamStage, setStage: (stage: TeamStage) => void }) {
  const items: Array<{ id: TeamStage, label: string }> = [
    { id: 'create', label: 'A · 문제 제작' },
    { id: 'review', label: 'B · 제출·검수' },
    { id: 'solve', label: 'C · 문제 풀이' },
  ]
  return (
    <nav className="team-stage-tabs" aria-label="모둠 진행 단계">
      {items.map((item) => (
        <button key={item.id} className={stage === item.id ? 'active' : ''} onClick={() => setStage(item.id)}>{item.label}</button>
      ))}
    </nav>
  )
}

function CreateProblem({ onSubmit }: { onSubmit: () => void }) {
  const [answer, setAnswer] = useState('A')
  const [saved, setSaved] = useState(false)

  return (
    <section className="workspace-card">
      <div className="workspace-heading">
        <div><span>STEP A · CREATE</span><h1>우리 모둠의 문제 제작</h1><p>검증한 사실 2개 사이에 그럴듯한 AI 환각 1개를 숨겨보세요.</p></div>
        <span className="author">대표 박서준</span>
      </div>
      <label className="field">
        <span>문제 제목</span>
        <input defaultValue="양자 기술, 진실은 무엇일까?" />
      </label>
      <div className="card-editor-grid">
        {sampleCards.map((card) => (
          <label className={`card-editor ${answer === card.key ? 'hallucination' : ''}`} key={card.key}>
            <span className="card-letter">{card.key}</span>
            <input aria-label={`카드 ${card.key} 제목`} defaultValue={card.title} />
            <textarea aria-label={`카드 ${card.key} 내용`} defaultValue={card.body} />
          </label>
        ))}
      </div>
      <fieldset className="answer-select">
        <legend>환각 정답 선택</legend>
        <div>
          {['A', 'B', 'C'].map((letter) => (
            <label key={letter}><input type="radio" name="hallucination" checked={answer === letter} onChange={() => setAnswer(letter)} /><span>{letter}</span></label>
          ))}
        </div>
      </fieldset>
      <div className="source-grid">
        <label className="field"><span>사실 출처</span><textarea defaultValue="한국과학기술정보연구원 양자정보연구 자료, 2025" /></label>
        <label className="field"><span>환각으로 만든 부분 설명</span><textarea defaultValue="양자 얽힘과 정보 전달을 혼동해 빛보다 빠른 통신이 가능하다고 구성했습니다." /></label>
      </div>
      <div className="form-actions">
        <button className="secondary-button" onClick={() => setSaved(true)}>{saved ? '임시 저장됨 ✓' : '임시 저장'}</button>
        <button className="primary-button" onClick={onSubmit}>최종 제출</button>
      </div>
    </section>
  )
}

function ReviewWaiting({ onEdit }: { onEdit: () => void }) {
  const [status, setStatus] = useState<'reviewing' | 'revision'>('reviewing')
  return (
    <section className="workspace-card waiting-card">
      <div className={`waiting-icon ${status === 'revision' ? 'revision' : ''}`}>{status === 'reviewing' ? '✓' : '!'}</div>
      <span className="kicker">STEP B · REVIEW</span>
      <h1>{status === 'reviewing' ? '문제 제출 완료' : '수정 요청이 도착했어요'}</h1>
      <p>{status === 'reviewing' ? '강사가 사실 출처와 환각 설명을 검수하고 있습니다.' : '카드 A의 출처를 더 구체적으로 작성해 주세요.'}</p>
      <div className="review-timeline">
        <div className="done"><i>✓</i><span><b>제출 완료</b><small>오전 10:24</small></span></div>
        <em />
        <div className={status === 'reviewing' ? 'active' : 'done'}><i>{status === 'reviewing' ? '2' : '✓'}</i><span><b>강사 검수 중</b><small>사실과 출처 확인</small></span></div>
        <em />
        <div className={status === 'revision' ? 'revision' : ''}><i>3</i><span><b>수정 요청 상태</b><small>{status === 'revision' ? '보완 필요' : '요청 없음'}</small></span></div>
      </div>
      <div className="waiting-actions">
        <button className="outline-button" onClick={() => setStatus(status === 'reviewing' ? 'revision' : 'reviewing')}>상태 더미 전환</button>
        <button className="primary-button" disabled={status !== 'revision'} onClick={onEdit}>수정하기</button>
      </div>
    </section>
  )
}

function SolveProblem() {
  const [round, setRound] = useState(1)
  const [choice, setChoice] = useState('')
  const [reason, setReason] = useState('')
  const [source, setSource] = useState('')
  const [confidence, setConfidence] = useState(70)
  const [submitted, setSubmitted] = useState(false)
  const canSubmit = choice !== '' && reason.trim() !== '' && source.trim() !== ''

  const roundProblem = useMemo(() => round === 1 ? {
    owner: '보라 부엉이',
    title: '양자 기술, 진실은 무엇일까?',
  } : {
    owner: '달빛 토끼',
    title: '우주 탐사의 세 가지 기록',
  }, [round])

  return (
    <section className="workspace-card">
      <div className="workspace-heading solve-heading">
        <div><span>STEP C · SOLVE</span><h1>{round}회차 문제 풀이</h1><p>{roundProblem.owner} 모둠이 만든 문제입니다.</p></div>
        <div className="round-switch">
          <button className={round === 1 ? 'active' : ''} onClick={() => { setRound(1); setSubmitted(false) }}>1회차</button>
          <button className={round === 2 ? 'active' : ''} onClick={() => { setRound(2); setSubmitted(false) }}>2회차</button>
        </div>
      </div>
      <div className="solve-title"><span>QUESTION</span><h2>{roundProblem.title}</h2><p>다음 카드 중 사실이 아닌 AI 환각 하나를 찾으세요.</p></div>
      <div className="solve-card-grid">
        {sampleCards.map((card) => (
          <button key={card.key} className={choice === card.key ? 'selected' : ''} onClick={() => setChoice(card.key)}>
            <span>{card.key}</span><h3>{card.title}</h3><p>{card.body}</p><i>{choice === card.key ? '선택됨 ✓' : '이 카드를 선택'}</i>
          </button>
        ))}
      </div>
      <div className="solve-form">
        <label className="field"><span>판단 근거</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="어떤 부분이 사실과 다르다고 판단했나요?" /></label>
        <label className="field"><span>검증 출처</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="확인한 책, 문서 또는 웹 자료" /></label>
        <label className="confidence-field"><span>확신도 <b>{confidence}%</b></span><input type="range" min="0" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label>
      </div>
      <button className="submit-answer" disabled={!canSubmit || submitted} onClick={() => setSubmitted(true)}>
        {submitted ? `${round}회차 최종 제출 완료 ✓` : `${round}회차 최종 제출`}<span>{submitted ? '' : '→'}</span>
      </button>
    </section>
  )
}

function TeamPage() {
  const [stage, setStage] = useState<TeamStage>('create')
  return (
    <main className="team-page">
      <header><Brand compact /><span className="team-chip"><i /> 2모둠 · 은빛 여우 · 대표 박서준</span></header>
      <section className="team-content">
        <StepTabs stage={stage} setStage={setStage} />
        {stage === 'create' && <CreateProblem onSubmit={() => setStage('review')} />}
        {stage === 'review' && <ReviewWaiting onEdit={() => setStage('create')} />}
        {stage === 'solve' && <SolveProblem />}
      </section>
    </main>
  )
}

function NotFound() {
  return <main className="not-found"><Brand /><h1>길을 잃은 단서예요.</h1><p>요청한 화면을 찾을 수 없습니다.</p><Link to="/">참여 화면으로 돌아가기</Link></main>
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
