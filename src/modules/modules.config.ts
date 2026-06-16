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
    accentBg: '#EAFDF9',
    accentIcon: '#20A599',
  },
  {
    id: 'campaign-creator',
    title: 'Création de campagnes',
    description: 'Générez des campagnes push en masse depuis les sessions d\'un événement.',
    icon: 'Megaphone',
    status: 'active',
    route: '/campaign-creator',
    accentBg: '#FEF3EE',
    accentIcon: '#B74A20',
  },
]
