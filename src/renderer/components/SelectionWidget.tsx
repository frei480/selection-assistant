import React, { useState, useCallback } from 'react'
import { Button, Tooltip } from 'antd'
import { Copy, MessageSquare, BookOpen, Languages } from 'lucide-react'
import styled from 'styled-components'

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  tooltip?: string
}

interface SelectionWidgetProps {
  selectedText: string
  onCopy: () => void
  onExplain: () => void
  onSummarize: () => void
  onTranslate: () => void
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, tooltip }) => {
  return (
    <Tooltip title={tooltip || label}>
      <StyledButton type="primary" icon={icon} onClick={onClick} size="large" />
    </Tooltip>
  )
}

const WidgetContainer = styled.div`
  background: #fff;
  border: 2px solid #ff0000;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: slideIn 0.2s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`

const TextPreview = styled.div`
  display: none;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-direction: row;
  flex-wrap: nowrap;
`

const StyledButton = styled(Button)`
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &.ant-btn-primary {
    background-color: #1890ff;
    border-color: #1890ff;
  }
  
  &.ant-btn-primary:hover {
    background-color: #40a9ff;
    border-color: #40a9ff;
  }
`

const SelectionWidget: React.FC<SelectionWidgetProps> = ({ 
  selectedText, 
  onCopy, 
  onExplain, 
  onSummarize, 
  onTranslate 
}) => {
  console.log('[SelectionWidget] Rendering with text:', selectedText.substring(0, 50))
  
  return (
    <WidgetContainer>
      <TextPreview>{selectedText.substring(0, 50)}...</TextPreview>
      <ButtonGroup>
        <ActionButton 
          icon={<Copy size={16} />} 
          label="Copy" 
          onClick={onCopy}
          tooltip="Copy to clipboard"
        />
        <ActionButton 
          icon={<MessageSquare size={16} />} 
          label="Explain" 
          onClick={onExplain}
          tooltip="Explain the text"
        />
        <ActionButton 
          icon={<BookOpen size={16} />} 
          label="Summarize" 
          onClick={onSummarize}
          tooltip="Summarize the text"
        />
        <ActionButton 
          icon={<Languages size={16} />} 
          label="Translate" 
          onClick={onTranslate}
          tooltip="Translate the text"
        />
      </ButtonGroup>
    </WidgetContainer>
  )
}

export default SelectionWidget
