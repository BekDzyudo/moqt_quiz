import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../store/theme.js'
import Button from './Button.jsx'

export default function ThemeToggle({ size = 'sm', className = '' }) {
  const dark = useTheme((state) => state.dark)
  const toggle = useTheme((state) => state.toggle)

  return (
    <Button
      variant="secondary"
      size={size}
      icon={dark ? Sun : Moon}
      aria-label={dark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
      className={`shrink-0 ${className}`}
      onClick={toggle}
    />
  )
}
