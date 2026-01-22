import React from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { MainPage } from './pages/MainPage'
import { SettingsPage } from './pages/SettingsPage'
import ResultPage from './pages/ResultPage'

const App: React.FC = () => {
  const handleCloseWindow = async () => {
    await window.electronAPI.window.close()
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#667eea',
        },
      }}
    >
      <Router>
        <Routes>
          {/* 👇 делаем настройки главной страницей */}
          <Route path="/" element={<Navigate to="/settings" replace />} />

          <Route
            path="/settings"
            element={<SettingsPage onClose={handleCloseWindow} />}
          />
          <Route path="/main" element={<MainPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </Router>
    </ConfigProvider>
  )
}

export default App
