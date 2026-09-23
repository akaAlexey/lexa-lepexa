import type { RouteObject } from 'react-router'
import { ArchiveScreen } from './ArchiveScreen.tsx'
import { NewStoryScreen } from './NewStoryScreen.tsx'
import { StoryScreen } from './StoryScreen.tsx'

/** Маршруты модуля. Новые экраны модуля добавляются только сюда. */
export const routes: RouteObject[] = [
  { path: 'archive', element: <ArchiveScreen /> },
  { path: 'archive/new', element: <NewStoryScreen /> },
  { path: 'archive/:storyId', element: <StoryScreen /> },
]
