import { ChartColumn, FileText, House, Layers, List, Shield, Users } from 'lucide-react'

export const ADMIN_PAGES = [
  {
    to: '/admin',
    label: 'Bosh panel',
    description: 'Bugungi testlar holati',
    icon: House,
    stage: 6,
  },
  {
    to: '/admin/savollar',
    label: 'Savollar banki',
    description: 'Savollarni kiritish, tahrirlash va import qilish',
    icon: List,
    stage: 2,
  },
  {
    to: '/admin/toplamlar',
    label: "Savol to'plamlari",
    description: 'Qaysi savollar qaysi guruhga tushishini belgilaydi',
    icon: Layers,
    stage: 2,
  },
  {
    to: '/admin/guruhlar',
    label: 'Guruhlar',
    description: 'Test topshiradigan guruhlar va ularning holati',
    icon: Users,
    stage: 3,
  },
  {
    to: '/admin/natijalar',
    label: 'Natijalar',
    description: 'Natijalar va shubhali urinishlar',
    icon: ChartColumn,
    stage: 6,
  },
]

export const SUPERADMIN_PAGES = [
  {
    to: '/admin/adminlar',
    label: 'Adminlar',
    description: "Adminlarni qo'shish va ularning login-parolini boshqarish faqat superadmin uchun",
    icon: Shield,
    stage: 1,
  },
  {
    to: '/admin/jurnal',
    label: 'Amallar jurnali',
    description: "Kim, qachon, nima qildi — o'zgartirib bo'lmaydigan yozuvlar",
    icon: FileText,
    stage: 1,
  },
]
