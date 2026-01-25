import React, { useState, useEffect } from 'react'
import { Button, Space, Spin, message, Card, Empty } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { ArrowLeft, Copy, ChevronDown } from 'lucide-react'
import styled from 'styled-components'
import WindowFooter from './WindowFooter'

const ResultContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: #f5f5f5;
  position: relative;
`

const ScrollableContent = styled.div`
  flex: 1;
  overflow: auto;
  padding-bottom: 12px; /* Space for footer */
`

const ContentWrapper = styled.div`
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

interface ResultWindowProps {
  action: 'explain' | 'summarize' | 'translate'
  text: string
  result: string
  onClose: () => void
}

const actionTitles = {
  explain: 'Объяснение',
  summarize: 'Краткое резюме',
  translate: 'Перевод',
}

export const ResultWindow: React.FC<ResultWindowProps> = ({
  action,
  text,
  result,
  onClose,
}) => {
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    message.success('Скопировано в буфер обмена')
  }
  const [showOriginal, setShowOriginal] = useState(false)
  return (
    <ResultContainer>
      <ScrollableContent>
        <ContentWrapper>
          {/* <div className="actions">
            <h2>{actionTitles[action]}</h2>
          </div> */}

          {/* <div className="content">
            <h3>Исходный текст</h3>
            <p>{text}</p>
          </div> */}
        <MenuContainer>
          <OriginalHeader onClick={() => setShowOriginal(!showOriginal)}>
            <span>
              {showOriginal ? `Скрыть исходный текст` : `Показать исходный текст`}
            </span>
            <ChevronDown size={14} className={showOriginal ? 'expanded' : ''} />
          </OriginalHeader>
        </MenuContainer>
        {showOriginal && (
          <OriginalContent>
            {text}
            <OriginalContentCopyWrapper>
            <Button
            type="text"
            size="small"
            icon={<Copy size={14} />}
            onClick={() => copyToClipboard(text)}
          >
            Копировать
          </Button>
            </OriginalContentCopyWrapper>
          </OriginalContent>
        )}
          <div className="content">
            {/* <h3>{actionTitles[action]}</h3> */}
            <p>{result}</p>
          </div>

          {/* <div className="actions">
            <Button
              type="default"
              size="middle"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(result)}
            >
              Копировать
            </Button>
            <Button type="primary" danger onClick={onClose}>
              Закрыть
            </Button>
          </div> */}
        </ContentWrapper>
      </ScrollableContent>
      <WindowFooter
        content={result}
        onClose={onClose}
      />
    </ResultContainer>
  )
}
const MenuContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`

const OriginalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 12px;

  &:hover {
    color: var(--color-primary);
  }

  .lucide {
    transition: transform 0.2s ease;
    &.expanded {
      transform: rotate(180deg);
    }
  }
`
const OriginalContent = styled.div`
  padding: 8px;
  margin-top: 8px;
  margin-bottom: 12px;
  background-color: var(--color-background-soft);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  width: 100%;
`
const OriginalContentCopyWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
`
export default ResultWindow