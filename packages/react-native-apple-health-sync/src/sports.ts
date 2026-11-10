/**
 * EVERY workout sport HealthKit can report, one row per `HKWorkoutActivityType`.
 *
 * `id` is the Apple raw value of `HKWorkoutActivityType` (an integer Apple persists in the Health database, so it is
 * stable across iOS versions; the Apple Watch and other apps write the same numbers). `name` is the lowerCamel case
 * name and `key` the UPPER_SNAKE name used by the `HealthSport` constant. Map by whichever you prefer:
 *
 * ```ts
 * workout.sport === 'soccer'            // by name
 * workout.sportId === HealthSport.SOCCER // by id (41)
 * ```
 *
 * GENERATED from the iOS 26 SDK header (HKWorkout.h). Rows are only ever APPENDED when Apple adds a sport; a sport that
 * is newer than this table is reported as `sport: 'unknown'` with its real `sportId`, so nothing is ever folded into
 * a generic "workout".
 */
export const HEALTH_SPORTS = [
  { id: 1, name: 'americanFootball', key: 'AMERICAN_FOOTBALL', deprecated: false, minIos: undefined },
  { id: 2, name: 'archery', key: 'ARCHERY', deprecated: false, minIos: undefined },
  { id: 3, name: 'australianFootball', key: 'AUSTRALIAN_FOOTBALL', deprecated: false, minIos: undefined },
  { id: 4, name: 'badminton', key: 'BADMINTON', deprecated: false, minIos: undefined },
  { id: 5, name: 'baseball', key: 'BASEBALL', deprecated: false, minIos: undefined },
  { id: 6, name: 'basketball', key: 'BASKETBALL', deprecated: false, minIos: undefined },
  { id: 7, name: 'bowling', key: 'BOWLING', deprecated: false, minIos: undefined },
  { id: 8, name: 'boxing', key: 'BOXING', deprecated: false, minIos: undefined },
  { id: 9, name: 'climbing', key: 'CLIMBING', deprecated: false, minIos: undefined },
  { id: 10, name: 'cricket', key: 'CRICKET', deprecated: false, minIos: undefined },
  { id: 11, name: 'crossTraining', key: 'CROSS_TRAINING', deprecated: false, minIos: undefined },
  { id: 12, name: 'curling', key: 'CURLING', deprecated: false, minIos: undefined },
  { id: 13, name: 'cycling', key: 'CYCLING', deprecated: false, minIos: undefined },
  { id: 14, name: 'dance', key: 'DANCE', deprecated: true, minIos: '8.0' },
  { id: 15, name: 'danceInspiredTraining', key: 'DANCE_INSPIRED_TRAINING', deprecated: true, minIos: '8.0' },
  { id: 16, name: 'elliptical', key: 'ELLIPTICAL', deprecated: false, minIos: undefined },
  { id: 17, name: 'equestrianSports', key: 'EQUESTRIAN_SPORTS', deprecated: false, minIos: undefined },
  { id: 18, name: 'fencing', key: 'FENCING', deprecated: false, minIos: undefined },
  { id: 19, name: 'fishing', key: 'FISHING', deprecated: false, minIos: undefined },
  { id: 20, name: 'functionalStrengthTraining', key: 'FUNCTIONAL_STRENGTH_TRAINING', deprecated: false, minIos: undefined },
  { id: 21, name: 'golf', key: 'GOLF', deprecated: false, minIos: undefined },
  { id: 22, name: 'gymnastics', key: 'GYMNASTICS', deprecated: false, minIos: undefined },
  { id: 23, name: 'handball', key: 'HANDBALL', deprecated: false, minIos: undefined },
  { id: 24, name: 'hiking', key: 'HIKING', deprecated: false, minIos: undefined },
  { id: 25, name: 'hockey', key: 'HOCKEY', deprecated: false, minIos: undefined },
  { id: 26, name: 'hunting', key: 'HUNTING', deprecated: false, minIos: undefined },
  { id: 27, name: 'lacrosse', key: 'LACROSSE', deprecated: false, minIos: undefined },
  { id: 28, name: 'martialArts', key: 'MARTIAL_ARTS', deprecated: false, minIos: undefined },
  { id: 29, name: 'mindAndBody', key: 'MIND_AND_BODY', deprecated: false, minIos: undefined },
  { id: 30, name: 'mixedMetabolicCardioTraining', key: 'MIXED_METABOLIC_CARDIO_TRAINING', deprecated: true, minIos: '8.0' },
  { id: 31, name: 'paddleSports', key: 'PADDLE_SPORTS', deprecated: false, minIos: undefined },
  { id: 32, name: 'play', key: 'PLAY', deprecated: false, minIos: undefined },
  { id: 33, name: 'preparationAndRecovery', key: 'PREPARATION_AND_RECOVERY', deprecated: false, minIos: undefined },
  { id: 34, name: 'racquetball', key: 'RACQUETBALL', deprecated: false, minIos: undefined },
  { id: 35, name: 'rowing', key: 'ROWING', deprecated: false, minIos: undefined },
  { id: 36, name: 'rugby', key: 'RUGBY', deprecated: false, minIos: undefined },
  { id: 37, name: 'running', key: 'RUNNING', deprecated: false, minIos: undefined },
  { id: 38, name: 'sailing', key: 'SAILING', deprecated: false, minIos: undefined },
  { id: 39, name: 'skatingSports', key: 'SKATING_SPORTS', deprecated: false, minIos: undefined },
  { id: 40, name: 'snowSports', key: 'SNOW_SPORTS', deprecated: false, minIos: undefined },
  { id: 41, name: 'soccer', key: 'SOCCER', deprecated: false, minIos: undefined },
  { id: 42, name: 'softball', key: 'SOFTBALL', deprecated: false, minIos: undefined },
  { id: 43, name: 'squash', key: 'SQUASH', deprecated: false, minIos: undefined },
  { id: 44, name: 'stairClimbing', key: 'STAIR_CLIMBING', deprecated: false, minIos: undefined },
  { id: 45, name: 'surfingSports', key: 'SURFING_SPORTS', deprecated: false, minIos: undefined },
  { id: 46, name: 'swimming', key: 'SWIMMING', deprecated: false, minIos: undefined },
  { id: 47, name: 'tableTennis', key: 'TABLE_TENNIS', deprecated: false, minIos: undefined },
  { id: 48, name: 'tennis', key: 'TENNIS', deprecated: false, minIos: undefined },
  { id: 49, name: 'trackAndField', key: 'TRACK_AND_FIELD', deprecated: false, minIos: undefined },
  { id: 50, name: 'traditionalStrengthTraining', key: 'TRADITIONAL_STRENGTH_TRAINING', deprecated: false, minIos: undefined },
  { id: 51, name: 'volleyball', key: 'VOLLEYBALL', deprecated: false, minIos: undefined },
  { id: 52, name: 'walking', key: 'WALKING', deprecated: false, minIos: undefined },
  { id: 53, name: 'waterFitness', key: 'WATER_FITNESS', deprecated: false, minIos: undefined },
  { id: 54, name: 'waterPolo', key: 'WATER_POLO', deprecated: false, minIos: undefined },
  { id: 55, name: 'waterSports', key: 'WATER_SPORTS', deprecated: false, minIos: undefined },
  { id: 56, name: 'wrestling', key: 'WRESTLING', deprecated: false, minIos: undefined },
  { id: 57, name: 'yoga', key: 'YOGA', deprecated: false, minIos: undefined },
  { id: 58, name: 'barre', key: 'BARRE', deprecated: false, minIos: '10.0' },
  { id: 59, name: 'coreTraining', key: 'CORE_TRAINING', deprecated: false, minIos: '10.0' },
  { id: 60, name: 'crossCountrySkiing', key: 'CROSS_COUNTRY_SKIING', deprecated: false, minIos: '10.0' },
  { id: 61, name: 'downhillSkiing', key: 'DOWNHILL_SKIING', deprecated: false, minIos: '10.0' },
  { id: 62, name: 'flexibility', key: 'FLEXIBILITY', deprecated: false, minIos: '10.0' },
  { id: 63, name: 'highIntensityIntervalTraining', key: 'HIGH_INTENSITY_INTERVAL_TRAINING', deprecated: false, minIos: '10.0' },
  { id: 64, name: 'jumpRope', key: 'JUMP_ROPE', deprecated: false, minIos: '10.0' },
  { id: 65, name: 'kickboxing', key: 'KICKBOXING', deprecated: false, minIos: '10.0' },
  { id: 66, name: 'pilates', key: 'PILATES', deprecated: false, minIos: '10.0' },
  { id: 67, name: 'snowboarding', key: 'SNOWBOARDING', deprecated: false, minIos: '10.0' },
  { id: 68, name: 'stairs', key: 'STAIRS', deprecated: false, minIos: '10.0' },
  { id: 69, name: 'stepTraining', key: 'STEP_TRAINING', deprecated: false, minIos: '10.0' },
  { id: 70, name: 'wheelchairWalkPace', key: 'WHEELCHAIR_WALK_PACE', deprecated: false, minIos: '10.0' },
  { id: 71, name: 'wheelchairRunPace', key: 'WHEELCHAIR_RUN_PACE', deprecated: false, minIos: '10.0' },
  { id: 72, name: 'taiChi', key: 'TAI_CHI', deprecated: false, minIos: '11.0' },
  { id: 73, name: 'mixedCardio', key: 'MIXED_CARDIO', deprecated: false, minIos: '11.0' },
  { id: 74, name: 'handCycling', key: 'HAND_CYCLING', deprecated: false, minIos: '11.0' },
  { id: 75, name: 'discSports', key: 'DISC_SPORTS', deprecated: false, minIos: '13.0' },
  { id: 76, name: 'fitnessGaming', key: 'FITNESS_GAMING', deprecated: false, minIos: '13.0' },
  { id: 77, name: 'cardioDance', key: 'CARDIO_DANCE', deprecated: false, minIos: '14.0' },
  { id: 78, name: 'socialDance', key: 'SOCIAL_DANCE', deprecated: false, minIos: '14.0' },
  { id: 79, name: 'pickleball', key: 'PICKLEBALL', deprecated: false, minIos: '14.0' },
  { id: 80, name: 'cooldown', key: 'COOLDOWN', deprecated: false, minIos: '14.0' },
  { id: 82, name: 'swimBikeRun', key: 'SWIM_BIKE_RUN', deprecated: false, minIos: '16.0' },
  { id: 83, name: 'transition', key: 'TRANSITION', deprecated: false, minIos: '16.0' },
  { id: 84, name: 'underwaterDiving', key: 'UNDERWATER_DIVING', deprecated: false, minIos: '17.0' },
  { id: 3000, name: 'other', key: 'OTHER', deprecated: false, minIos: undefined },
] as const

export type HealthSportRow = (typeof HEALTH_SPORTS)[number]

/** Lower camel case name of a sport (`'soccer'`, `'americanFootball'`...). `'unknown'`: newer than this table. */
export type HealthSportName = HealthSportRow['name'] | 'unknown'

/** `HealthSport.SOCCER === 41`. The ids are the Apple raw values. */
export const HealthSport = {
  AMERICAN_FOOTBALL: 1,
  ARCHERY: 2,
  AUSTRALIAN_FOOTBALL: 3,
  BADMINTON: 4,
  BASEBALL: 5,
  BASKETBALL: 6,
  BOWLING: 7,
  BOXING: 8,
  CLIMBING: 9,
  CRICKET: 10,
  CROSS_TRAINING: 11,
  CURLING: 12,
  CYCLING: 13,
  DANCE: 14,
  DANCE_INSPIRED_TRAINING: 15,
  ELLIPTICAL: 16,
  EQUESTRIAN_SPORTS: 17,
  FENCING: 18,
  FISHING: 19,
  FUNCTIONAL_STRENGTH_TRAINING: 20,
  GOLF: 21,
  GYMNASTICS: 22,
  HANDBALL: 23,
  HIKING: 24,
  HOCKEY: 25,
  HUNTING: 26,
  LACROSSE: 27,
  MARTIAL_ARTS: 28,
  MIND_AND_BODY: 29,
  MIXED_METABOLIC_CARDIO_TRAINING: 30,
  PADDLE_SPORTS: 31,
  PLAY: 32,
  PREPARATION_AND_RECOVERY: 33,
  RACQUETBALL: 34,
  ROWING: 35,
  RUGBY: 36,
  RUNNING: 37,
  SAILING: 38,
  SKATING_SPORTS: 39,
  SNOW_SPORTS: 40,
  SOCCER: 41,
  SOFTBALL: 42,
  SQUASH: 43,
  STAIR_CLIMBING: 44,
  SURFING_SPORTS: 45,
  SWIMMING: 46,
  TABLE_TENNIS: 47,
  TENNIS: 48,
  TRACK_AND_FIELD: 49,
  TRADITIONAL_STRENGTH_TRAINING: 50,
  VOLLEYBALL: 51,
  WALKING: 52,
  WATER_FITNESS: 53,
  WATER_POLO: 54,
  WATER_SPORTS: 55,
  WRESTLING: 56,
  YOGA: 57,
  BARRE: 58,
  CORE_TRAINING: 59,
  CROSS_COUNTRY_SKIING: 60,
  DOWNHILL_SKIING: 61,
  FLEXIBILITY: 62,
  HIGH_INTENSITY_INTERVAL_TRAINING: 63,
  JUMP_ROPE: 64,
  KICKBOXING: 65,
  PILATES: 66,
  SNOWBOARDING: 67,
  STAIRS: 68,
  STEP_TRAINING: 69,
  WHEELCHAIR_WALK_PACE: 70,
  WHEELCHAIR_RUN_PACE: 71,
  TAI_CHI: 72,
  MIXED_CARDIO: 73,
  HAND_CYCLING: 74,
  DISC_SPORTS: 75,
  FITNESS_GAMING: 76,
  CARDIO_DANCE: 77,
  SOCIAL_DANCE: 78,
  PICKLEBALL: 79,
  COOLDOWN: 80,
  SWIM_BIKE_RUN: 82,
  TRANSITION: 83,
  UNDERWATER_DIVING: 84,
  OTHER: 3000,
} as const

export type HealthSportKey = keyof typeof HealthSport

/** One of the ids of `HealthSport`. A workout may carry another number when it is newer than this table. */
export type HealthSportId = (typeof HealthSport)[HealthSportKey]

const BY_ID: ReadonlyMap<number, HealthSportRow> = new Map(HEALTH_SPORTS.map((s) => [s.id, s]))
const BY_NAME: ReadonlyMap<string, HealthSportRow> = new Map(HEALTH_SPORTS.map((s) => [s.name, s]))

/** The name of a sport id, or `'unknown'`. */
export function healthSportName(id: number): HealthSportName {
  return BY_ID.get(id)?.name ?? 'unknown'
}

/** The id of a sport name (case-insensitive on the first letter, `'SOCCER'` and `'soccer'` both work), or undefined. */
export function healthSportId(nameOrKey: string): number | undefined {
  const byName = BY_NAME.get(nameOrKey)
  if (byName) return byName.id
  const key = nameOrKey.toUpperCase().replace(/[\s-]+/g, '_')
  return (HealthSport as Record<string, number>)[key]
}

/** Whether `id` is a sport this table knows. */
export function isKnownHealthSportId(id: number): id is HealthSportId {
  return BY_ID.has(id)
}
