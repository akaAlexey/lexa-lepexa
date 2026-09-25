import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMockApi } from '../../api/mock/mockApi.ts'
import { createServices, ServicesProvider } from '../../app/services.tsx'
import { createDemoGeo } from '../../platform/demo/geo.ts'
import type { Platform } from '../../platform/types.ts'
import { createWebStorage } from '../../platform/web/storage.ts'
import { memory } from './deviceMemory.ts'
import { useDeviceMemory } from './useDeviceMemory.ts'

function setup(children: React.ReactNode) {
  const storage = createWebStorage(undefined)
  const platform: Platform = {
    geo: createDemoGeo({ lat: 52.97, lon: 36.07 }),
    notify: {
      permission: () => 'unsupported',
      requestPermission: async () => 'unsupported',
      show: () => undefined,
    },
    storage,
    share: { share: async () => 'copied' },
    ar: {
      openCamera: () => Promise.reject(new Error('не используется')),
      trackImage: async () => ({ stop: () => undefined }),
    },
  }
  const services = createServices(createMockApi({ latencyMs: 0, channelName: null }), platform)
  const utils = render(<ServicesProvider value={services}>{children}</ServicesProvider>)
  return { ...utils, storage, services }
}

function Joined({ testID }: { testID: string }) {
  const [ids, setIds] = useDeviceMemory(memory.joinedRequests)
  return (
    <button type="button" data-testid={testID} onClick={() => setIds((prev) => [...prev, 'R01'])}>
      {ids.join(',') || 'пусто'}
    </button>
  )
}

function Checklist({ tripId }: { tripId: string }) {
  const [checked] = useDeviceMemory(memory.checklist(tripId))
  return <p data-testid="checked">{checked.join(',') || 'пусто'}</p>
}

function Role() {
  const [role, setRole] = useDeviceMemory(memory.role)
  return (
    <button type="button" data-testid="role" onClick={() => setRole(undefined)}>
      {role ?? 'нет'}
    </button>
  )
}

describe('useDeviceMemory', () => {
  it('запись видна всем компонентам слота и сохраняется на устройстве', async () => {
    const { storage } = setup(
      <>
        <Joined testID="a" />
        <Joined testID="b" />
      </>,
    )
    await userEvent.click(screen.getByTestId('a'))
    expect(screen.getByTestId('a')).toHaveTextContent('R01')
    expect(screen.getByTestId('b')).toHaveTextContent('R01')
    expect(storage.get('search.joinedRequests')).toEqual(['R01'])
  })

  it('при смене id слота показывает значение нового слота', () => {
    const { storage, rerender, services } = setup(<Checklist tripId="W01" />)
    storage.set('checklist:W02', ['gloves'])
    expect(screen.getByTestId('checked')).toHaveTextContent('пусто')
    act(() =>
      rerender(
        <ServicesProvider value={services}>
          <Checklist tripId="W02" />
        </ServicesProvider>,
      ),
    )
    expect(screen.getByTestId('checked')).toHaveTextContent('gloves')
  })

  it('undefined забывает значение: в хранилище ничего не остаётся', async () => {
    const { storage } = setup(<Role />)
    storage.set('role', 'family')
    await userEvent.click(screen.getByTestId('role'))
    expect(storage.get('role')).toBeUndefined()
    expect(screen.getByTestId('role')).toHaveTextContent('нет')
  })
})
