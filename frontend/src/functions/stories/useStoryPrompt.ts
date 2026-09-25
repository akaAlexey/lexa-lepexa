import { memory } from '../core/deviceMemory.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'

/** Окно-предложение «Рассказать историю»: показано, пока его не закрыли на этом устройстве. */
export function useStoryPrompt(): { shown: boolean; close: () => void } {
  const [closed, setClosed] = useDeviceMemory(memory.storyPromptClosed)
  return { shown: !closed, close: () => setClosed(true) }
}
