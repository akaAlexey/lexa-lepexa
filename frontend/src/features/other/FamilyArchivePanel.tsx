import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import type { FieldErrors } from '../../functions/core/form.ts'
import { familyFighter, otherSection, paths } from '../../functions/core/paths.ts'
import {
  fighterRelationLine,
  fighterSummary,
  fighterValues,
  fullName,
  recordSource,
  searchLinks,
  useFamilyArchive,
  type FamilyFighter,
  type FighterValues,
  type RecordValues,
} from '../../functions/familyArchive/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { TextAreaField, TextField } from '../../ui/Field.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import s from './other.module.css'

type Archive = ReturnType<typeof useFamilyArchive>

/**
 * Семейный архив (A7): список бойцов, форма и карточка бойца — по параметрам адреса
 * (`&fighter=new`, `&fighter=<id>`, `&edit=1`), у каждого экрана свой URL.
 */
export function FamilyArchivePanel({ owner }: { owner: string }) {
  const archive = useFamilyArchive(owner)
  const [params] = useSearchParams()
  const id = params.get('fighter')
  if (!id) return <FighterList fighters={archive.fighters} />
  if (id === 'new') return <FighterForm archive={archive} />
  const fighter = archive.fighters.find((f) => f.id === id)
  if (!fighter) return <MissingFighter />
  if (params.get('edit') === '1')
    return <FighterForm key={id} archive={archive} fighter={fighter} />
  return <FighterCard key={id} archive={archive} fighter={fighter} />
}

function FighterList({ fighters }: { fighters: readonly FamilyFighter[] }) {
  return (
    <div className={s.family}>
      <p>
        Запишите бойцов своей семьи и найдите их в «Памяти народа» и ОБД «Мемориал»: ссылки поиска
        откроются с уже подставленными именем и годом рождения. Найденные документы сохраните в
        карточке бойца.
      </p>
      {fighters.length > 0 ? (
        <ul className={s.familyList} aria-label="Бойцы семьи" data-testid="family-list">
          {fighters.map((f) => (
            <li key={f.id}>
              <Link
                to={familyFighter(f.id)}
                className={s.item}
                data-testid={`family-fighter-${f.id}`}
              >
                <span className={s.itemIcon}>
                  <Icon name="star" size={1.2} />
                </span>
                <span className={s.itemText}>
                  <span className={s.itemTitle}>{fullName(f)}</span>
                  <span className={s.itemHint}>{fighterSummary(f)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.muted} data-testid="family-empty">
          В архиве пока никого нет. Начните с того, кого помнят в семье.
        </p>
      )}
      <BigButton to={familyFighter('new')} icon="family" testID="family-add">
        Добавить бойца
      </BigButton>
      <p className={s.muted}>
        <Icon name="lock" size={1} /> Архив хранится только в этом браузере и никуда не
        отправляется.
      </p>
      <div className={s.links}>
        <Link to={paths.newStory()} className={s.secondary} data-testid="other-family-story">
          <Icon name="story" size={1.2} />
          Рассказать историю
        </Link>
      </div>
    </div>
  )
}

function FighterForm({ archive, fighter }: { archive: Archive; fighter?: FamilyFighter }) {
  const navigate = useNavigate()
  const [values, setValues] = useState<FighterValues>(() => fighterValues(fighter))
  const [errors, setErrors] = useState<FieldErrors>({})
  const set = (key: keyof FighterValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const result = archive.save(values, fighter?.id)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    void navigate(familyFighter(result.id), { replace: true })
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate data-testid="family-form">
      <h2>{fighter ? 'Изменить данные бойца' : 'Новый боец'}</h2>
      <p className={s.muted}>Обязательна только фамилия. Остальное можно дописать позже.</p>
      <TextField
        label="Фамилия *"
        value={values.lastName}
        onChange={set('lastName')}
        error={errors.lastName}
        maxLength={60}
        autoComplete="off"
        testID="family-last-name"
      />
      <TextField
        label="Имя"
        value={values.firstName}
        onChange={set('firstName')}
        error={errors.firstName}
        maxLength={60}
        autoComplete="off"
        testID="family-first-name"
      />
      <TextField
        label="Отчество"
        value={values.middleName}
        onChange={set('middleName')}
        error={errors.middleName}
        maxLength={60}
        autoComplete="off"
        testID="family-middle-name"
      />
      <TextField
        label="Год рождения"
        hint="Четыре цифры, например 1912. Если не знаете — оставьте пустым."
        value={values.birthYear}
        onChange={set('birthYear')}
        error={errors.birthYear}
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        testID="family-birth-year"
      />
      <TextField
        label="Кем приходится"
        hint="Например: прадед по маме"
        value={values.relation}
        onChange={set('relation')}
        error={errors.relation}
        maxLength={60}
        autoComplete="off"
        testID="family-relation"
      />
      <TextAreaField
        label="Что известно в семье"
        hint="Где служил, письма, награды, рассказы родных. До 1000 символов."
        value={values.note}
        onChange={set('note')}
        error={errors.note}
        rows={4}
        testID="family-note"
      />
      <BigButton onClick={() => submit()} icon="check" testID="family-save">
        Сохранить
      </BigButton>
      <div className={s.links}>
        <Link
          to={fighter ? familyFighter(fighter.id) : otherSection('archive')}
          className={s.secondary}
          data-testid="family-cancel"
        >
          Отмена
        </Link>
      </div>
    </form>
  )
}

const NEW_TAB = ' (откроется в новой вкладке)'

function FighterCard({ archive, fighter }: { archive: Archive; fighter: FamilyFighter }) {
  const navigate = useNavigate()
  const [record, setRecord] = useState<RecordValues>({ url: '', title: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [added, setAdded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const links = searchLinks(fighter)
  const relation = fighterRelationLine(fighter)
  const name = fullName(fighter)

  const setField = (key: keyof RecordValues) => (value: string) => {
    setRecord((prev) => ({ ...prev, [key]: value }))
    setAdded(false)
  }
  const addRecord = (event: FormEvent) => {
    event.preventDefault()
    const result = archive.addRecord(fighter.id, record)
    if (!result.ok) {
      setErrors(result.errors)
      setAdded(false)
      return
    }
    setErrors({})
    setRecord({ url: '', title: '' })
    setAdded(true)
  }
  const remove = () => {
    // сначала уходим к списку: иначе на миг мелькнёт «бойца нет в архиве»
    void navigate(otherSection('archive'), { replace: true })
    archive.remove(fighter.id)
  }

  return (
    <article className={s.family} aria-labelledby="family-card-name">
      <header className={s.familyHeader}>
        <h2 id="family-card-name" data-testid="family-card-name">
          {name}
        </h2>
        {relation && <p data-testid="family-card-relation">{relation}</p>}
        {fighter.note && (
          <p className={s.note} data-testid="family-card-note">
            {fighter.note}
          </p>
        )}
      </header>

      <section className={s.familyBlock} aria-labelledby="family-search-title">
        <h3 id="family-search-title">Искать в архивах</h3>
        <p className={s.muted}>
          Ссылки откроют поиск с подставленными фамилией, именем, отчеством и годом рождения. Нашли
          документ — скопируйте адрес его страницы и добавьте ниже.
        </p>
        <div className={s.links}>
          <a
            href={links.pamyat}
            target="_blank"
            rel="noopener noreferrer"
            className={s.secondary}
            data-testid="family-search-pamyat"
          >
            <Icon name="search" size={1.2} />
            Искать в «Памяти народа»
            <span className="visually-hidden">{NEW_TAB}</span>
          </a>
          <a
            href={links.obd}
            target="_blank"
            rel="noopener noreferrer"
            className={s.secondary}
            data-testid="family-search-obd"
          >
            <Icon name="search" size={1.2} />
            Искать в ОБД «Мемориал»
            <span className="visually-hidden">{NEW_TAB}</span>
          </a>
        </div>
      </section>

      <section className={s.familyBlock} aria-labelledby="family-records-title">
        <h3 id="family-records-title">Найденные записи</h3>
        {fighter.records.length > 0 ? (
          <ul className={s.records} data-testid="family-records">
            {fighter.records.map((r) => (
              <li key={r.id} className={s.record}>
                <span className={s.recordText}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.title}
                    <span className="visually-hidden">{NEW_TAB}</span>
                  </a>
                  <span className={s.muted}>{recordSource(r.url)?.title}</span>
                </span>
                <Button
                  onClick={() => {
                    archive.removeRecord(fighter.id, r.id)
                    setAdded(false)
                  }}
                  testID={`family-record-remove-${r.id}`}
                >
                  Убрать<span className="visually-hidden">: {r.title}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.muted} data-testid="family-records">
            Записей пока нет.
          </p>
        )}
        <form className={s.recordForm} onSubmit={addRecord} noValidate>
          <TextField
            label="Ссылка на страницу документа"
            hint="Только «Память народа», ОБД «Мемориал» или «Подвиг народа»"
            type="url"
            inputMode="url"
            value={record.url}
            onChange={setField('url')}
            error={errors.url}
            autoComplete="off"
            testID="family-record-url"
          />
          <TextField
            label="Подпись"
            hint="Например: донесение о потерях. Можно оставить пустой."
            value={record.title}
            onChange={setField('title')}
            error={errors.title}
            maxLength={120}
            autoComplete="off"
            testID="family-record-title"
          />
          <div className={s.links}>
            <Button type="submit" onClick={() => {}} icon="check" testID="family-record-add">
              Добавить запись
            </Button>
          </div>
          {added && (
            <Notice tone="success" testID="family-record-added">
              Запись добавлена.
            </Notice>
          )}
        </form>
      </section>

      <BigButton to={paths.newStory()} icon="story" testID="family-story">
        Рассказать историю о бойце
      </BigButton>

      <div className={s.links}>
        <Link
          to={familyFighter(fighter.id, true)}
          className={s.secondary}
          data-testid="family-edit"
        >
          Изменить
        </Link>
        {!confirming && (
          <Button onClick={() => setConfirming(true)} testID="family-remove">
            Удалить из архива
          </Button>
        )}
      </div>
      {confirming && (
        <div className={s.confirm} role="group" aria-labelledby="family-remove-question">
          <p id="family-remove-question">
            Удалить «{name}» и все найденные записи? Отменить это нельзя.
          </p>
          <div className={s.links}>
            <Button onClick={remove} testID="family-remove-confirm">
              Да, удалить
            </Button>
            <Button onClick={() => setConfirming(false)} testID="family-remove-cancel">
              Не удалять
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

function MissingFighter() {
  return (
    <div className={s.family}>
      <Notice tone="error" testID="family-missing">
        Такого бойца нет в архиве на этом устройстве: запись могли удалить или она сохранена в
        другом браузере.
      </Notice>
      <BigButton to={otherSection('archive')} icon="archive" testID="family-to-list">
        К семейному архиву
      </BigButton>
    </div>
  )
}
