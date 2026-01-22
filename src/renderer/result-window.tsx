import React from 'react'
import ReactDOM from 'react-dom/client'
import { Button, Space, Spin, message, Card } from 'antd'
import { Copy, ChevronLeft } from 'lucide-react'
import styled from 'styled-components'
import type { ResultWindowOptions } from '../shared/types'
import '../index.css'

const ResultContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: #f5f5f5;
  overflow: auto;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .content {
    flex: 1;
    background: white;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow-y: auto;

    h3 {
      margin-top: 0;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    p {
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.6;
      margin: 10px 0 0 0;
    }
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
`

interface ResultState {
  data: ResultWindowOptions | null
  loading: boolean
}

const ResultWindow: React.FC = () => {
  const [state, setState] = React.useState<ResultState>({
    data: null,
    loading: true,
  })

  React.useEffect(() => {
    // Get data from query params
    const params = new URLSearchParams(window.location.search)
    const data = params.get('data')

    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data))
        setState({ data: parsed, loading: false })
      } catch (error) {
        console.error('Failed to parse result data:', error)
        setState({ data: null, loading: false })
      }
    } else {
      setState({ data: null, loading: false })
    }

    // Also listen for updates from main process
    window.ipc?.selection.onUpdateActionData((actionData) => {
      // Update if needed
    })
  }, [])

  const handleCopy = async () => {
    if (state.data?.result) {
      const success = await window.ipc?.selection.writeToClipboard(state.data.result)
      if (success) {
        message.success('Copied to clipboard!')
      } else {
        message.error('Failed to copy')
      }
    }
  }

  const handleClose = async () => {
    await window.ipc?.window.close()
  }

  if (state.loading) {
    return (
      <ResultContainer>
        <Spin />
      </ResultContainer>
    )
  }

  if (!state.data) {
    return (
      <ResultContainer>
        <div>No data available</div>
        <Button onClick={handleClose}>Close</Button>
      </ResultContainer>
    )
  }

  return (
    <ResultContainer>
      <div className="header">
        <h2 style={{ margin: 0, textTransform: 'capitalize' }}>
          {state.data.action}
        </h2>
        <Space>
          <Button icon={<Copy size={16} />} onClick={handleCopy}>
            Copy
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </Space>
      </div>

      <Card className="content" title="Original Text" size="small">
        <p>{state.data.text}</p>
      </Card>

      <Card className="content" title="Result" size="small">
        <p>{state.data.result}</p>
      </Card>

      <div className="actions">
        <Button type="primary" onClick={handleClose}>
          Done
        </Button>
      </div>
    </ResultContainer>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <ResultWindow />
  </React.StrictMode>
)
