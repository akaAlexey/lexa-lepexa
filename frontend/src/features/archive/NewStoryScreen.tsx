import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useApi } from '../../app/services.tsx'
import type { ArchiveStory } from '../../contract/schemas.ts'
import { validateStory, type StoryErrors } from '../../domain/archive.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { TextAreaField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './archive.module.css'
import { qk, storyUrl, useMyStories } from './stories.ts'

/** Состояние перехода к истории после отправки — показать «Отправлено на проверку». */
export interface StorySentState {
  sent: true
}

export function NewStoryScreen() {
  const api = useApi()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mine = useMyStories()
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [story, setStory] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [author, setAuthor] = useState('')
  const [errors, setErrors] = useState<StoryErrors>({})
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [attempt, setAttempt] = useState(0)

  // После неудачной проверки фокус — на первое поле с ошибкой.
  useEffect(() => {
    if (attempt > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempt])

  const send = async () => {
    const found = validateStory({ title, place, story, author })
    setErrors(found)
    setFailed(false)
    if (Object.keys(found).length > 0) {
      setAttempt((a) => a + 1)
      return
    }
    setSending(true)
    try {
      const created = await api.createStory({
        body: {
          title: title.trim(),
          place: place.trim(),
          story: story.trim(),
          sourceText: sourceText.trim(),
          author: author.trim(),
        },
      })
      mine.add(created.id)
      queryClient.setQueryData<ArchiveStory[]>(qk.stories, (old) => [created, ...(old ?? [])])
      queryClient.setQueryData(qk.story(created.id), created)
      navigate(storyUrl(created.id), { state: { sent: true } satisfies StorySentState })
    } catch {
      setFailed(true)
      setSending(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send()
  }

  return (
    <Screen
      title="Рассказать историю"
      lead="О человеке или месте. Краевед проверит факты, и история появится у всех"
      testID="screen-new-story"
    >
      <form ref={formRef} className={s.form} onSubmit={onSubmit} noValidate>
        <TextField
          label="Название истории"
          placeholder="Например: письмо прадеда с фронта"
          value={title}
          onChange={setTitle}
          error={errors.title}
          autoComplete="off"
          testID="story-title"
        />
        <TextField
          label="Место события"
          hint="Населённый пункт или район"
          value={place}
          onChange={setPlace}
          error={errors.place}
          autoComplete="off"
          testID="story-place"
        />
        <TextAreaField
          label="Расскажите историю"
          hint="Что произошло, с кем и когда"
          value={story}
          onChange={setStory}
          error={errors.story}
          rows={6}
          testID="story-body"
        />
        <TextField
          label="Источник, если есть"
          hint="Семейный архив, письмо, документ, книга. Без источника краевед попросит уточнить"
          value={sourceText}
          onChange={setSourceText}
          autoComplete="off"
          testID="story-source"
        />
        <TextField
          label="Как подписать историю"
          hint="Имя или «Семья Петровых». Контакты не публикуются"
          value={author}
          onChange={setAuthor}
          error={errors.author}
          autoComplete="name"
          testID="story-author"
        />
        {failed && (
          <Notice tone="error" testID="story-error">
            Не удалось отправить историю. Проверьте связь и попробуйте ещё раз.
          </Notice>
        )}
        <BigButton onClick={() => void send()} disabled={sending} icon="story" testID="story-send">
          Отправить на проверку
        </BigButton>
      </form>
    </Screen>
  )
}
