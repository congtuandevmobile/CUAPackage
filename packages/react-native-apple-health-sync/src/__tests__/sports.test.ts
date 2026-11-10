import { readFileSync } from 'fs'
import { join } from 'path'
import { HEALTH_SPORTS, HealthSport, healthSportId, healthSportName, isKnownHealthSportId } from '../sports'

describe('sport catalog', () => {
  it('maps the sports the previous plugin folded into a generic workout', () => {
    expect(HealthSport.SOCCER).toBe(41)
    expect(HealthSport.BASKETBALL).toBe(6)
    expect(HealthSport.TENNIS).toBe(48)
    expect(HealthSport.OTHER).toBe(3000)
    expect(healthSportName(41)).toBe('soccer')
    expect(healthSportName(HealthSport.AMERICAN_FOOTBALL)).toBe('americanFootball')
    expect(healthSportName(HealthSport.HIGH_INTENSITY_INTERVAL_TRAINING)).toBe('highIntensityIntervalTraining')
  })

  it('resolves an id from a name or from an UPPER_SNAKE key', () => {
    expect(healthSportId('soccer')).toBe(41)
    expect(healthSportId('SOCCER')).toBe(41)
    expect(healthSportId('american football')).toBe(1)
    expect(healthSportId('americanFootball')).toBe(1)
    expect(healthSportId('nope')).toBeUndefined()
  })

  it('reports a sport newer than the table as unknown, never as another sport', () => {
    expect(healthSportName(9999)).toBe('unknown')
    expect(isKnownHealthSportId(9999)).toBe(false)
    expect(isKnownHealthSportId(41)).toBe(true)
  })

  it('has unique ids, names and keys, and HealthSport is the same table', () => {
    for (const field of ['id', 'name', 'key'] as const) {
      expect(new Set(HEALTH_SPORTS.map((s) => s[field])).size).toBe(HEALTH_SPORTS.length)
    }
    expect(Object.keys(HealthSport)).toHaveLength(HEALTH_SPORTS.length)
    for (const s of HEALTH_SPORTS) expect((HealthSport as Record<string, number>)[s.key]).toBe(s.id)
  })

  it('is in step with the Swift catalog (same ids, same names)', () => {
    const swift = readFileSync(join(__dirname, '../../ios/SportCatalog.swift'), 'utf8')
    const rows = [...swift.matchAll(/^\s+(\d+): "(\w+)",$/gm)].map((m) => [Number(m[1]), m[2]])
    expect(rows).toEqual(HEALTH_SPORTS.map((s) => [s.id, s.name]))
  })
})
