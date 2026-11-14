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
      'A voice AI assistant on the Claude API, with Whisper speech-to-text, a wake word and a formal, warm persona.',
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
    title: 'Prometheus',
    tag: 'AI · Voice',
    image: 'Prometheus demo',
    poster: '/projects/prometheus.jpg',
    description:
      'The assistant before NOXIS: a HAL 9000-inspired voice AI for macOS, on the Claude API and Whisper, with a red HUD for news, music and live markets.',
  },
]

export const stack = [
  'Swift', 'SwiftUI', 'React', 'Three.js', 'Tailwind', 'Java', 'C', 'Python', 'Claude API', 'Figma', 'Electronics',
]
