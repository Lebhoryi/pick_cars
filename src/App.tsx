import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { OverviewPage } from '@/pages/OverviewPage'
import { GaragePage } from '@/pages/GaragePage'
import { VehicleDetailPage } from '@/pages/VehicleDetailPage'
import { ComparePage } from '@/pages/ComparePage'
import { ScorePage } from '@/pages/ScorePage'
import { PricePage } from '@/pages/PricePage'
import { CostPage } from '@/pages/CostPage'
import { DataPage } from '@/pages/DataPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="garage" element={<GaragePage />} />
        <Route path="garage/:id" element={<VehicleDetailPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="score" element={<ScorePage />} />
        <Route path="prices" element={<PricePage />} />
        <Route path="cost" element={<CostPage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
