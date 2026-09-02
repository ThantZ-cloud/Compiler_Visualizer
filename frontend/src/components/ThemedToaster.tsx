import { Toaster } from 'sonner'
import { useTheme } from '../context/ThemeContext'

export default function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return <Toaster position="bottom-right" theme={resolvedTheme} />
}
