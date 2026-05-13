import type { BaseComponentProps } from '@json-render/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { explainerSpecs } from './specs'
import { z } from 'zod'

type S = typeof explainerSpecs
type P<K extends keyof S> = z.infer<S[K]['props']>

// ── Ported defaults ────────────────────────────────────────────────────────

const CALLOUT = {
  info:    { border: '#3b82f6', label: '#3b82f6', bg: 'rgba(59,130,246,0.07)' },
  warning: { border: '#f59e0b', label: '#f59e0b', bg: 'rgba(245,158,11,0.07)' },
  tip:     { border: '#22c55e', label: '#22c55e', bg: 'rgba(34,197,94,0.07)'  },
  danger:  { border: '#ef4444', label: '#ef4444', bg: 'rgba(239,68,68,0.07)'  },
} as const

function ConceptPanel({ props }: BaseComponentProps<P<'ConceptPanel'>>) {
  return (
    <div style={{
      padding: '24px',
      border: `1px solid ${props.accent ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      background: 'var(--surface)',
    }}>
      {props.badge && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {props.badge}
        </span>
      )}
      <h3 style={{ marginTop: props.badge ? '8px' : 0, fontSize: '18px', fontWeight: 600 }}>
        {props.title}
      </h3>
      <p style={{ marginTop: '8px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {props.description}
      </p>
    </div>
  )
}

function StepList({ props }: BaseComponentProps<P<'StepList'>>) {
  return (
    <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {props.steps.map((step, i) => (
        <li key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start',
          opacity: step.status === 'pending' ? 0.4 : 1 }}>
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
            display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 700,
            background: step.status === 'done' ? 'var(--accent)' : 'transparent',
            border: `1px solid ${step.status === 'done' ? 'var(--accent)' : 'var(--border)'}`,
            color: step.status === 'done' ? 'var(--bg)' : 'var(--text-primary)',
          }}>{step.status === 'done' ? '✓' : i + 1}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{step.label}</div>
            {step.detail && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {step.detail}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function PropertyTable({ props }: BaseComponentProps<P<'PropertyTable'>>) {
  return (
    <div>
      {props.title && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          {props.title}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {props.rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 0', color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: '13px', width: '40%' }}>
                {row.key}
              </td>
              <td style={{ padding: '10px 0', fontWeight: 500 }}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CalloutCard({ props }: BaseComponentProps<P<'CalloutCard'>>) {
  const c = CALLOUT[props.kind] ?? CALLOUT.info
  return (
    <div style={{ padding: '16px 20px', border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius)', background: c.bg }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: c.label,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        {props.kind.toUpperCase()}{props.title ? ` — ${props.title}` : ''}
      </div>
      <p style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{props.body}</p>
    </div>
  )
}

function SectionHeader({ props }: BaseComponentProps<P<'SectionHeader'>>) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{props.label}</h2>
      {props.subtitle && (
        <p style={{ marginTop: '4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {props.subtitle}
        </p>
      )}
    </div>
  )
}

// ── New explainer components ───────────────────────────────────────────────

function CompareGrid({ props }: BaseComponentProps<P<'CompareGrid'>>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${props.options.length}, 1fr)`, gap: '16px' }}>
      {props.options.map((opt, i) => (
        <div key={i} style={{
          padding: '20px',
          border: `1px solid ${opt.recommended ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          background: 'var(--surface)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {opt.name}
            {opt.recommended && (
              <span style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>recommended</span>
            )}
          </div>
          {opt.pros.map((p, j) => (
            <div key={j} style={{ fontSize: '13px', color: '#4ade80', marginBottom: '4px' }}>+ {p}</div>
          ))}
          {opt.cons.map((c, j) => (
            <div key={j} style={{ fontSize: '13px', color: '#f87171', marginBottom: '4px' }}>− {c}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Timeline({ props }: BaseComponentProps<P<'Timeline'>>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {props.events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0, marginTop: '4px' }} />
            {i < props.events.length - 1 && (
              <div style={{ width: '1px', flex: 1, background: 'var(--border)', minHeight: '24px' }} />
            )}
          </div>
          <div style={{ paddingBottom: '20px', flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)',
              marginBottom: '2px' }}>{ev.when}</div>
            <div style={{ fontWeight: 600 }}>{ev.title}</div>
            {ev.body && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                {ev.body}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalogyCard({ props }: BaseComponentProps<P<'AnalogyCard'>>) {
  return (
    <div style={{ padding: '24px', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
            textTransform: 'uppercase', marginBottom: '6px' }}>familiar</div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>{props.familiar}</div>
        </div>
        <div style={{ color: 'var(--accent)', fontSize: '24px' }}>≈</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)',
            textTransform: 'uppercase', marginBottom: '6px' }}>new concept</div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>{props.unfamiliar}</div>
        </div>
      </div>
      <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(128,128,128,0.06)',
        borderRadius: 'calc(var(--radius) - 4px)', fontSize: '14px', lineHeight: 1.6,
        color: 'var(--text-secondary)', textAlign: 'center' }}>
        {props.mapping}
      </div>
    </div>
  )
}

function BeforeAfter({ props }: BaseComponentProps<P<'BeforeAfter'>>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {([props.before, props.after] as const).map((panel, i) => (
        <div key={i} style={{
          padding: '20px',
          border: `1px solid ${i === 0 ? '#f87171' : '#4ade80'}`,
          borderRadius: 'var(--radius)',
          background: i === 0 ? 'rgba(248,113,113,0.04)' : 'rgba(74,222,128,0.04)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: i === 0 ? '#f87171' : '#4ade80', marginBottom: '10px' }}>
            {panel.label}
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {panel.body}
          </div>
        </div>
      ))}
    </div>
  )
}

function CodeWalkthrough({ props }: BaseComponentProps<P<'CodeWalkthrough'>>) {
  return (
    <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden',
      border: '1px solid var(--border)', background: '#0d1117' }}>
      <div style={{ padding: '8px 16px', background: '#161b22', borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {props.language}
      </div>
      {props.lines.map((line, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          background: line.highlight ? 'rgba(255,235,59,0.06)' : undefined,
          borderLeft: line.highlight ? '2px solid #fef08a' : '2px solid transparent',
        }}>
          <pre style={{ margin: 0, padding: '3px 16px', fontFamily: 'var(--font-mono)',
            fontSize: '13px', color: '#e6edf3', lineHeight: 1.6, whiteSpace: 'pre' }}>
            {line.code}
          </pre>
          {line.note && (
            <div style={{ padding: '3px 16px', fontSize: '12px', color: '#8b949e',
              fontStyle: 'italic', alignSelf: 'center', maxWidth: '280px' }}>
              ← {line.note}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function KeyTermList({ props }: BaseComponentProps<P<'KeyTermList'>>) {
  return (
    <dl style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {props.terms.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
          <dt style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)',
            flexShrink: 0, minWidth: '140px' }}>{t.term}</dt>
          <dd style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t.definition}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Quiz({ props }: BaseComponentProps<P<'Quiz'>>) {
  return (
    <div style={{ padding: '24px', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
      <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '16px', lineHeight: 1.4 }}>
        {props.question}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {props.options.map((opt, i) => (
          <div key={i} style={{
            padding: '10px 14px', borderRadius: 'calc(var(--radius) - 2px)',
            border: `1px solid ${i === props.correctIndex ? 'var(--accent)' : 'var(--border)'}`,
            background: i === props.correctIndex ? 'rgba(var(--accent-rgb, 99,102,241),0.07)' : undefined,
            fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: i === props.correctIndex ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
            {i === props.correctIndex && (
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--accent)' }}>✓ correct</span>
            )}
          </div>
        ))}
      </div>
      {props.explanation && (
        <div style={{ padding: '12px 16px', background: 'rgba(128,128,128,0.06)',
          borderRadius: 'calc(var(--radius) - 4px)', fontSize: '13px',
          color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {props.explanation}
        </div>
      )}
    </div>
  )
}

function Markdown({ props }: BaseComponentProps<P<'Markdown'>>) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.content}</ReactMarkdown>
    </div>
  )
}

export const explainerComponents = {
  ConceptPanel,
  StepList,
  PropertyTable,
  CalloutCard,
  SectionHeader,
  CompareGrid,
  Timeline,
  AnalogyCard,
  BeforeAfter,
  CodeWalkthrough,
  KeyTermList,
  Quiz,
  Markdown,
}
