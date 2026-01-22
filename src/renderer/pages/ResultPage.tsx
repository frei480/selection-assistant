import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Empty, Space, Spin } from 'antd'
import { CopyOutlined, CloseOutlined } from '@ant-design/icons'
import ResultWindow from '../components/ResultWindow'

export default function ResultPage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)

  const action = searchParams.get('action') as 'explain' | 'summarize' | 'translate' | null
  const text = searchParams.get('text')
  const result = searchParams.get('result')

  const handleClose = () => {
    window.ipc?.window.closeResult()
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result)
    }
  }

  if (!action || !text || !result) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Empty description="No data provided" />
        <Button onClick={handleClose} style={{ marginTop: '20px' }} type="primary">
          Close
        </Button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3>
            {action.charAt(0).toUpperCase() + action.slice(1)} Result
          </h3>
        </div>
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={handleClose}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <ResultWindow action={action} text={text} result={result} />
      </div>

      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
        <Space>
          <Button 
            icon={<CopyOutlined />} 
            onClick={handleCopy}
          >
            Copy Result
          </Button>
          <Button 
            onClick={handleClose}
            danger
          >
            Close
          </Button>
        </Space>
      </div>
    </div>
  )
}
