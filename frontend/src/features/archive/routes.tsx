import type { RouteObject } from 'react-router'
import { patterns } from '../../functions/core/paths.ts'
import { SignedInOnly } from '../live-photo/SignedInOnly.tsx'
import { ArchiveScreen } from './ArchiveScreen.tsx'
import { NewStoryScreen } from './NewStoryScreen.tsx'
import { StoryScreen } from './StoryScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: patterns.archive, element: <ArchiveScreen /> },
  {
    path: patterns.newStory,
    element: (
      <SignedInOnly>
        <NewStoryScreen />
      </SignedInOnly>
    ),
  },
  { path: patterns.story, element: <StoryScreen /> },
]
