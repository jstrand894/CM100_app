// Lottery details from https://www.crazymountainultra.com (Lottery, Race Info and home pages) and the
// 2027 UltraSignup listing. The race describes parts of the system as "current thinking", so
// confirm on the website before applying.
export const LOTTERY = {
  year: 2027,
  // Tue Dec 1, 2026 @ 6:00 AM Mountain Standard Time (UTC-7)
  opensIso: '2026-12-01T13:00:00Z',
  opensLabel: 'Tue, Dec 1, 2026 · 6:00 AM MT',
  // Website says it closes Dec 12; no closing time is published, so treat it as the end of that day (MST).
  closesIso: '2026-12-13T07:00:00Z',
  closesLabel: 'Sat, Dec 12, 2026',
  drawLabel: 'Date not announced yet',
  raffleStartLabel: 'Jan 1, 2027',
  signupUrl: 'https://ultrasignup.com/register.aspx?did=143689',
  pageUrl: 'https://www.crazymountainultra.com/lottery',
  raffleUrl: 'https://www.reachinc.org/post/crazy-mountain-100-2027-lottery',
  forms: 'forms@crazymountainultra.com',
  fee: '$435 ($466.77 with UltraSignup fees)',
  cap: '200 runners',
};

export interface Step { title: string; body: string }

export const STEPS: Step[] = [
  {
    title: 'Check that you qualify',
    body:
      'You need a qualifying race or verified FKT, and it cannot be your first ultra. See the qualifier requirements below. You enter your qualifier when you apply, and no exceptions are made.',
  },
  {
    title: 'Apply on UltraSignup',
    body:
      'Lottery applications open Tuesday, December 1, 2026 at 6:00 AM Mountain and close December 12. Registration runs through UltraSignup, so make an account ahead of time.',
  },
  {
    title: 'Wait for the drawing',
    body:
      'The race has not announced when the drawing happens. A waitlist is set up after the lottery and also follows a lottery order.',
  },
  {
    title: 'Finish your trail work hours',
    body:
      'If you are selected, you need 8 hours of volunteer or trail work, and the signed form is due by June 30 of the race year. Runners who miss it are removed.',
  },
];

export const TIMELINE: { when: string; what: string; iso?: string }[] = [
  { when: 'Dec 1, 2026 · 6:00 AM MT', what: 'Lottery applications open', iso: '2026-12-01T13:00:00Z' },
  { when: 'Dec 12, 2026', what: 'Lottery applications close', iso: '2026-12-13T07:00:00Z' },
  { when: 'To be announced', what: 'Lottery drawing and results' },
  { when: 'Jan 1, 2027', what: 'Charity bib raffle begins', iso: '2027-01-01T07:00:00Z' },
  { when: 'June 30, 2027', what: 'Trail work and volunteer forms due', iso: '2027-07-01T06:00:00Z' },
  { when: 'July 30–31, 2027', what: 'Race weekend', iso: '2027-07-30T12:00:00Z' },
];

export const QUALIFIER: { title: string; body: string }[] = [
  {
    title: 'Accepted qualifiers',
    body:
      'A 100K trail race with at least 10,000 ft of gain, or a 100-mile mountain trail race with at least 15,000 ft of gain, completed in the 2 years before the race year. The Copper Kings 100 is also accepted. It cannot be your first ultra.',
  },
  {
    title: 'Time standards',
    body:
      '100K: under 20 hours. 100 miles with less than 23k ft of gain: under 36 hours. 100 miles with more than 23k ft of gain: the race\'s established cutoffs. Copper Kings 100: under 34 hours.',
  },
  {
    title: 'For 2027 specifically',
    body: 'You must have a race or FKT in 2025 or 2026. The race asks people not to email for exceptions.',
  },
  {
    title: 'Trail work or volunteering',
    body:
      'At least 8 hours of volunteer or trail work for another trail race, this race, or a trail work project, within a one-year window of the race year. Get a signature from the governing body, then send the form to the address below by June 30.',
  },
];

export const EXTRA_TICKETS: string[] = [
  'Repeat volunteers: extra tickets (2-year minimum, then 1 ticket per year volunteered).',
  'Veterans of the race: 1 ticket per finish.',
  '2 entries reserved for Native Crow runners.',
  'A "never" category for people who have not run it. The race has not spelled out the details yet.',
  'Extra tickets are sold following each year\'s lottery.',
];
