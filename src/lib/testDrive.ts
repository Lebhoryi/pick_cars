import { TEST_DRIVE_CRITERIA, type TestDriveCriterionId, type TestDriveRecord } from '@/types'

export const TEST_DRIVE_MAX = 5

export interface TestDriveSummary {
  average: number | null
  filled: number
  total: number
  best: { id: TestDriveCriterionId; label: string; score: number } | null
  worst: { id: TestDriveCriterionId; label: string; score: number } | null
}

export function summarizeTestDrive(record: TestDriveRecord | undefined): TestDriveSummary {
  const total = TEST_DRIVE_CRITERIA.length
  if (!record) return { average: null, filled: 0, total, best: null, worst: null }

  const scored: Array<{ id: TestDriveCriterionId; label: string; score: number }> = TEST_DRIVE_CRITERIA.flatMap((criterion) => {
    const score = record.scores[criterion.id]?.score ?? null
    return score === null ? [] : [{ id: criterion.id, label: criterion.label as string, score }]
  })

  if (scored.length === 0) return { average: null, filled: 0, total, best: null, worst: null }

  const sum = scored.reduce((acc, item) => acc + item.score, 0)
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  return {
    average: Math.round((sum / scored.length) * 10) / 10,
    filled: scored.length,
    total,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
  }
}

/** 0–5 → 10 分制，方便和偏好模型的手打分对照 */
export function toTenPoint(score: number | null): number | null {
  if (score === null) return null
  return Math.round(score * 2 * 10) / 10
}

export function formatDriveScore(score: number | null): string {
  return score === null ? '待试驾' : `${score.toFixed(1)} / 5`
}
