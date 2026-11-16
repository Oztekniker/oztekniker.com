// Project cards for the .Work() section.
// Media: put files in public/projects/ and set `video` (+ `poster`) or just `poster` for an image.
// Until then `image` is shown as a placeholder label.

export const projects = [
  {
    title: 'NOXIS',
    tag: 'AI · Voice',
    image: 'NOXIS demo clip',
    video: '/projects/noxis-demo.mp4',
    poster: '/projects/noxis-poster.jpg',
    description:
      'The first version of Rose: a voice AI assistant on the Claude API, with Whisper speech-to-text, a wake word, a formal butler persona and a gold-on-black interface.',
  },
  {
    title: 'DietTracker',
    tag: 'iOS · SwiftUI',
    image: 'App screenshots',
    poster: '/projects/diettracker.jpg',
    description:
      'A calorie and macro tracker built from scratch, with barcode scanning, a Turkish food database and a number-first UI.',
  },
  {
    title: 'Portfolio v1',
    tag: 'Web · Three.js · 2022',
    image: 'v1 screenshot',
    video: '/projects/v1-demo.mp4',
    poster: '/projects/v1-poster.jpg',
    description:
      'My first portfolio, hand-written in React, Tailwind and Three.js, with a 3D Medusa centrepiece and a working contact form.',
  },
  {
    title: 'Rose',
    tag: 'AI · Voice · 2026',
    image: 'Rose',
    poster: '/projects/rose.jpg',
    description:
      'My AI assistant for macOS, rebuilt from NOXIS. Say "Rose" and she listens, thinks with the Claude API and talks back in her own voice, handling the calendar, reminders, music, files, web searches and more.',
  },
]

export const stack = [
  'Swift', 'SwiftUI', 'React', 'Three.js', 'Tailwind', 'Java', 'C', 'Python', 'Claude API', 'Figma', 'Electronics',
]
