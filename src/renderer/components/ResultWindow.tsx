import React, { useState, useEffect } from 'react'
import { Button, Space, Spin, message, Card, Empty } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { ArrowLeft, Copy } from 'lucide-react'
import styled from 'styled-components'

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

  return (
    <ResultContainer>
      <div className="header">
        <h2>{actionTitles[action]}</h2>
        <Button type="primary" danger onClick={onClose}>
          <ArrowLeft size={14} style={{ marginRight: 4 }} />
          Закрыть
        </Button>
      </div>

      <div className="content">
        <h3>Исходный текст</h3>
        <p>{text}</p>
      </div>

      <div className="content">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3>{actionTitles[action]}</h3>
          <Button
            type="text"
            size="small"
            icon={<Copy size={14} />}
            onClick={() => copyToClipboard(result)}
          >
            Копировать
          </Button>
        </div>
        <p>{result}</p>
      </div>

      <div className="actions">
        <Button onClick={onClose}>Назад</Button>
        <Button
          type="primary"
          onClick={() => copyToClipboard(result)}
          icon={<CopyOutlined />}
        >
          Копировать результат
        </Button>
      </div>
    </ResultContainer>
  )
}

export default ResultWindow
