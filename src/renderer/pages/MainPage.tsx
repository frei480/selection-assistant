import React, { useState, useEffect } from 'react'
import { Form, Input, Switch, Button, Select, Space, Card, message, Spin } from 'antd'
import styled from 'styled-components'
import type { SettingsConfig } from '../../shared/types'
import type {} from '../types/electron'
import SelectionWidget from '../components/SelectionWidget'
import { useNavigate } from 'react-router-dom'

interface SettingsPageProps {
  onClose?: () => void
}

export const MainPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<SettingsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm()
  const [testingConnection, setTestingConnection] = useState(false)
  const [models, setModels] = useState<string[]>([])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Check if IPC API is available
      if (!window.ipc || !window.ipc.settings) {
        message.error('IPC API is not available. Please restart the application.')
        setLoading(false)
        return
      }
      
      const loaded = await window.ipc.settings.get()
      setSettings(loaded)
      form.setFieldsValue(loaded)
    } catch (error) {
      message.error('Failed to load settings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values: any) => {
    try {
      // Check if IPC API is available
      if (!window.ipc || !window.ipc.settings) {
        message.error('IPC API is not available. Please restart the application.')
        return
      }
      
      for (const [key, value] of Object.entries(values)) {
        await window.ipc.settings.set(key as any, value)
      }
      message.success('Settings saved successfully')
    } catch (error) {
      message.error('Failed to save settings')
      console.error(error)
    }
  }

  const handleTestConnection = async () => {
    console.log('[SettingsPage] handleTestConnection called')
    setTestingConnection(true)
    try {
      // Check if IPC API is available
      if (!window.ipc || !window.ipc.lmstudio) {
        message.error('IPC API is not available. Please restart the application.')
        setTestingConnection(false)
        return
      }
      
      console.log('[SettingsPage] Calling window.ipc.lmstudio.testConnection()')
      const isConnected = await window.ipc.lmstudio.testConnection()
      console.log(`[SettingsPage] testConnection returned: ${isConnected}`)
      if (isConnected) {
        message.success('Connected to LM Studio successfully!')
        const modelsList = await window.ipc.lmstudio.getModels()
        setModels(modelsList)
        if (modelsList.length > 0) {
          message.success(`Found ${modelsList.length} models`)
        } else {
          message.warning('No models found. Make sure you have loaded models in LM Studio.')
        }
      } else {
        message.error('Failed to connect to LM Studio. Please check that LM Studio is running, the API server is enabled, your connection settings are correct, and that your firewall allows connections on the specified port.')
      }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error occurred'
      console.log(`[SettingsPage] Connection test failed with error: ${errorMessage}`)
      message.error(`Connection test failed: ${errorMessage}`)
      console.error(error)
      
      // Provide specific troubleshooting guidance based on error type
      if (errorMessage.includes('Connection timeout')) {
        message.info('Troubleshooting tip: Try increasing the timeout or check if LM Studio is running on the specified host and port.')
      } else if (errorMessage.includes('Connection refused')) {
        message.info('Troubleshooting tip: Make sure LM Studio is running and the API server is enabled in LM Studio settings.')
      } else if (errorMessage.includes('DNS lookup failed')) {
        message.info('Troubleshooting tip: Check your host setting and network connection.')
      } else if (errorMessage.includes('Network unreachable')) {
        message.info('Troubleshooting tip: Check your network connection and firewall settings.')
      }
    } finally {
      console.log('[SettingsPage] Finished testing connection')
      setTestingConnection(false)
    }
  }

  if (loading) {
    return <Spin />
  }
const WidgetPreviewWrapper = styled.div`
  margin: 4px 0 6px;
  padding: 6px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;

  display: flex;
  justify-content: center;
  `
  return (
    <Container>
      <Title>Selection Assistant Settings</Title>
      <Card title="Widget Preview" style={{ marginBottom: 6 }}>
      <WidgetPreviewWrapper>
         <SelectionWidget
           selectedText="This is how the selection widget will look"
           onCopy={() => {}}
           onExplain={() => {}}
           onSummarize={() => {}}
           onTranslate={() => {}}
         />
      </WidgetPreviewWrapper>
    </Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={settings || {}}
      >
        {/* General Settings */}
        
        <Card title="General Settings" style={{ marginBottom: 24 }}>
          <Form.Item
            name="triggerMode"
            label="Trigger Mode"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Text Selection', value: 'selection' },
                { label: 'Ctrl Key', value: 'ctrlkey' },
                { label: 'Custom Shortcut', value: 'shortcut' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="compactMode"
            label="Compact Mode"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="followToolbar"
            label="Follow Toolbar Position"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="rememberWindowSize"
            label="Remember Window Size"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="shortcutKey"
            label="Custom Shortcut Key"
          >
            <Input placeholder="e.g., Ctrl+Shift+L" />
          </Form.Item>

          <Form.Item
            name="filterMode"
            label="Application Filter Mode"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Default (All apps)', value: 'default' },
                { label: 'Whitelist (Only selected)', value: 'whitelist' },
                { label: 'Blacklist (Exclude selected)', value: 'blacklist' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="filterList"
            label="Application Filter List"
          >
            <Input.TextArea
              placeholder="Enter app names separated by commas&#10;e.g., cmd.exe, powershell.exe"
              rows={3}
            />
          </Form.Item>
        </Card>

        {/* LM Studio Settings */}
        <Card title="LM Studio Integration" style={{ marginBottom: 24 }}>
          <Form.Item
            name={['lmStudio', 'host']}
            label="LM Studio Host"
            rules={[{ required: true, message: 'Host is required' }]}
          >
            <Input placeholder="localhost" />
          </Form.Item>

          <Form.Item
            name={['lmStudio', 'port']}
            label="LM Studio Port"
            rules={[{ required: true, message: 'Port is required' }]}
          >
            <Input type="number" placeholder="1234" />
          </Form.Item>

          <Form.Item
            name={['lmStudio', 'apiPath']}
            label="API Path"
            rules={[{ required: true }]}
          >
            <Input placeholder="/v1" />
          </Form.Item>

          <Form.Item
            name={['lmStudio', 'model']}
            label="Model"
          >
            <Select
              placeholder="Select a model or enter custom"
              options={models.map(m => ({ label: m, value: m }))}
            />
          </Form.Item>

          <Form.Item>
            <Button
              onClick={handleTestConnection}
              loading={testingConnection}
              type="primary"
            >
              Test Connection
            </Button>
          </Form.Item>

          <ConnectionInfo>
            <p>Connection string:</p>
            <code>
              {settings?.lmStudio &&
                `http://${settings.lmStudio.host}:${settings.lmStudio.port}${settings.lmStudio.apiPath}`}
            </code>
          </ConnectionInfo>
        </Card>

         {/* Actions */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Save Settings
            </Button>
             <Button onClick={() => navigate('/help')}>Help</Button>
            <Button onClick={onClose}>Close</Button>
          </Space>
        </Form.Item>
      </Form>
    </Container>
  )
}

const Container = styled.div`
  padding: 24px;
  background: #fafafa;
  height: 100vh;
  overflow-y: auto;
`

const Title = styled.h1`
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: 600;
`

const ConnectionInfo = styled.div`
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  border-left: 4px solid #1890ff;

  p {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #666;
  }

  code {
    display: block;
    padding: 8px;
    background: #fff;
    border-radius: 2px;
    font-size: 12px;
    word-break: break-all;
  }
`
