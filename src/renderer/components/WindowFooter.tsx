import { LoadingOutlined } from '@ant-design/icons'
import { RefreshIcon } from './Icons'
import { useTimer } from '../hooks/useTimer'
import { XCircle, Copy, Pause } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import styled from 'styled-components'

interface FooterProps {
  content?: string
  loading?: boolean
  onPause?: () => void
  onRegenerate?: () => void
  onClose?: () => void
}

const WindowFooter: FC<FooterProps> = ({
  content = '',
  loading = false,
  onPause = undefined,
  onRegenerate = undefined,
  onClose = undefined
}) => {
  const [isWindowFocus, setIsWindowFocus] = useState(true)
  const [isCopyHovered, setIsCopyHovered] = useState(false)
  const [isEscHovered, setIsEscHovered] = useState(false)
  const [isRegenerateHovered, setIsRegenerateHovered] = useState(false)
  const [isContainerHovered, setIsContainerHovered] = useState(false)
  const [isShowMe, setIsShowMe] = useState(true)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { setTimeoutTimer } = useTimer()

  useEffect(() => {
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('blur', handleWindowBlur)
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setIsShowMe(false)
      hideTimerRef.current = null
    }, 3000)

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  const showMePeriod = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }

    setIsShowMe(true)
    hideTimerRef.current = setTimeout(() => {
      setIsShowMe(false)
      hideTimerRef.current = null
    }, 2000)
  }

  useHotkeys('c', () => {
    showMePeriod()
    handleCopy()
  })

  useHotkeys('r', () => {
    showMePeriod()
    handleRegenerate()
  })

  useHotkeys('esc', () => {
    showMePeriod()
    handleEsc()
  })

  const handleEsc = () => {
    setIsEscHovered(true)
    setTimeoutTimer(
      'handleEsc',
      () => {
        setIsEscHovered(false)
      },
      200
    )

    if (loading && onPause) {
      onPause()
    } else if (onClose) {
      onClose()
    }
  }

  const handleRegenerate = () => {
    setIsRegenerateHovered(true)
    setTimeoutTimer(
      'handleRegenerate_1',
      () => {
        setIsRegenerateHovered(false)
      },
      200
    )

    if (loading && onPause) {
      onPause()
    }

    if (onRegenerate) {
      setTimeoutTimer(
        'handleRegenerate_2',
        () => {
          onRegenerate()
        },
        200
      )
    }
  }

  const handleCopy = () => {
    if (!content || loading) return

    navigator.clipboard
      .writeText(content)
      .then(() => {
        setIsCopyHovered(true)
        setTimeoutTimer(
          'handleCopy',
          () => {
            setIsCopyHovered(false)
          },
          200
        )
      })
      .catch(() => {
        console.error('Failed to copy')
      })
  }

  const handleWindowFocus = () => {
    setIsWindowFocus(true)
  }

  const handleWindowBlur = () => {
    setIsWindowFocus(false)
  }

  return (
    <Container
      onMouseEnter={() => setIsContainerHovered(true)}
      onMouseLeave={() => setIsContainerHovered(false)}
      $isHovered={isContainerHovered}
      $showInitially={isShowMe}>
      <OpButtonWrapper>
        <OpButton onClick={handleEsc} $isWindowFocus={isWindowFocus} data-hovered={isEscHovered}>
          {loading ? (
            <>
              <LoadingIconWrapper>
                <Pause size={14} className="btn-icon loading-icon" style={{ position: 'absolute', left: 1, top: 1 }} />
                <LoadingOutlined
                  style={{ fontSize: 16, position: 'absolute', left: 0, top: 0 }}
                  className="btn-icon loading-icon"
                  spin
                />
              </LoadingIconWrapper>
              Stop
            </>
          ) : (
            <>
              <XCircle size={14} className="btn-icon" />
              Close
            </>
          )}
        </OpButton>
        {onRegenerate && (
          <OpButton onClick={handleRegenerate} $isWindowFocus={isWindowFocus} data-hovered={isRegenerateHovered}>
            <RefreshIcon size={14} className="btn-icon" />
            Regenerate
          </OpButton>
        )}
        <OpButton onClick={handleCopy} $isWindowFocus={isWindowFocus && !!content} data-hovered={isCopyHovered}>
          <Copy size={14} className="btn-icon" />
          Copy
        </OpButton>
      </OpButtonWrapper>
    </Container>
  )
}

const Container = styled.div<{ $isHovered: boolean; $showInitially: boolean }>`
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 480px;
  min-width: min-content;
  width: calc(100% - 16px);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 5px 8px;
  height: 32px;
  backdrop-filter: blur(8px);
  border-radius: 8px;
  opacity: ${(props) => (props.$showInitially ? 1 : 0)};
  transition: all 0.3s ease;
  background-color: rgba(255, 255, 255, 0.8);

  &:hover {
    opacity: 1;
  }
`

const OpButtonWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 12px;
  gap: 6px;
`

const OpButton = styled.div<{ $isWindowFocus: boolean; $isHovered?: boolean }>`
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border-radius: 4px;
  background-color: #f5f5f5;
  color: #666;
  height: 22px;
  opacity: ${(props) => (props.$isWindowFocus ? 1 : 0.2)};
  transition: opacity 0.3s ease;
  transition: color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;

  .btn-icon {
    color: #666;
  }

  .loading-icon {
    color: #ff4d4f;
  }

  &:hover,
  &[data-hovered='true'] {
    color: #1890ff !important;

    .btn-icon {
      color: #1890ff !important;
      transition: color 0.2s ease;
    }
  }
`

const LoadingIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 16px;
  height: 16px;
`

export default WindowFooter