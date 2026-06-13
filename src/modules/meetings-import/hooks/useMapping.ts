import { useEffect, useMemo, useRef, useState } from 'react'
import { MappingEntry } from '../types'

interface UseMappingOptions<TSource, TTarget> {
  sourceItems: TSource[]
  targetItems: TTarget[]
  matchFn: (source: TSource, target: TTarget) => number
  sourceLabelFn: (source: TSource) => string
  targetLabelFn: (target: TTarget) => string
  targetKeyFn: (target: TTarget) => string
  initialMappings?: MappingEntry<TTarget>[]
  onMappingsChange?: (mappings: MappingEntry<TTarget>[]) => void
  threshold?: number
}

export function useMapping<TSource, TTarget>({
  sourceItems,
  targetItems,
  matchFn,
  sourceLabelFn,
  targetKeyFn,
  initialMappings: seededMappings = [],
  onMappingsChange,
  threshold = 0.8,
}: UseMappingOptions<TSource, TTarget>) {
  const signature = useMemo(
    () =>
      JSON.stringify({
        sources: sourceItems.map(sourceLabelFn),
        targets: targetItems.map(targetKeyFn),
      }),
    [sourceItems, sourceLabelFn, targetItems, targetKeyFn],
  )

  const computedMappings = useMemo<MappingEntry<TTarget>[]>(() => {
    return sourceItems.map((source) => {
      const sourceLabel = sourceLabelFn(source)
      const existing = seededMappings.find((entry) => entry.sourceLabel === sourceLabel)
      const existingTarget = existing?.target
      if (
        existingTarget &&
        targetItems.some((target) => targetKeyFn(target) === targetKeyFn(existingTarget))
      ) {
        return existing
      }

      const bestMatch = targetItems.reduce<{ target: TTarget | null; score: number }>(
        (best, target) => {
          const score = matchFn(source, target)
          return score > best.score ? { target, score } : best
        },
        { target: null, score: 0 },
      )

      return {
        sourceLabel,
        target: bestMatch.score >= threshold ? bestMatch.target : null,
        status: bestMatch.score >= threshold ? 'auto' : 'unresolved',
      }
    })
  }, [matchFn, seededMappings, sourceItems, sourceLabelFn, targetItems, targetKeyFn, threshold])

  const [mappings, setMappings] = useState(computedMappings)
  const previousSignatureRef = useRef(signature)
  const onMappingsChangeRef = useRef(onMappingsChange)

  useEffect(() => {
    onMappingsChangeRef.current = onMappingsChange
  }, [onMappingsChange])

  useEffect(() => {
    if (previousSignatureRef.current !== signature) {
      previousSignatureRef.current = signature
      setMappings(computedMappings)
    }
  }, [computedMappings, signature])

  useEffect(() => {
    onMappingsChangeRef.current?.(mappings)
  }, [mappings])

  function setManualMapping(sourceLabel: string, target: TTarget) {
    setMappings((current) =>
      current.map((entry) =>
        entry.sourceLabel === sourceLabel ? { ...entry, target, status: 'manual' } : entry,
      ),
    )
  }

  return {
    mappings,
    setManualMapping,
    isComplete: mappings.every((entry) => entry.status !== 'unresolved' && entry.target !== null),
    targetKeyFn,
  }
}
