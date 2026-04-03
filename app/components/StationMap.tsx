'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

interface StationMapProps {
  latitude: number
  longitude: number
  name: string
  markerColor?: string
}

export default function StationMap({
  latitude,
  longitude,
  name,
  markerColor = '#C60C30',
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const isDark = document.documentElement.classList.contains('dark')

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? STYLE_DARK : STYLE_LIGHT,
      center: [longitude, latitude],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    })

    new maplibregl.Marker({ color: markerColor })
      .setLngLat([longitude, latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(
          `<span style="font-size:13px;font-weight:600;">${name}</span>`,
        ),
      )
      .addTo(map)

    mapRef.current = map

    // Watch for dark mode class changes and swap the map style
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark')
      mapRef.current?.setStyle(dark ? STYLE_DARK : STYLE_LIGHT)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      observer.disconnect()
      map.remove()
    }
  }, [latitude, longitude, name, markerColor])

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
      <div ref={containerRef} style={{ height: 340 }} />
    </div>
  )
}
