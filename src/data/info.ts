// Content from the race's "Guide to Crazy" (2025 edition) and website. Times and numbers can change
// each year, so every page is labeled for verification.
export interface InfoRow {
  title: string;
  body?: string;
  href?: string; // tel: or https: link
}
export interface InfoSection {
  title: string;
  rows: InfoRow[];
}
export interface InfoPage {
  title: string;
  intro?: string;
  sections: InfoSection[];
}

export const INFO_PAGES: Record<string, InfoPage> = {
  schedule: {
    title: 'Race weekend',
    intro: 'Times are from the 2025 race guide. Confirm the current schedule on the race website.',
    sections: [
      {
        title: 'Thursday · Berg Ranch (finish)',
        rows: [
          { title: '3:00–7:00 PM', body: 'Packet pickup and drop bags. There are no race-day drop bags.' },
          { title: '6:00–6:30 PM', body: 'Race briefing' },
          { title: '41 Berg Rd, Martinsdale, MT 59053', body: 'Finish line address', href: 'https://maps.apple.com/?q=41+Berg+Rd,+Martinsdale,+MT+59053' },
        ],
      },
      {
        title: 'Friday · Westling Ranch (start)',
        rows: [
          { title: '12:00 PM (Thu)', body: 'Reserved camping at the start line opens.' },
          { title: '4:10 AM SHARP', body: 'Shuttle leaves the finish line for the start.' },
          { title: '5:00–5:50 AM', body: 'Runner check-in' },
          { title: '5:45 AM', body: 'Race briefing' },
          { title: '6:00 AM', body: 'Race start' },
          {
            title: 'Start location',
            body: 'Waltons Rd, Wilsall, MT. There is no street address, because it is in a field. Waltons Rd is off Porcupine Rd.',
          },
        ],
      },
      {
        title: 'Saturday · Berg Ranch (finish)',
        rows: [
          { title: 'All day', body: 'Finish line open.' },
          { title: '5:00–6:00 PM', body: "Golden Hour: come cheer in the last runners." },
          { title: '6:00 PM', body: 'Finish line closes (36-hour cutoff).' },
          { title: '~4:00 PM / 6:15 PM', body: 'Post-race food around 4:00, awards ceremony at 6:15.' },
        ],
      },
      {
        title: 'Sunday',
        rows: [{ title: 'Be on your way by 10 AM', body: 'Unless you can stay to help clean up. Volunteers are appreciated.' }],
      },
    ],
  },
  gear: {
    title: 'Gear and drop bags',
    sections: [
      {
        title: 'Mandatory gear',
        rows: [
          { title: 'Collapsible cup', body: 'The race is cupless.' },
          { title: 'Hydration pack' },
          { title: 'Headlamp or waist light' },
          { title: 'Waterproof rain jacket' },
          { title: 'Emergency blanket' },
          {
            title: 'Provided GPS tracking device',
            body: 'Do not use your own for race tracking. The provided trackers have no SOS function, so consider satellite texting from your iPhone.',
          },
          { title: 'Personal first aid items', body: 'EpiPen, medications, etc. Do not put an EpiPen in a drop bag. There are bees, and the race does not carry EpiPens.' },
        ],
      },
      {
        title: 'Highly recommended',
        rows: [
          { title: 'Phone with course map downloaded', body: 'Every year someone goes off trail.' },
          { title: 'Bear spray', body: 'Bear country, plus cougars, moose and more.' },
          { title: 'Water filter', body: 'There is lots of water on most of the course.' },
          { title: 'Gloves, hat, extra layers, pants' },
          { title: 'Extra socks in drop bags' },
          { title: 'More calories than you expect to need' },
        ],
      },
      {
        title: 'Drop bags',
        rows: [
          { title: 'Keep it small', body: 'About a 20 L dry bag or less. No large totes.' },
          { title: 'Volunteers carry bags to and from aid stations' },
        ],
      },
    ],
  },
  crew: {
    title: 'Crew and pacers',
    intro: 'Runners are accountable for their crew and pacers. Any misconduct directly affects the runner.',
    sections: [
      {
        title: 'Crew rules',
        rows: [
          { title: 'Crew only at crew-accessible aid stations' },
          { title: 'One crew member at a time in an aid station', body: 'They must come in with their runner.' },
          { title: 'Aid within 200 yards of the aid station', body: 'At Ibex, crew may help up to the trail turnoff from the main road.' },
          { title: 'One vehicle per runner per aid station', body: 'Never block roads. No campers or trailers at aid stations.' },
          { title: 'Speeding disqualifies your runner', body: 'Be mindful of the very small towns along the course.' },
          { title: 'Give aid stations space', body: 'They are tight. Grab food in Wilsall, Big Timber or Clyde Park instead of loitering.' },
        ],
      },
      {
        title: 'Pacer rules',
        rows: [
          { title: 'Pacers allowed starting at Half Moon' },
          { title: 'One pacer at a time' },
          { title: 'Signed waiver and official pacer bib required', body: 'Pick up bibs at check-in if possible. Aid station bibs are limited.' },
          { title: 'Check in and out at every aid station', body: 'If you do not check out, you are assumed lost.' },
          { title: 'No muling', body: 'Pacers and crew may not carry or hand anything to the runner outside the aid station. Muling means a DQ.' },
        ],
      },
      {
        title: 'Dogs',
        rows: [
          { title: 'On leash at all times at the start, finish and aid stations' },
          { title: 'Huntin Camp: no dogs at all', body: 'Private land. Any dog, even on leash, disqualifies the runner.' },
        ],
      },
    ],
  },
  emergency: {
    title: 'Emergency contacts',
    intro: 'Numbers from the 2025 race guide. Verify before the race. Much of the course has no cell service.',
    sections: [
      {
        title: 'Emergency',
        rows: [{ title: '911', body: 'Cell coverage is limited on the course.', href: 'tel:911' }],
      },
      {
        title: 'Nearby medical',
        rows: [
          { title: 'Livingston Health Care', body: '24 hours · 406-222-3541', href: 'tel:4062223541' },
          { title: 'Livingston Urgent Care', body: '8:00 AM–7:00 PM · 406-222-0030', href: 'tel:4062220030' },
          { title: 'Pioneer Medical Center (Big Timber)', body: '24 hours · 406-932-4603', href: 'tel:4069324603' },
          { title: 'Mountainview Medical Center (White Sulphur Springs)', body: '24 hours · 406-547-3321', href: 'tel:4065473321' },
        ],
      },
      {
        title: 'Race',
        rows: [
          { title: 'Email the race director', body: 'megandehaan@crazymountainultra.com', href: 'mailto:megandehaan@crazymountainultra.com' },
          { title: 'In an emergency at the course', body: 'Any aid station can contact the ham radio base or the race director.' },
        ],
      },
    ],
  },
  local: {
    title: 'Food and lodging',
    intro: 'From the 2025 race guide. Hours change, so check before you go.',
    sections: [
      {
        title: 'Lodging',
        rows: [
          { title: 'Finish line camping (included)', body: 'Berg Ranch, Lennep. Tents and campers under 20 ft.' },
          { title: 'Airbnb and VRBO', body: 'Around Wilsall and Clyde Park.' },
          { title: 'White Sulphur Springs or Livingston', body: 'The closest larger towns with hotels and services.' },
        ],
      },
      {
        title: 'Food and supplies',
        rows: [
          { title: '3 Doors Down Coffee Bakery · Clyde Park', body: '508 Miles St. Breakfast burritos, baked goods, coffee.' },
          { title: "Glenn's Shopping Center · Clyde Park", body: '504 Miles St. Small-town grocery.' },
          { title: 'Earth Wise General Store · Big Timber', body: '107 W Second Ave. Deli and natural foods, many gluten-free options. On the way to Half Moon.' },
          { title: 'Crazy Mountain Coffee · Big Timber', body: '403 Boulder St. Roasted locally, served at the start and finish.' },
          { title: 'The Bank · Wilsall', body: '102 N Elliot St. Cowboy bar with The Vault restaurant.' },
          { title: 'Hamm Supply · Wilsall', body: '102 E Clark St. Ice, drinks and supplies.' },
          { title: 'Ringling Bar · Ringling', body: '4 Main St. Western bar with steak dinner, odd hours.' },
          { title: 'The Jawbone · White Sulphur Springs', body: '11 E Main St. Speakeasy-style restaurant and cocktail bar.' },
        ],
      },
    ],
  },
};

export const MENU: { slug: string; icon: string; label: string; sub: string }[] = [
  { slug: 'schedule', icon: 'calendar', label: 'Race weekend', sub: 'Schedule, shuttle, check-in' },
  { slug: 'gear', icon: 'bag-handle', label: 'Gear and drop bags', sub: 'Mandatory and recommended' },
  { slug: 'crew', icon: 'people', label: 'Crew and pacers', sub: 'Rules for support teams' },
  { slug: 'emergency', icon: 'medkit', label: 'Emergency contacts', sub: 'Hospitals and urgent care' },
  { slug: 'local', icon: 'restaurant', label: 'Food and lodging', sub: 'Wilsall, Big Timber, Clyde Park' },
];
