# AGENTS.md - Eventmaker Toolkit

Guide de reference pour les agents IA qui travaillent sur ce repo.
Mis a jour a chaque ajout de module ou modification structurelle.

Avant d'ajouter ou modifier un module, lire et appliquer `docs/module-development-rules.md`.

## Stack

Depuis `package.json`:

- React `^18.3.1`
- React DOM `^18.3.1`
- Vite `^8.0.16`
- TypeScript `~5.7.2`
- Tailwind CSS `^3.4.17`
- shadcn/ui-like local primitives in `src/components/ui/`
- `react-router-dom` `^6.28.0`
- `lucide-react` `^0.475.0`
- Excel read: `read-excel-file` `^9.2.0`
- Excel write: `write-excel-file` `^4.1.1`
- ESLint `^9.17.0`

## Audit rapide de l'existant

### Auth & session

- Le token Eventmaker est stocke en `sessionStorage` sous la cle `em_token` dans `src/lib/storage.ts:3`.
- Lecture du token: `getSessionToken()` retourne `sessionStorage.getItem(TOKEN_KEY)` dans `src/lib/storage.ts:8`.
- Ecriture du token: `setSessionToken(token)` fait `sessionStorage.setItem(TOKEN_KEY, token)` dans `src/lib/storage.ts:12`.
- `apiFetch<T>(path: string, options?: RequestInit): Promise<T>` est defini dans `src/lib/api.ts:26`.
- `apiFetch` lit le token via `getToken()` dans `src/lib/api.ts:20`, construit l'URL proxy dans `buildApiUrl()` (`src/lib/api.ts:57`), puis appelle `fetch(url, options)` (`src/lib/api.ts:31`).
- `apiFetch` supporte GET par defaut, et POST via `options.method = 'POST'`; exemple POST dans `src/modules/meetings-import/steps/ExecutionStep.tsx:214`.
- Les erreurs reseau ou pre-reponse sont converties en `ApiError` dans `src/lib/api.ts:31`.
- Les reponses HTTP non-OK produisent `ApiError("API error <status>")` avec `status`, `contentType`, `bodyPreview`, `retryAfter`, `url` dans `src/lib/api.ts:75`.
- Les erreurs sont affichees dans l'UI via un etat `error` et le composant `Alert`, par exemple auth dans `src/components/AuthGate.tsx:27` et `src/components/AuthGate.tsx:67`, event/slots dans `src/modules/meetings-import/hooks/useEventData.ts:22`, validation dans `src/modules/meetings-import/index.tsx:78`, execution dans `src/modules/meetings-import/steps/ExecutionStep.tsx:93`.
- Il n'existe pas de systeme de Toast global. Les "toasts d'erreur" ne sont pas implementes; utiliser `Alert` tant qu'un composant Toast n'existe pas.

### Structure des modules

- `src/modules/modules.config.ts` exporte `ModuleStatus = 'active' | 'legacy'`, `ModuleConfig`, et `modules`.
- Champs d'un module: `id`, `title`, `description`, `icon`, `status`, `route`, `accentBg`, `accentIcon` dans `src/modules/modules.config.ts:3`.
- `App.tsx` importe `modules` et les composants de module (`src/App.tsx:6`) puis declare manuellement les routes dans `<Routes>` (`src/App.tsx:68`).
- La home separe `activeModules` et `legacyModules` dans `src/App.tsx:13`.
- Le badge `Last` est calcule avec `module.id === lastModuleId` dans `src/App.tsx:25`, affiche dans `ModuleCard` si `isLast` dans `src/components/ModuleCard.tsx:42`, et mis a jour par le callback de route `onImportComplete={() => setLastModuleId('meetings-import')}` dans `src/App.tsx:70`.

### Composants partages

- `EventSelector.tsx` existe, mais il est local a `meetings-import`: `src/modules/meetings-import/steps/EventSelector.tsx`.
- Interface de `EventSelector`: `{ loading: boolean; error: string | null; onSubmit: (eventId: string) => Promise<void> }` dans `src/modules/meetings-import/steps/EventSelector.tsx:5`.
- `useMapping.ts` existe, mais il est local a `meetings-import`: `src/modules/meetings-import/hooks/useMapping.ts`.
- Interface de `useMapping`: `sourceItems`, `targetItems`, `matchFn`, `sourceLabelFn`, `targetLabelFn`, `targetKeyFn`, `initialMappings?`, `onMappingsChange?`, `threshold?` dans `src/modules/meetings-import/hooks/useMapping.ts:4`.
- Retour de `useMapping`: `{ mappings, setManualMapping, isComplete, targetKeyFn }` dans `src/modules/meetings-import/hooks/useMapping.ts:90`.
- Composants globaux dans `src/components/`: `AuthGate`, `CommandPalette`, `Layout`, `ModuleCard`.
- Primitives UI dans `src/components/ui/`: `Alert`, `Button`, `Dialog`, `Input`.
- Il n'y a pas de dossier global `src/hooks/` actuellement.

### Design system

- Variables globales CSS: `:root` definit couleur texte `#1a1a1a`, background `#f8f7f4`, font Inter et rendu antialias dans `src/index.css:7`.
- `body` impose `min-width: 320px`, `min-height: 100vh`, `background: #f8f7f4` dans `src/index.css:21`.
- Tailwind etend seulement `fontFamily.sans` et `fontFamily.mono` dans `tailwind.config.js:5`.
- Les couleurs sont majoritairement codees directement dans les classes Tailwind arbitraires (`#1A1A1A`, `#6B6B6B`, `#E8E4DE`, `#F8F7F4`, `#20A599`, etc.).
- Le stepper de `meetings-import` est une fonction locale `Stepper({ currentStep })` dans `src/modules/meetings-import/index.tsx:170`; il lit le tableau local `steps` dans `src/modules/meetings-import/index.tsx:19`. Il est generisable en composant partage si un deuxieme module a un workflow multi-etapes.
- Les erreurs sont declenchees par `setError(...)` puis affichees avec `<Alert>`. Aucun Toast n'est declenche.

### Excel

- Le projet n'utilise pas SheetJS directement.
- Lecture Excel: `parseExcel(file: File): Promise<ParsedExcel>` utilise `readSheet(file)` de `read-excel-file/browser` dans `src/modules/meetings-import/lib/parseExcel.ts:1`.
- Export Excel: `downloadReport(results: ExecutionResult[])` construit une `Row[]`, puis appelle `writeXlsxFile(sheet, { sheet: 'Rapport' }).toFile('meetings-import-report.xlsx')` dans `src/modules/meetings-import/steps/ExecutionStep.tsx:270`.

## Auth

Utiliser uniquement `apiFetch` pour appeler Eventmaker depuis les modules.

```ts
import { apiFetch, ApiError } from '../../lib/api'

const data = await apiFetch<MyResponse>(`/events/${encodeURIComponent(eventId)}.json`)
```

Pour un POST:

```ts
await apiFetch<MyResponse>(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
```

Regles:

- Ne jamais appeler `https://app.eventmaker.io` directement depuis le navigateur.
- En dev, `apiFetch` utilise `/api/eventmaker-dev` puis le proxy Vite vers `/api/v1` (`vite.config.ts:8`).
- En production, `apiFetch` utilise `/api/eventmaker?path=...` et la fonction Vercel `api/eventmaker.js`.
- Afficher les erreurs API avec au moins `status`, endpoint ou `url`, et extrait de body (`bodyPreview`) quand disponible.
- Capturer `ApiError` pour enrichir le message utilisateur.

## Ajouter un module

1. Lire `docs/module-development-rules.md`.
2. Creer `src/modules/<module-id>/`.
3. Ajouter un composant d'entree `src/modules/<module-id>/index.tsx`.
4. Placer la logique metier dans `lib/`, les hooks dans `hooks/`, les ecrans/etapes dans `steps/`, et les types dans `types.ts` si le module est complexe.
5. Reutiliser `src/lib/api.ts`, `src/components/ui/*`, et les helpers existants avant de creer de nouveaux utilitaires.
6. Enregistrer le module dans `src/modules/modules.config.ts` avec un objet `ModuleConfig`.
7. Si l'icone est nouvelle, l'importer et l'ajouter au mapping `icons` dans `src/components/ModuleCard.tsx` et `src/components/CommandPalette.tsx`.
8. Importer le composant du module dans `src/App.tsx`.
9. Ajouter une route explicite dans `<Routes>` et passer un callback qui met a jour `lastModuleId` quand le module termine une action significative.
10. Ajouter les endpoints Eventmaker utilises dans la section "Endpoints Eventmaker documentes" de ce fichier.
11. Lancer `npm run build` avant de livrer.

Config demandee pour `campaign-creator`:

```ts
{
  id: 'campaign-creator',
  title: 'Création de campagnes',
  description: 'Générez des campagnes push en masse depuis les sessions d\'un événement.',
  icon: 'Megaphone',
  status: 'active',
  route: '/campaign-creator',
  accentBg: '#FEF3EE',
  accentIcon: '#B74A20',
}
```

## Composants et hooks reutilisables

### `src/lib/api.ts`

- `ApiError extends Error`: contient `details?: { status?: number; contentType?: string | null; bodyPreview?: string; retryAfter?: string | null; url?: string }`.
- `apiFetch<T>(path: string, options?: RequestInit): Promise<T>`.
- `verifyToken(token: string): Promise<EventmakerUser>`.
- `EventmakerUser`: `{ id: string; email: string; first_name: string; last_name: string }`.
- Gestion d'erreur: `readJsonResponse()` parse toujours le body texte; non-OK ou JSON invalide => `ApiError`.

### `src/lib/storage.ts`

- `getSessionToken(): string | null`
- `setSessionToken(token: string): void`
- `getSessionUser(): SessionUser | null`
- `setSessionUser(user: SessionUser): void`
- `SessionUser = Pick<EventmakerUser, 'id' | 'email' | 'first_name' | 'last_name'>`

### `src/components/ui/Button.tsx`

- Props: `ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }`.
- Type par defaut: `button`.

### `src/components/ui/Input.tsx`

- Props: `InputHTMLAttributes<HTMLInputElement>`.

### `src/components/ui/Alert.tsx`

- Props: `HTMLAttributes<HTMLDivElement>`.
- Rend un `<div role="alert">`.

### `src/components/ui/Dialog.tsx`

- `Dialog({ open, onOpenChange, children })`.
- `DialogContent({ children, className?, onInteractOutside? })`.
- Gestion simple du focus a l'ouverture; pas de dependance externe.

### `src/modules/meetings-import/steps/EventSelector.tsx`

Composant local reutilisable si generalise ou importe avec prudence:

```ts
interface EventSelectorProps {
  loading: boolean
  error: string | null
  onSubmit: (eventId: string) => Promise<void>
}
```

Usage:

```tsx
<EventSelector loading={loading} error={error} onSubmit={handleEventSubmit} />
```

Attention: le titre et le texte sont actuellement specifiques a "Import meetings".

### `src/modules/meetings-import/hooks/useMapping.ts`

Interface:

```ts
interface UseMappingOptions<TSource, TTarget> {
  sourceItems: TSource[]
  targetItems: TTarget[]
  matchFn: (source: TSource, target: TTarget) => number
  sourceLabelFn: (source: TSource) => string
  targetLabelFn: (target: TTarget) => string
  targetKeyFn: (target: TTarget) => string
  initialMappings?: MappingEntry<TTarget>[]
  onMappingsChange?: (mappings: MappingEntry<TTarget>[]) => void
  threshold?: number
}
```

Retour:

```ts
{
  mappings: MappingEntry<TTarget>[]
  setManualMapping: (sourceLabel: string, target: TTarget) => void
  isComplete: boolean
  targetKeyFn: (target: TTarget) => string
}
```

Exemple:

```ts
const mapping = useMapping<string, EventmakerLocation>({
  sourceItems: uniqueLocations,
  targetItems: locations,
  matchFn: (source, target) => textMatchScore(source, target.name),
  sourceLabelFn: (source) => source,
  targetLabelFn: (target) => target.name,
  targetKeyFn: (target) => target.id,
  initialMappings: locationMappings,
  onMappingsChange: setLocationMappings,
})
```

### Export Excel

Fonction locale actuelle: `downloadReport(results: ExecutionResult[])` dans `src/modules/meetings-import/steps/ExecutionStep.tsx`.

- Parametre: `ExecutionResult[]`.
- Colonnes: `ligne`, `validation_status`, `execution_status`, `meeting_id`, `error`, `payload`, `idempotency_key`.
- Fichier: `meetings-import-report.xlsx`.
- Librairie: `write-excel-file/browser`.
- Le module `campaign-creator` a aussi un export local `downloadReport(results: ExecutionResult[])` dans `src/modules/campaign-creator/steps/ExecutionStep.tsx`, avec le fichier `campaign-creator-report.xlsx`.

Pour un nouveau module, extraire une fonction partagee seulement si deux modules ont le meme besoin.

### Stepper

Stepper actuel local:

```ts
function Stepper({ currentStep }: { currentStep: number })
```

Il depend du tableau local:

```ts
const steps = ['Evenement', 'Excel', 'Mapping', 'Validation', 'Execution']
```

Pour generaliser, creer par exemple `src/components/Stepper.tsx` avec `steps: string[]`, `currentStep: number`, et reprendre les classes du composant local.

## Conventions

- Nommage: dossiers de modules en kebab-case (`meetings-import`, `campaign-creator`); composants React en PascalCase; hooks en `useSomething.ts`; helpers purs dans `lib/`.
- Structure recommandee d'un module complexe:
  - `index.tsx`: orchestration des etapes et etat principal
  - `types.ts`: contrats TypeScript du module
  - `hooks/`: chargements Eventmaker et etats asynchrones
  - `steps/`: ecrans du workflow
  - `lib/`: parsing, normalisation, payloads, idempotence
- Etats de chargement: etats locaux `loading`/`running`, skeletons simples (`animate-pulse`) ou bouton disabled avec libelle en cours.
- Erreurs API: `try/catch`, `console.error` avec contexte technique, `setError` avec message utilisateur, affichage via `Alert`.
- Normaliser les reponses API a la frontiere des hooks avant de les donner a l'UI.
- Ne pas inventer d'ID Eventmaker persistants. Si un objet n'a pas d'id utilisable, bloquer l'execution.
- Proteger les effets d'auto-execution contre le double appel React StrictMode avec un `useRef`, comme `autoStartLaunchedRef`.

## Modules existants

### meetings-import

- Titre: `Import meetings`
- Route: `/meetings-import`
- Statut: `active`
- Entree: `src/modules/meetings-import/index.tsx`
- Workflow: `Evenement -> Excel -> Mapping -> Validation -> Execution`
- Endpoints:
  - `GET /events/:eventId.json`
  - `GET /events/:eventId/meetings/slots.json?locale=fr`
  - `GET /events/:eventId/guests.json?uid=:uid&documents=false&guest_metadata=false`
  - `POST /events/:eventId/meetings/book_by_organizer.json?locale=fr`
- Hooks propres:
  - `useEventData()`: charge event, lieux, slots.
  - `useGuestResolver(eventId)`: resolution UID -> guest avec cache et concurrence 5.
  - `useMapping(...)`: matching automatique + mapping manuel.
- Libs propres:
  - `parseExcel(file)`
  - `buildMatrix(params)`
  - `buildMeetingPayload(params)`
  - `buildIdempotencyKey(params)` et guards pending/created
  - `buildSlotSource`, `formatSlot`, `scoreSlotMatch`
  - `normalizeText`, `textMatchScore`
- Export: rapport Excel d'execution via `write-excel-file`.

### campaign-creator

- Titre: `Création de campagnes`
- Route: `/campaign-creator`
- Statut: `active`
- Entree: `src/modules/campaign-creator/index.tsx`
- Workflow: `Événement -> Configuration -> Dry-run -> Exécution`
- Endpoints:
  - `GET /events/:eventId/accesspoints.json?exclude_exit_accesspoint=true`
  - `GET /events/:eventId/saved_searches.json?locale=fr`
  - `POST /fr/events/:eventId/saved_searches.json?locale=fr`
  - `POST /events/:eventId/guest_campaigns.json?locale=fr`
  - `GET /events/:eventId/guest_campaigns/:campaignId/deliver.json?locale=fr`
- Hooks propres:
  - `useSessionData()`: charge sessions de type `session`, segments existants, et clés de traits.
  - `useCampaignDryRun(...)`: construit la matrice de campagnes sans POST.
- Libs propres:
  - `resolveTemplate(template, session)`
  - `buildSegmentName(sessionName, prefix)`, `getSavedPrefix()`, `savePrefix(prefix)`
  - `buildSegmentPayload(session, segmentName)`
  - `buildCampaignPayload(params)`
- Export: rapport Excel d'execution via `write-excel-file`.

## Endpoints Eventmaker documentes

Tous les endpoints sont relatifs a `/api/v1` cote Eventmaker et doivent passer par `apiFetch`.

| Methode | Route | Usage | Source |
| --- | --- | --- | --- |
| GET | `/me.json` | Verification du token et recuperation utilisateur | `src/lib/api.ts:51` |
| GET | `/events/:eventId.json` | Charger l'evenement et les `meeting_locations` | `src/modules/meetings-import/hooks/useEventData.ts:17` |
| GET | `/events/:eventId/meetings/slots.json?locale=fr` | Charger les creneaux de rendez-vous | `src/modules/meetings-import/hooks/useEventData.ts:36` |
| GET | `/events/:eventId/guests.json?uid=:uid&documents=false&guest_metadata=false` | Resoudre un guest par UID | `src/modules/meetings-import/hooks/useGuestResolver.ts:45` |
| POST | `/events/:eventId/meetings/book_by_organizer.json?locale=fr` | Creer un rendez-vous en tant qu'organisateur | `src/modules/meetings-import/steps/ExecutionStep.tsx:177` |
| GET | `/events/:eventId/accesspoints.json?exclude_exit_accesspoint=true` | Charger les accesspoints puis filtrer `type === "session"` | `src/modules/campaign-creator/hooks/useSessionData.ts` |
| GET | `/events/:eventId/saved_searches.json?locale=fr` | Charger les segments existants | `src/modules/campaign-creator/hooks/useSessionData.ts` |
| POST | `/fr/events/:eventId/saved_searches.json?locale=fr` | Creer un segment de campagne si absent | `src/modules/campaign-creator/steps/ExecutionStep.tsx` |
| POST | `/events/:eventId/guest_campaigns.json?locale=fr` | Creer une campagne push en brouillon | `src/modules/campaign-creator/steps/ExecutionStep.tsx` |
| GET | `/events/:eventId/guest_campaigns/:campaignId/deliver.json?locale=fr` | Livrer immediatement une campagne creee en draft | `src/modules/campaign-creator/steps/ExecutionStep.tsx` |

## Proxy Eventmaker

- Dev: Vite proxy `/api/eventmaker-dev` vers `https://app.eventmaker.io/api/v1`, avec `followRedirects: true`.
- Prod: Vercel Function `api/eventmaker.js`.
- Le proxy prod preserve methode et body pour les redirects `307`/`308`; pour `301`/`302`/`303`, il bascule en GET.
- Maximum redirects prod: 5.
