import { AppLogo } from '@renderer/config/env'
import '@renderer/assets/styles/selection-toolbar.css'


import React, { useState, useCallback } from 'react'
import { Button, Avatar } from 'antd'
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
      <StyledButton type="primary" icon={icon} onClick={onClick} size="large" />    
  )
}

const WidgetContainer = styled.div`
  display: inline-flex;
  flex-direction: row;
  align-items: stretch;
  height: var(--selection-toolbar-height);
  border-radius: var(--selection-toolbar-border-radius);
  border: var(--selection-toolbar-border);
  box-shadow: var(--selection-toolbar-box-shadow);
  background: var(--selection-toolbar-background);
  padding: var(--selection-toolbar-padding) !important;
  margin: var(--selection-toolbar-margin) !important;
  user-select: none;
  box-sizing: border-box;
  overflow: hidden;
  `
const LogoWrapper = styled.div`
  display: var(--selection-toolbar-logo-display);
  align-items: center;
  justify-content: center;
  margin: var(--selection-toolbar-logo-margin);
  padding: var(--selection-toolbar-logo-padding);
  background-color: var(--selection-toolbar-logo-background);
  border-width: var(--selection-toolbar-logo-border-width);
  border-style: var(--selection-toolbar-logo-border-style);
  border-color: var(--selection-toolbar-logo-border-color);
  border-radius: var(--selection-toolbar-border-radius) 0 0 var(--selection-toolbar-border-radius);  
  `
const Logo = styled(Avatar)`
  height: var(--selection-toolbar-logo-size);
  width: var(--selection-toolbar-logo-size);
  &.animate {
    animation: rotate 1s ease;
  }
  @keyframes rotate {
    0% {
      transform: rotate(0deg) scale(1);
    }
    25% {
      transform: rotate(-15deg) scale(1.05);
    }
    75% {
      transform: rotate(15deg) scale(1.05);
    }
    100% {
      transform: rotate(0deg) scale(1);
    }
  }`


const TextPreview = styled.div`
  display: none;
`

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: center;
  flex-direction: row;
  flex-wrap: nowrap;
  background-color:  var(--selection-toolbar-background);
  border-width: var(--selection-toolbar-buttons-border-width);
  border-style: var(--selection-toolbar-buttons-border-style);
  border-color: var(--selection-toolbar-buttons-border-color);
  border-radius: var(--selection-toolbar-buttons-border-radius);  
`

const StyledButton = styled(Button)`
  cursor: pointer !important;
  width: 40px !important;
  height: 100%;
  min-width: 40px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--selection-toolbar-button-margin);
  padding: var(--selection-toolbar-button-padding);
  background-color: var(--selection-toolbar-button-bgcolor);
  border-radius: var(--selection-toolbar-button-border-radius);
  border: var(--selection-toolbar-button-border);
  box-shadow: var(--selection-toolbar-button-box-shadow);
  transition: all 0.1s ease-in-out;
  
  &.ant-btn-primary {
    // background-color: #1890ff;
     border-color: #1890ff;
  }
  
  &.ant-btn-primary:hover {
    background-color: var(--selection-toolbar-button-bgcolor-hover);
    // border-color: #40a9ff;
  }
  //   &::after {
  //   display: none !important;
  // }
  &:last-child {
    border-radius: 0 var(--selection-toolbar-border-radius) var(--selection-toolbar-border-radius) 0;
    padding: var(--selection-toolbar-button-last-padding);
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
  const [animateKey, setAnimateKey] = useState(0)
  return (
    <WidgetContainer>    
      <TextPreview>{selectedText.substring(0, 50)}...</TextPreview>
        <LogoWrapper >
        <Logo src={AppLogo} key={animateKey} className="animate" />
      </LogoWrapper>
      <ButtonGroup>
        <ActionButton 
          icon={<Copy size={16} />} 
          label="Copy" 
          onClick={onCopy}
          tooltip="Скопировать текст"
        />
        <ActionButton 
          icon={<MessageSquare size={16} />} 
          label="Explain" 
          onClick={onExplain}
          tooltip="Объясни!"
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
          tooltip="Перевести"
        />
      </ButtonGroup>
    </WidgetContainer>
    
  )
}


export default SelectionWidget
