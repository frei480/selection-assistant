import React, { useState, useEffect } from 'react'
import { Button, Space, Divider } from 'antd'
import { Settings, Copy, ArrowLeft } from 'lucide-react'
import styled from 'styled-components'
import SelectionWidget from '../components/SelectionWidget'
import { useNavigate } from 'react-router-dom'

export const HelpPage: React.FC = () => {
  const navigate = useNavigate()
  const [selectedText, setSelectedText] = useState('')
  const [widgetPosition, setWidgetPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      
      if (selection && selection.toString().length > 0) {
        const text = selection.toString()
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setSelectedText(text)
        setWidgetPosition({
          x: Math.max(10, rect.left + window.scrollX),
          y: Math.max(10, rect.top + window.scrollY - 50),
        })
      } else {
        setSelectedText('')
        setWidgetPosition(null)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const handleOpenSettings = async () => {
    await window.ipc.window.openSettings()
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText('Sample text')
  }

  const handleCloseWidget = () => {
    setSelectedText('')
    setWidgetPosition(null)
  }

  return (
    <Container>
      <Header>
        <Title>Selection Assistant</Title>
        <Subtitle>Text Selection & AI Integration Tool</Subtitle>
      </Header>

      <Content>
        <Section>
          <SectionTitle>Quick Start</SectionTitle>
          <SectionContent>
            <p>Selection Assistant helps you quickly process selected text with AI capabilities.</p>
            <StepList>
              <li>1. Configure your settings (open Settings below)</li>
              <li>2. Set up LM Studio connection for AI features</li>
              <li>3. Select text in any application</li>
              <li>4. Use the floating toolbar to process the text</li>
            </StepList>
          </SectionContent>
        </Section>

        <Divider />

        <Section>
          <SectionTitle>Features</SectionTitle>
          <FeatureGrid>
            <FeatureCard>
              <FeatureTitle>Text Selection</FeatureTitle>
              <FeatureDesc>Detect and process selected text from any application</FeatureDesc>
            </FeatureCard>
            <FeatureCard>
              <FeatureTitle>AI Integration</FeatureTitle>
              <FeatureDesc>Connect to LM Studio for local AI processing</FeatureDesc>
            </FeatureCard>
            <FeatureCard>
              <FeatureTitle>Floating Toolbar</FeatureTitle>
              <FeatureDesc>Quick access toolbar appears near your selection</FeatureDesc>
            </FeatureCard>
            <FeatureCard>
              <FeatureTitle>Custom Actions</FeatureTitle>
              <FeatureDesc>Extensible action system for different operations</FeatureDesc>
            </FeatureCard>
          </FeatureGrid>
        </Section>

        <Divider />

        <Section>
          <SectionTitle>Status</SectionTitle>
          <StatusGrid>
            <StatusItem>
              <StatusLabel>Status:</StatusLabel>
              <StatusValue style={{ color: '#52c41a' }}>Ready</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Trigger Mode:</StatusLabel>
              <StatusValue>Text Selection</StatusValue>
            </StatusItem>
          </StatusGrid>
        </Section>
      </Content>

       <Footer>
        <Space>
           <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/')}
          >
            Back to Settings
          </Button>          
        </Space>
      </Footer>

      {selectedText && widgetPosition && (
        <div style={{ position: 'absolute', left: widgetPosition.x, top: widgetPosition.y, zIndex: 1000 }}>
          <SelectionWidget
            selectedText={selectedText}
            onCopy={handleCopyToClipboard}
            onExplain={() => console.log('Explain action')}
            onSummarize={() => console.log('Summarize action')}
            onTranslate={() => console.log('Translate action')}
          />
        </div>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
`

const Header = styled.div`
  background: rgba(255, 255, 255, 0.95);
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

const Title = styled.h1`
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Subtitle = styled.p`
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #999;
`

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 40px 20px;
  background: white;
  margin: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
`

const SectionContent = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: #666;

  p {
    margin-bottom: 12px;
  }
`

const StepList = styled.ol`
  margin: 12px 0;
  padding-left: 20px;

  li {
    margin-bottom: 8px;
  }
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

const FeatureCard = styled.div`
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
  border-left: 4px solid #667eea;
`

const FeatureTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
`

const FeatureDesc = styled.p`
  margin: 0;
  font-size: 12px;
  color: #666;
`

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
`

const StatusItem = styled.div`
  display: flex;
  flex-direction: column;
`

const StatusLabel = styled.span`
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
`

const StatusValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #333;
`

const Footer = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #e8e8e8;
  text-align: center;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
`
