import React from 'react'
import ReactDOM from 'react-dom/client'
import SelectionWidget from './components/SelectionWidget'
import type { TextSelectionData, ActionItem } from '../shared/types'
import './index.css'

console.log('[selection-toolbar.tsx] Loading...')

interface SelectionToolbarState {
  selectedText: string
  visible: boolean
}

// Update toolbar window size - must notify main process about content dimensions
const updateWindowSize = () => {
  const rootElement = document.getElementById('root')
  console.log('[updateWindowSize] Root element:', rootElement)
  
  if (!rootElement) {
    console.error('[updateWindowSize] Root element not found!')
    return
  }
  
  const width = rootElement.scrollWidth
  const height = rootElement.scrollHeight
  
  console.log(`[updateWindowSize] Sending dimensions: ${width}x${height}`)
  window.ipc?.selection.determineToolbarSize(width, height)
}

const SelectionToolbar: React.FC = () => {
  console.log('[SelectionToolbar] Component rendering')
  
  const [state, setState] = React.useState<SelectionToolbarState>({
    selectedText: '',
    visible: true,
  })

  React.useEffect(() => {
    console.log('[SelectionToolbar.useEffect] Setting up IPC listeners')
    console.log(`[SelectionToolbar.useEffect] window.ipc available: ${!!window.ipc}`)
    
    // Listen for text selection events
    window.ipc?.selection.onTextSelected((data: TextSelectionData) => {
      console.log(`[SelectionToolbar.onTextSelected] Text: "${data.text.substring(0, 50)}"`)
      setState({ selectedText: data.text, visible: true })
      // Update window size when new text is selected
      setTimeout(() => updateWindowSize(), 50)
    })

    // Listen for toolbar visibility changes
    window.ipc?.selection.onToolbarVisibilityChange((visible: boolean) => {
      console.log(`[SelectionToolbar.onToolbarVisibilityChange] Visible: ${visible}`)
      setState((prev) => ({ ...prev, visible }))
      if (visible) {
        setTimeout(() => updateWindowSize(), 50)
      }
    })
  }, [])

  // Update size when content changes
  React.useEffect(() => {
    if (state.visible && state.selectedText) {
      console.log('[SelectionToolbar.useEffect] Content changed, updating size')
      setTimeout(() => updateWindowSize(), 100)
    }
  }, [state.visible, state.selectedText])

  const handleAction = React.useCallback(
    async (action: 'explain' | 'summarize' | 'translate') => {
      const prompts = {
        explain: `Explain the following text in simple terms:\n\n${state.selectedText}`,
        summarize: `Summarize this text in 2-3 sentences:\n\n${state.selectedText}`,
        translate: `Translate this text to English:\n\n${state.selectedText}`,
      }

      try {
        const result = await window.ipc?.lmstudio.generateCompletion(prompts[action])

        const actionItem: ActionItem = {
          id: action,
          name: action,
          icon: 'info',
          enabled: true,
          isBuiltIn: true,
          selectedText: state.selectedText,
        }

        await window.ipc?.selection.processAction(actionItem, false)
        await window.ipc?.window.openResult({
          action: action as any,
          text: state.selectedText,
          result,
        })

        await window.ipc?.selection.hideToolbar()
      } catch (error) {
        console.error('Error:', error)
      }
    },
    [state.selectedText]
  )

  if (!state.visible) {
    console.log('[SelectionToolbar] Not visible, returning null')
    return null
  }

  console.log('[SelectionToolbar] Rendering widget, text:', state.selectedText.substring(0, 50))

  return (
    <SelectionWidget
      selectedText={state.selectedText}
      onCopy={async () => {
        await window.ipc?.selection.writeToClipboard(state.selectedText)
        await window.ipc?.selection.hideToolbar()
      }}
      onExplain={() => handleAction('explain')}
      onSummarize={() => handleAction('summarize')}
      onTranslate={() => handleAction('translate')}
    />
  )
}

const rootElement = document.getElementById('root') as HTMLElement
console.log('[selection-toolbar.tsx] Root element found:', !!rootElement)
if (rootElement) {
  console.log('[selection-toolbar.tsx] Root element HTML:', rootElement.outerHTML.substring(0, 100))
}

const root = ReactDOM.createRoot(rootElement)
console.log('[selection-toolbar.tsx] Creating React root')

root.render(
  <React.StrictMode>
    <SelectionToolbar />
  </React.StrictMode>
)

console.log('[selection-toolbar.tsx] React rendered')
