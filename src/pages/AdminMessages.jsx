import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { formatDate } from '../lib/format'
import { adminListMessages, adminMarkMessageRead } from '../lib/adminApi'

export default function AdminMessages() {
  const [messages, setMessages] = useState(null)

  useEffect(() => { adminListMessages().then(setMessages).catch(() => setMessages([])) }, [])

  const toggleRead = async (m) => {
    await adminMarkMessageRead(m.id, !m.is_read)
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, is_read: !x.is_read } : x)))
  }

  const unread = (messages ?? []).filter((m) => !m.is_read).length

  return (
    <div>
      <PageHeading
        eyebrow="Inbox"
        title="Messages"
        subtitle={unread ? `${unread} unread from the contact form.` : 'Everything from the contact form.'}
      />

      <div className="mt-7 space-y-3">
        {!messages ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-card" />)
        ) : messages.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">No messages yet.</p>
          </div>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={`card p-5 ${m.is_read ? '' : 'border-wine-200 bg-wine-50/40'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-medium text-ink">{m.name}</h2>
                    {!m.is_read && <Badge tone="rose" dot>New</Badge>}
                    {m.topic && <Badge tone="neutral">{m.topic}</Badge>}
                  </div>
                  <a href={`mailto:${m.email}`} className="mt-0.5 block text-[12px] text-muted hover:text-wine">
                    {m.email}
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-[12px] text-muted">{formatDate(m.created_at)}</p>
                  <button type="button" onClick={() => toggleRead(m)} className="btn-ghost !py-1.5 text-[12px]">
                    {m.is_read ? 'Mark unread' : 'Mark read'}
                  </button>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink">{m.message}</p>

              <a
                href={`mailto:${m.email}?subject=Re: your message to Nails By Eimi`}
                className="btn-ghost mt-4 !py-2 text-[13px]"
              >
                <Icon name="mail" size={15} />
                Reply
              </a>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
