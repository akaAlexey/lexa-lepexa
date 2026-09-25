import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '../../functions/core/paths.ts'
import { sentState, useTellStory } from '../../functions/stories/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { TextAreaField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './archive.module.css'

export function NewStoryScreen() {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const form = useTellStory((created) => navigate(paths.story(created.id), { state: sentState }))
  const { values, set, errors } = form

  return (
    <Screen
      title="Рассказать историю"
      lead="О человеке или месте. Краевед проверит факты, и история появится у всех"
      back={
        <BackLink to={paths.archive()} testID="back-link">
          К историям
        </BackLink>
      }
      testID="screen-new-story"
    >
      <form ref={formRef} className={s.form} onSubmit={form.submit} noValidate>
        <TextField
          label="Название истории"
          placeholder="Например: письмо прадеда с фронта"
          value={values.title}
          onChange={(v) => set('title', v)}
          error={errors.title}
          autoComplete="off"
          testID="story-title"
        />
        <TextField
          label="Место события"
          hint="Населённый пункт или район"
          value={values.place}
          onChange={(v) => set('place', v)}
          error={errors.place}
          autoComplete="off"
          testID="story-place"
        />
        <TextAreaField
          label="Расскажите историю"
          hint="Что произошло, с кем и когда"
          value={values.story}
          onChange={(v) => set('story', v)}
          error={errors.story}
          rows={6}
          testID="story-body"
        />
        <TextField
          label="Источник, если есть"
          hint="Семейный архив, письмо, документ, книга. Без источника краевед попросит уточнить"
          value={values.sourceText}
          onChange={(v) => set('sourceText', v)}
          autoComplete="off"
          testID="story-source"
        />
        <TextField
          label="Как подписать историю"
          hint="Имя или «Семья Петровых». Контакты не публикуются"
          value={values.author}
          onChange={(v) => set('author', v)}
          error={errors.author}
          autoComplete="name"
          testID="story-author"
        />
        {form.failed && (
          <Notice tone="error" testID="story-error">
            Не удалось отправить историю. Проверьте связь и попробуйте ещё раз.
          </Notice>
        )}
        <BigButton
          onClick={() => formRef.current?.requestSubmit()}
          disabled={form.sending}
          icon="story"
          testID="story-send"
        >
          Отправить на проверку
        </BigButton>
      </form>
    </Screen>
  )
}
