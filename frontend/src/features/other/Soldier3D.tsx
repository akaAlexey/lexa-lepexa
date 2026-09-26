import { useEffect, useRef, useState } from 'react'
import s from './other.module.css'

/**
 * 3D-модель бойца Красной армии (1943): каска со звездой, гимнастёрка, ремень, галифе, сапоги,
 * ППШ. Собрана из простых фигур three.js — без сторонних файлов моделей. Прозрачный фон: в AR-режиме
 * модель стоит поверх изображения с камеры. Сама медленно поворачивается (кроме «меньше движения»),
 * пальцем или мышью её можно повернуть.
 *
 * three.js подгружается только здесь: на остальных экранах сайт его не качает.
 */
export function Soldier3D({ testID = 'soldier-3d' }: { testID?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let disposed = false
    let cleanup = () => undefined as void

    void import('three')
      .then((THREE) => {
        if (disposed) return
        let renderer: InstanceType<typeof THREE.WebGLRenderer>
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        } catch {
          setFailed(true)
          return
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setClearColor(0x000000, 0)
        el.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
        camera.position.set(0, 1.05, 5.2)
        camera.lookAt(0, 0.95, 0)
        scene.add(new THREE.HemisphereLight(0xfff4dc, 0x3a3326, 1.6))
        const sun = new THREE.DirectionalLight(0xffffff, 1.8)
        sun.position.set(2, 4, 3)
        scene.add(sun)

        const mat = (color: number, roughness = 0.85) =>
          new THREE.MeshStandardMaterial({ color, roughness, flatShading: true })
        const olive = mat(0x6b6a3a)
        const darkOlive = mat(0x4f4d2c)
        const helmetMat = mat(0x46552b, 0.6)
        const skin = mat(0xd6a27c)
        const black = mat(0x1e1b18, 0.5)
        const leather = mat(0x5a3a1f, 0.7)
        const metal = mat(0x2b2b2b, 0.4)
        const wood = mat(0x7a4a24, 0.8)
        const red = mat(0xc8261c, 0.5)

        const soldier = new THREE.Group()
        const part = (
          geometry: ConstructorParameters<typeof THREE.Mesh>[0],
          material: InstanceType<typeof THREE.Material>,
          x: number,
          y: number,
          z = 0,
          rotZ = 0,
          rotX = 0,
        ) => {
          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.set(x, y, z)
          mesh.rotation.set(rotX, 0, rotZ)
          soldier.add(mesh)
          return mesh
        }
        const cyl = (top: number, bottom: number, h: number, seg = 10) =>
          new THREE.CylinderGeometry(top, bottom, h, seg)

        // Сапоги и галифе
        for (const side of [-1, 1]) {
          part(cyl(0.11, 0.12, 0.42), black, side * 0.14, 0.21)
          part(new THREE.BoxGeometry(0.2, 0.08, 0.3), black, side * 0.14, 0.04, 0.05)
          part(cyl(0.16, 0.11, 0.5), darkOlive, side * 0.14, 0.66)
        }
        // Гимнастёрка, ремень с пряжкой, подсумки
        part(cyl(0.3, 0.33, 0.78, 12), olive, 0, 1.25)
        part(cyl(0.335, 0.335, 0.08, 12), leather, 0, 0.93)
        part(new THREE.BoxGeometry(0.1, 0.07, 0.04), metal, 0, 0.93, 0.33)
        for (const side of [-1, 1])
          part(new THREE.BoxGeometry(0.12, 0.12, 0.08), leather, side * 0.2, 0.9, 0.28)
        // Скатка шинели через плечо
        part(new THREE.TorusGeometry(0.34, 0.06, 8, 18), darkOlive, 0, 1.3, 0, 0.75)
        // Руки: правая держит автомат, левая поддерживает
        part(cyl(0.075, 0.07, 0.62), olive, -0.36, 1.2, 0.08, 0.35, -0.5)
        part(cyl(0.075, 0.07, 0.62), olive, 0.36, 1.18, 0.12, -0.25, -0.9)
        part(new THREE.SphereGeometry(0.065, 8, 8), skin, -0.44, 0.98, 0.3)
        part(new THREE.SphereGeometry(0.065, 8, 8), skin, 0.3, 1.0, 0.42)
        // Голова, шея, каска с козырьком и звездой
        part(cyl(0.07, 0.08, 0.1), skin, 0, 1.68)
        part(new THREE.SphereGeometry(0.16, 14, 12), skin, 0, 1.84)
        const helmet = part(
          new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
          helmetMat,
          0,
          1.88,
        )
        helmet.scale.set(1, 0.95, 1.05)
        part(cyl(0.225, 0.235, 0.025, 16), helmetMat, 0, 1.88)
        const star = part(new THREE.CircleGeometry(0.05, 5), red, 0, 2.0, 0.18)
        star.rotation.x = -0.35
        // ППШ: приклад, ствол в кожухе, диск
        const gun = new THREE.Group()
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.34), wood)
        stock.position.z = -0.2
        gun.add(stock)
        gun.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.3), metal))
        const barrel = new THREE.Mesh(cyl(0.035, 0.035, 0.34), metal)
        barrel.rotation.x = Math.PI / 2
        barrel.position.z = 0.3
        gun.add(barrel)
        const drum = new THREE.Mesh(cyl(0.11, 0.11, 0.06, 16), metal)
        drum.rotation.z = Math.PI / 2
        drum.position.set(0, -0.1, 0.05)
        gun.add(drum)
        gun.position.set(-0.05, 1.02, 0.36)
        gun.rotation.set(0.15, 0.55, 0.35)
        soldier.add(gun)
        scene.add(soldier)

        // Тень под ногами
        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(0.45, 24),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
        )
        shadow.rotation.x = -Math.PI / 2
        shadow.position.y = 0.001
        scene.add(shadow)

        const resize = () => {
          const w = el.clientWidth || 280
          const h = el.clientHeight || 360
          renderer.setSize(w, h, false)
          camera.aspect = w / h
          camera.updateProjectionMatrix()
        }
        resize()
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
        observer?.observe(el)

        // Поворот пальцем или мышью; сам медленно вращается, если не «меньше движения»
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        let dragX: number | undefined
        let spin = 0.6
        const down = (e: PointerEvent) => {
          dragX = e.clientX
          renderer.domElement.setPointerCapture?.(e.pointerId)
        }
        const move = (e: PointerEvent) => {
          if (dragX === undefined) return
          soldier.rotation.y += (e.clientX - dragX) * 0.01
          dragX = e.clientX
        }
        const up = () => {
          dragX = undefined
        }
        renderer.domElement.addEventListener('pointerdown', down)
        renderer.domElement.addEventListener('pointermove', move)
        renderer.domElement.addEventListener('pointerup', up)
        renderer.domElement.addEventListener('pointercancel', up)

        let frame = 0
        let last = performance.now()
        const tick = (now: number) => {
          const dt = Math.min(0.05, (now - last) / 1000)
          last = now
          if (!reduce && dragX === undefined) soldier.rotation.y += spin * dt
          renderer.render(scene, camera)
          frame = requestAnimationFrame(tick)
        }
        if (reduce) {
          spin = 0
          soldier.rotation.y = -0.4
        }
        frame = requestAnimationFrame(tick)

        cleanup = () => {
          cancelAnimationFrame(frame)
          observer?.disconnect()
          scene.traverse((o) => {
            const mesh = o as InstanceType<typeof THREE.Mesh>
            mesh.geometry?.dispose()
            const m = mesh.material as InstanceType<typeof THREE.Material> | undefined
            m?.dispose?.()
          })
          renderer.dispose()
          renderer.domElement.remove()
        }
      })
      .catch((error: unknown) => {
        console.warn('3D-модель бойца не показана:', error)
        if (!disposed) setFailed(true)
      })

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return (
    <div
      ref={host}
      className={s.soldier3d}
      role="img"
      aria-label="3D-модель бойца Красной армии, 1943 год: каска, гимнастёрка, автомат ППШ. Проведите пальцем, чтобы повернуть"
      data-testid={testID}
      data-failed={failed || undefined}
    >
      {failed && (
        <p className={s.soldier3dFallback}>
          Этот браузер не показывает 3D-графику (WebGL выключен). Откройте раздел в Chrome или
          Safari.
        </p>
      )}
    </div>
  )
}
