import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../lib/auth'
export default function NotificationBadge() {
  const { session } = useAuth(); const qc = useQueryClient(); const uid = session?.user.id
  const { data } = useQuery({ queryKey: ['unread'], queryFn: notificationService.unread, enabled: !!uid })
  useEffect(() => uid ? notificationService.subscribe(uid, () => { qc.invalidateQueries({ queryKey: ['unread'] }); qc.invalidateQueries({ queryKey: ['notifs'] }) }) : undefined, [uid, qc])
  return data ? <span className="ml-auto rounded-full bg-amber px-2 text-xs font-medium text-ink" aria-label={`${data} unread`}>{data}</span> : null
}
