import { MISSING_ENV } from '../lib/supabase'

/**
 * Shown instead of the store when the Supabase environment variables are
 * missing — most often a fresh deploy where they were never added.
 *
 * Deliberately plain CSS rather than Tailwind classes: if a build is broken
 * enough to reach this screen, it should not also depend on the stylesheet
 * having loaded.
 */
export default function ConfigNotice() {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px',
      background: '#FFFBFC', fontFamily: 'Outfit, system-ui, sans-serif', color: '#1A0E14',
    }}>
      <div style={{
        maxWidth: '560px', width: '100%', background: '#fff', borderRadius: '16px',
        border: '1px solid #F6E3EB', padding: '32px',
        boxShadow: '0 8px 40px -20px rgba(26,14,20,.3)',
      }}>
        <p style={{
          margin: 0, fontSize: '11px', letterSpacing: '.2em', textTransform: 'uppercase', color: '#C4478A',
        }}>
          Setup needed
        </p>

        <h1 style={{ margin: '10px 0 0', fontSize: '26px', fontWeight: 600 }}>
          This site is not connected to its database
        </h1>

        <p style={{ margin: '12px 0 0', fontSize: '15px', lineHeight: 1.6, color: '#7A6570' }}>
          {MISSING_ENV.length === 2
            ? 'Both environment variables are missing.'
            : `${MISSING_ENV[0]} is missing.`}{' '}
          They are read at build time, so they must be set on the host and the site redeployed.
        </p>

        <ul style={{
          margin: '18px 0 0', padding: '14px 16px', listStyle: 'none',
          background: '#FFF1F6', borderRadius: '10px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px',
        }}>
          {MISSING_ENV.map((name) => (
            <li key={name} style={{ padding: '3px 0' }}>{name}</li>
          ))}
        </ul>

        {/* listStyle is set explicitly because Tailwind's preflight strips it. */}
        <ol style={{
          margin: '18px 0 0', paddingLeft: '20px', listStyle: 'decimal',
          fontSize: '14px', lineHeight: 1.8, color: '#7A6570',
        }}>
          <li>Add them in your host&rsquo;s environment variable settings</li>
          <li>Apply them to production, preview and development</li>
          <li><strong style={{ color: '#1A0E14' }}>Redeploy</strong> &mdash; saving alone will not take effect</li>
        </ol>

        <p style={{ margin: '18px 0 0', fontSize: '13px', lineHeight: 1.6, color: '#7A6570' }}>
          Their values are in <code>.env.example</code>. The publishable key is safe to expose &mdash;
          row level security is what protects the data.
        </p>
      </div>
    </div>
  )
}
