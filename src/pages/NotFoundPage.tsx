import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui/primitives'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={Compass}
        title="页面不存在"
        description="链接可能已经失效。返回总览继续选车。"
        action={
          <Link to="/">
            <Button variant="primary">返回总览</Button>
          </Link>
        }
      />
    </div>
  )
}
