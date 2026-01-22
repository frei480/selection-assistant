import React, { useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { MainPage } from './pages/MainPage'
import { SettingsPage } from './pages/SettingsPage'
import ResultPage from './pages/ResultPage'
import styled from 'styled-components'

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
          <Route path="/" element={<MainPage />} />
          <Route
            path="/settings"
            element={<SettingsPage onClose={handleCloseWindow} />}
          />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </Router>
    </ConfigProvider>
  )
}

export default App
