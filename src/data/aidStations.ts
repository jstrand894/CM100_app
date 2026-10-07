// Aid stations sourced from the race's "Aid Stations/Directions" page.
// Mile markers and coordinates are intentionally null until confirmed with the race
// director; they must never be guessed.
export type CrewAccess = 'yes' | 'hike-in' | 'no' | 'unknown';

export interface AidStation {
  id: string;
  name: string;
  crewAccess: CrewAccess;
  mile: number | null;
  coordinate: { latitude: number; longitude: number } | null;
  summary: string;
  details: string[];
}

export const AID_STATIONS: AidStation[] = [
  {
    id: 'start',
    name: 'Start: Westling Ranch',
    crewAccess: 'no',
    mile: 0,
    coordinate: null,
    summary: 'Wilsall, MT. Runners take the mandatory shuttle to the start.',
    details: [
      'Take the shuttle to the start. Your crew may drive you, but pick up another runner and carpool.',
      'You may not leave a car at the start line.',
    ],
  },
  {
    id: 'ibex',
    name: 'Ibex',
    crewAccess: 'yes',
    mile: null,
    coordinate: null,
    summary: 'About 35 min (17.1 mi) from Wilsall.',
    details: [
      'Park at the first lot or before the gate. Do not park at the cabin.',
      'Crew may help up to the trail turnoff from the main road, because of congestion.',
      'Route from Wilsall: HWY 89 south, Horse Creek Rd, Upper Cottonwood Creek Rd, Ibex Rd.',
    ],
  },
  {
    id: 'cow-camp',
    name: 'Cow Camp',
    crewAccess: 'unknown',
    mile: null,
    coordinate: null,
    summary: 'Backcountry aid supplied by horse and mule. Runners pass through twice (about miles 33 and 55).',
    details: ['Crew access has not been confirmed. Check the race Aid Station Chart.'],
  },
  {
    id: 'sunlight',
    name: 'Sunlight',
    crewAccess: 'hike-in',
    mile: null,
    coordinate: null,
    summary: 'No vehicle access. Hike in only, about 0.7 mi.',
    details: [
      'Park on Sunlight Creek Rd 6630 where the A-frame sign says to, then hike the forest road along the race route.',
      'You may not drive past the parking area. The road is narrow and there is no parking at the aid station.',
      'You may not be able to crew Crandall Creek if you crew here. Best suited to swapping pacers.',
    ],
  },
  {
    id: 'half-moon',
    name: 'Half Moon',
    crewAccess: 'yes',
    mile: null,
    coordinate: null,
    summary: 'First station where pacers are allowed.',
    details: [
      'From Wilsall: about 57 min (59.3 mi) via US-89 S, I-90 E, US-191 N, then Wormser Rd and Big Timber Canyon Rd.',
      'From the finish line it is faster to head toward Harlowton.',
      'Pacers start here and must check in and out.',
    ],
  },
  {
    id: 'crandall-creek',
    name: 'Crandall Creek',
    crewAccess: 'yes',
    mile: null,
    coordinate: null,
    summary: 'Via Shields River Rd and Bennett Creek Rd.',
    details: [
      'Allow about 2.5 hours from Half Moon.',
      'You will not be able to crew both Crandall Creek and Forest Lake unless your runner is near the back of the pack. Choose one.',
    ],
  },
  {
    id: 'forest-lake',
    name: 'Forest Lake',
    crewAccess: 'yes',
    mile: null,
    coordinate: null,
    summary: 'Use the 1 hr 24 min, 65.7 mi route from Wilsall.',
    details: [
      'Do NOT take the shorter route a map app may show. It is not a road.',
      'US-89 N, MT-294 E, Cottonwood Creek Rd, then Forest Lake Rd.',
      'Pacers starting at or before Forest Lake must continue to the finish.',
    ],
  },
  {
    id: 'huntin-camp',
    name: 'Huntin Camp',
    crewAccess: 'no',
    mile: null,
    coordinate: null,
    summary: 'No crew access starting in 2026 (private ranch land).',
    details: [
      'There is no access to the private land south of Berg Rd.',
      'Family and kids can start pacing at the driveway or junction at Berg Rd.',
    ],
  },
  {
    id: 'finish',
    name: 'Finish: Berg Ranch',
    crewAccess: 'yes',
    mile: null,
    coordinate: null,
    summary: 'Lennep, MT. Free tent and van camping in a hayfield.',
    details: [
      'No campers over 20 ft. Dogs must be leashed at all times.',
      'Crews get an access pass to hang on their vehicle for finish line access.',
    ],
  },
];

export const CREW_LABEL: Record<CrewAccess, string> = {
  yes: 'Crew access',
  'hike-in': 'Hike-in only',
  no: 'No crew access',
  unknown: 'Crew access TBD',
};
