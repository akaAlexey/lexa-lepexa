import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { AboutScreen, PrivacyScreen, TermsScreen } from './LegalScreens.tsx'
import { OtherScreen } from './OtherScreen.tsx'

export const routes: RouteObject[] = [
  { path: patterns.other.slice(1), element: <OtherScreen /> },
  { path: patterns.about.slice(1), element: <AboutScreen /> },
  { path: patterns.privacy.slice(1), element: <PrivacyScreen /> },
  { path: patterns.terms.slice(1), element: <TermsScreen /> },
]
