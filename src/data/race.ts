// Race facts sourced from https://www.crazymountainultra.com (verify before each race year).
export const RACE = {
  name: 'Crazy Mountain 100',
  tagline: 'Wilsall to Lennep, Montana',
  dateLabel: 'July 30–31, 2027',
  startTimeLabel: 'Friday, 6:00 AM',
  // 6:00 AM Mountain Daylight Time (UTC-6)
  startIso: '2027-07-30T12:00:00Z',
  start: 'Westling Ranch, Wilsall, MT',
  finish: 'Berg Ranch, Lennep, MT',
  distance: '100 miles (point to point)',
  gain: '~23,000 ft of gain, topping out near 10,000 ft',
  cutoff: '36 hours (Saturday 6:00 PM)',
  website: 'https://www.crazymountainultra.com',
  contactEmail: 'megandehaan@crazymountainultra.com',
  // Update each year when the race publishes its Trackleaders page.
  trackingUrl: 'https://trackleaders.com/crazymtn100-26',
};

export const HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: 'The course',
    body:
      'Primarily single track with some forest road and two track. Some sections have no distinguishable trail, so you follow cairns and ridgelines. Some stretches between aid stations are over 13 miles.',
  },
  {
    title: 'Weather',
    body:
      'It can be 90°F and turn to sideways hail and then snow within an hour. Be prepared for anything.',
  },
  {
    title: 'Cutoff',
    body:
      'The 36-hour cutoff is strictly enforced. That is about 21.6 minute miles including aid station time.',
  },
  {
    title: 'Navigation',
    body:
      'Download the course map before race day. Every year someone goes off trail. Much of the course has no cell service.',
  },
];

export const MANDATORY_GEAR = [
  'Collapsible cup (the race is cupless)',
  'Hydration pack',
  'Headlamp or waist light',
  'Waterproof rain jacket',
  'Emergency blanket',
  'Provided GPS tracking device (do not use your own for race tracking)',
  'Personal first aid items (EpiPen, medications, etc.)',
];

export const RECOMMENDED_GEAR = [
  'Phone with the course map downloaded',
  'Bear spray (this is bear country)',
  'Water filter',
  'Gloves, hat, extra layers, pants',
  'Extra socks in drop bags',
  'More calories than you expect to need',
];

export const CREW_RULES = [
  'Crew may only help runners at crew-accessible aid stations.',
  'One crew member at a time in an aid station, and they must come in with their runner.',
  'Give aid within 200 yards of the aid station (at Ibex, up to the trail turnoff from the main road).',
  'One vehicle per runner per aid station area. Never block roads. No campers or trailers at aid stations.',
  'Speeding violations disqualify the runner. The course passes through very small towns.',
  'Pacers are allowed starting at Half Moon. One pacer at a time, no muling, official pacer bib and signed waiver required.',
];
