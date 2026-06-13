export type ModuleStatus = 'active' | 'legacy'

export interface ModuleConfig {
  id: string
  title: string
  description: string
  icon: string
  status: ModuleStatus
  route: string
  accentBg: string
  accentIcon: string
}

export const modules: ModuleConfig[] = [
  {
    id: 'meetings-import',
    title: 'Import meetings',
    description: 'Créez des rendez-vous en masse depuis un fichier Excel.',
    icon: 'CalendarDays',
    status: 'active',
    route: '/meetings-import',
    accentBg: '#EEEDFE',
    accentIcon: '#534AB7',
  },
]
