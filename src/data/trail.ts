// Leg-by-leg course description from the race's course guide (updated Nov 11, 2025; includes 2026 reservoir change).
// Keyed by the station the leg runs INTO, so it shows under "From <previous station>" on that station's page.
// `warning` is the navigation-critical bit (essential turns, walk-only descents, wrong-trail traps).
export interface TrailLeg {
  text: string;
  warning?: string;
}

export const TRAIL: Record<string, TrailLeg> = {
  porcupine: {
    text: 'Start in a field near Wilsall, then follow gravel and forest roads to the Porcupine-Ibex Trail. This is the most runnable terrain on the course.',
  },
  ibex: {
    text: 'Singletrack with water crossings, old logging roads and shale. Finish with a forest road down to the Ibex Cabin.',
  },
  'cow-camp-1': {
    text: 'Climb Trespass Creek on trail 268 to a pass above Campfire Lake, about 2,700 ft of gain in 5 miles. Then descend loose scree past Campfire Lake and Moose Lake. Cross the Middle Fork of Sweet Grass Creek, which will get your feet wet, to reach Cow Camp, a remote aid station.',
    warning: 'Essential right turn onto trail 123 after the pass.',
  },
  'half-moon': {
    text: 'Climb trail 122 up the South Fork past Glacier Lake toward Conical Peak, then descend trail 119 past Twin Lakes to the Half Moon trailhead aid station.',
  },
  'conical-pass': {
    text: 'The reverse of the outbound leg: back up trail 119 past Twin Lakes toward Conical Peak, the highest point of the course.',
  },
  'cow-camp-2': {
    text: 'Descend trail 122 past Glacier Lake and the South Fork back to Cow Camp, the reverse of the way out.',
  },
  sunlight: {
    text: 'Take trail 122, then climb the North Fork on trail 273. Descend off the saddle on trail 260 to Sunlight.',
    warning:
      'Essential left turn onto trail 273. Above treeline navigation is difficult, especially in the dark, so download the GPX and map ahead of time. The steep, exposed descent off the saddle on trail 260 must be walked, not run.',
  },
  crandall: {
    text: 'Return along the trail, cross Deep Creek, follow the Shields River Loop road, then take a private-land cow trail shortcut to Crandall.',
  },
  'forest-lake': {
    text: 'Cross a creek, go through a horse pasture and climb a cow trail to about 7,500 ft. Descend through trees, cross Eagle Creek many times, then follow a gravel road to Forest Lake.',
  },
  'honey-trail': {
    text: 'Loop around the lake, then climb trails 635 and 642 through a downfall area. Follow an exposed ridgeline for roughly 1.5 miles, then a tall-grass meadow to Honey Trail.',
    warning: 'Flagging is hard to see in the tall-grass meadow.',
  },
  'huntin-camp': {
    text: 'Exposed, windy two-track over rolling terrain. Filter water from the flowing pipe, not the stock tank. Descend to a creek crossing, where you will get wet, before Hunting Camp.',
    warning: 'Take a right at the fork on trail 396 and avoid trail 9244.',
  },
  finish: {
    text: 'About 7 miles on gravel and dirt roads with cattle guards. New for 2026, the route passes the reservoir. Continue to the highway, then the Berg Ranch driveway. You can choose whether to take the hug at the finish.',
  },
};
